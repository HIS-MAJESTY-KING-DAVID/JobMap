import { useEffect, useRef, useState } from 'react';
import { getLearnedApplicationAnswers, rememberApplicationAnswer } from '../services/applicationAnswers.js';
import { buildAutofillSuggestions, createAutofillBundle } from '../services/fieldAutofill.js';
import { getApplicationReadiness } from '../services/recommendations.js';
import { capabilityLabels, getCapabilityDetail } from '../services/capabilityRegistry.js';
import { detectAdapter, fetchGreenhouseQuestions, questionTypeLabels, submitGreenhouseApplication } from '../services/atsAdapters.js';

const eligibilityLabels = {
  'cameroon-eligible': 'Cameroon eligible',
  'africa-eligible': 'Africa eligible',
  worldwide: 'Worldwide remote',
  restricted: 'Location restricted',
  unclear: 'Eligibility unclear',
};

const learnedFields = [
  { key: 'workAuthorization', label: 'Work authorization', placeholder: 'Example: Authorized to work in Cameroon; requires sponsorship elsewhere.' },
  { key: 'sponsorship', label: 'Sponsorship', placeholder: 'Example: I may require sponsorship for this country.' },
  { key: 'salary', label: 'Salary preference', placeholder: 'Example: USD 2,000 monthly, negotiable.' },
];

const questionInputTypes = new Set(['input_text', 'multi_line_text', 'textarea', 'date', 'currency']);

function DraftBlock({ label, children }) {
  return (
    <div className="apply-flow__draft-block">
      <span>{label}</span>
      <p>{children}</p>
    </div>
  );
}

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem('jobmap-profile') || '{}');
  } catch {
    return {};
  }
}

/** Append the approved cover note to a bundle's fields so the bridge can fill it. */
function withCoverNote(bundle, pack) {
  const note = String(pack.coverNote || '').trim();
  if (!note || bundle.fields.some((field) => field.fieldId === 'coverNote')) return bundle;
  return { ...bundle, fields: [...bundle.fields, { fieldId: 'coverNote', value: note, classification: 'generated_draft', source: 'pack' }] };
}

export default function ApplyFlowPanel({ job, profile: providedProfile, cvDocuments = [], session, onClose, onSaveApplication }) {
  const [step, setStep] = useState('prepare');
  const sheetRef = useRef(null);

  useEffect(() => {
    if (sheetRef.current) {
      sheetRef.current.scrollTop = 0;
    }
  }, [step]);
  const [saved, setSaved] = useState(false);
  const profile = { ...readProfile(), ...(providedProfile || {}) };
  const [learnedAnswers, setLearnedAnswers] = useState(getLearnedApplicationAnswers);
  const [rememberAnswers, setRememberAnswers] = useState({});
  const [reuseUnassisted, setReuseUnassisted] = useState({});
  const [autofillMessage, setAutofillMessage] = useState('');
  const [extensionMessage, setExtensionMessage] = useState('');
  const [adapterMessage, setAdapterMessage] = useState('');
  const [employerQuestions, setEmployerQuestions] = useState([]);
  const [questionStatus, setQuestionStatus] = useState('idle');
  const [questionAnswers, setQuestionAnswers] = useState({});
  const sentBundleIdRef = useRef(null);
  const handledBundleIdRef = useRef(null);

  // Adapter + capability detail for the current job (before the pack is built).
  const adapterKey = job ? detectAdapter(job.applyUrl) : null;
  const capabilityDetail = getCapabilityDetail(job || {});

  useEffect(() => {
    if (adapterKey !== 'greenhouse' || !job?.applyUrl) {
      setEmployerQuestions([]);
      setQuestionStatus('idle');
      return;
    }
    let active = true;
    setQuestionStatus('loading');
    fetchGreenhouseQuestions(job.applyUrl).then((questions) => {
      if (!active) return;
      setEmployerQuestions(questions);
      setQuestionStatus(questions.length ? 'loaded' : 'unavailable');
    });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, adapterKey]);

  useEffect(() => {
    const handleExtensionResult = (event) => {
      if (event.source !== window || event.origin !== window.location.origin || event.data?.type !== 'JOBMAP_AUTOFILL_RESULT') return;
      const result = event.data.payload || {};
      if (sentBundleIdRef.current && result.bundleId && result.bundleId !== sentBundleIdRef.current) return;
      handledBundleIdRef.current = result.bundleId || handledBundleIdRef.current;
      const filledCount = result.filled || 0;
      const blockedCount = result.blockedRequired?.length || 0;

      if (result.ok === false || result.failureReason) {
        const failureReason = result.failureReason || 'network';
        setExtensionMessage(`Extension could not fill this form: ${result.reason || failureReason.replaceAll('_', ' ')}. Finish it manually — your pack is safe.`);
        onSaveApplication?.({
          id: `application-${job.id}`,
          jobId: job.id,
          job,
          pack: visiblePackRef.current,
          status: 'failed',
          failureReason,
          executionRoute: 'extension',
          executionState: 'extension_failed',
          events: [{
            id: `event-ext-fail-${Date.now()}`,
            type: 'extension_failed',
            createdAt: new Date().toISOString(),
            metadata: { bundleId: result.bundleId || null, reason: result.reason || '', failureReason },
          }],
          createdAt: new Date().toISOString(),
        });
        return;
      }

      setExtensionMessage(`Extension filled ${filledCount} safe field${filledCount === 1 ? '' : 's'}; ${blockedCount} required field${blockedCount === 1 ? '' : 's'} need you. Attach your CV on the form — JobMap never uploads it.`);
      // Fill receipt: the pack is on the real form; the user finishes + submits.
      onSaveApplication?.({
        id: `application-${job.id}`,
        jobId: job.id,
        job,
        pack: visiblePackRef.current,
        status: 'needs_user',
        executionRoute: 'extension',
        executionState: 'extension_filled',
        needsUserReason: blockedCount ? 'Required fields remain on the employer form.' : 'Review the form and submit it yourself.',
        events: [{
          id: `event-ext-${Date.now()}`,
          type: 'extension_fill',
          createdAt: new Date().toISOString(),
          metadata: {
            filled: filledCount,
            skipped: result.skipped || 0,
            blockedRequired: blockedCount,
            bundleId: result.bundleId || null,
            rejectedFields: result.rejectedFields || [],
            cvUserAction: Boolean(result.cv?.userAction),
          },
        }],
        createdAt: new Date().toISOString(),
      });
    };
    window.addEventListener('message', handleExtensionResult);
    return () => window.removeEventListener('message', handleExtensionResult);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);
  const [pack, setPack] = useState(() => {
    const initialProfile = { ...readProfile(), ...(providedProfile || {}) };
    const knownAnswers = getLearnedApplicationAnswers();
    const employment = initialProfile.preferences?.employment || {};
    const accountAnswers = {
      workAuthorization: initialProfile.workAuthorization || (employment.authorizedToWorkUS === false && employment.authorizedToWorkCanada === false && employment.authorizedToWorkUK === false ? 'Not authorized to work in the US, Canada, or UK; authorized to work in Cameroon.' : ''),
      sponsorship: employment.requiresVisaSponsorship === false ? 'No sponsorship required based on my saved profile.' : '',
      salary: initialProfile.salaryPreference || '',
    };
    const defaultCv = cvDocuments.find((document) => document.is_default) || cvDocuments[0];
    return {
      fullName: initialProfile.fullName || '',
      email: initialProfile.email || '',
      phone: initialProfile.phone || '',
      targetRole: initialProfile.targetRole || job?.title || '',
      coverNote: `Hello ${job?.company || 'team'} team, I am interested in the ${job?.title || 'role'} opportunity and would welcome the chance to discuss how my experience could contribute.`,
      screeningAnswers: '',
      cvDocumentId: defaultCv?.id || '',
      learnedAnswers: Object.fromEntries(learnedFields.map(({ key }) => [key, knownAnswers[key]?.value || accountAnswers[key] || ''])),
    };
  });

  const defaultCv = cvDocuments.find((document) => document.is_default) || cvDocuments[0];
  const visiblePack = {
    ...pack,
    fullName: pack.fullName || profile.fullName || '',
    email: pack.email || profile.email || '',
    phone: pack.phone || profile.phone || '',
    targetRole: pack.targetRole || profile.targetRole || job?.title || '',
    cvDocumentId: pack.cvDocumentId || defaultCv?.id || '',
  };

  // Ref so the extension receipt handler can read the current pack without stale closure.
  const visiblePackRef = useRef(visiblePack);
  useEffect(() => { visiblePackRef.current = visiblePack; });

  if (!job) return null;

  const isGreenhouseJob = adapterKey === 'greenhouse' || adapterKey === 'stripe-greenhouse';
  const readiness = getApplicationReadiness(job, profile, visiblePack, job.remoteEligibility ? 'remote' : 'local');
  const profileSkills = profile.skills || 'your saved skills and experience';
  const autofillSuggestions = buildAutofillSuggestions({
    fields: [
      { id: 'fullName', label: 'Full name' },
      { id: 'firstName', label: 'First name' },
      { id: 'lastName', label: 'Last name' },
      { id: 'email', label: 'Email address' },
      { id: 'phone', label: 'Phone number' },
      { id: 'targetRole', label: 'Target role' },
      { id: 'skills', label: 'Skills' },
      { id: 'education', label: 'Education' },
      { id: 'gpa', label: 'GPA' },
      { id: 'experience', label: 'Experience' },
      { id: 'linkedin', label: 'LinkedIn' },
      { id: 'portfolio', label: 'Portfolio / website' },
      { id: 'languages', label: 'Languages' },
      { id: 'timezone', label: 'Timezone' },
      { id: 'coverNote', label: 'Cover letter' },
      { id: 'workAuthorization', label: 'Work authorization' },
      { id: 'sponsorship', label: 'Visa sponsorship' },
      { id: 'salary', label: 'Salary preference' },
      { id: 'legal', label: 'I certify that the information provided is accurate' },
    ],
    profile,
    job,
    learnedAnswers,
    unassistedMode: true,
  });
  const updatePack = (field) => (event) => setPack((current) => ({ ...current, [field]: event.target.value }));
  const updateLearnedAnswer = (key) => (event) => setPack((current) => ({
    ...current,
    learnedAnswers: { ...current.learnedAnswers, [key]: event.target.value },
  }));
  const updateQuestionAnswer = (key) => (event) => setQuestionAnswers((current) => ({ ...current, [key]: event.target.value }));
  const runAutoFill = async () => {
    const bundle = withCoverNote(await createAutofillBundle({ suggestions: autofillSuggestions, job, cvDocumentId: visiblePack.cvDocumentId }), visiblePack);
    const values = Object.fromEntries(bundle.fields.map(({ fieldId, value }) => [fieldId, value]));
    setPack((current) => ({
      ...current,
      fullName: values.fullName || current.fullName,
      email: values.email || current.email,
      phone: values.phone || current.phone,
      targetRole: values.targetRole || current.targetRole,
      autofillBundle: bundle,
    }));
    const safeCount = bundle.fields.length;
    const reviewCount = bundle.requiresReviewFieldIds.length;
    const blockedCount = bundle.blockedFieldIds.length;
    setAutofillMessage(`Applied ${safeCount} safe field${safeCount === 1 ? '' : 's'} to this pack; ${reviewCount} require review${blockedCount ? `; ${blockedCount} blocked` : ''}.`);
  };

  const sendToExtension = async () => {
    let bundle = visiblePack.autofillBundle;
    if (!bundle) {
      bundle = withCoverNote(await createAutofillBundle({ suggestions: autofillSuggestions, job, cvDocumentId: visiblePack.cvDocumentId }), visiblePack);
      setPack((current) => ({ ...current, autofillBundle: bundle }));
    }
    sentBundleIdRef.current = bundle.bundleId;
    handledBundleIdRef.current = null;
    window.postMessage({ type: 'JOBMAP_AUTOFILL_HANDOFF', payload: { ...bundle, sentAt: new Date().toISOString() } }, window.location.origin);
    setExtensionMessage('Opening the employer form to fill approved safe fields…');
    // If the extension never answers (not installed, or its worker restarted),
    // downgrade the queued record so it cannot sit as queued forever.
    window.setTimeout(() => {
      if (handledBundleIdRef.current === bundle.bundleId) return;
      setExtensionMessage('No receipt from the extension yet. Open the employer form to finish — your pack is safe in JobMap.');
      onSaveApplication?.({
        id: `application-${job.id}`,
        jobId: job.id,
        job,
        pack: visiblePackRef.current,
        status: 'needs_user',
        executionRoute: 'extension',
        executionState: 'manual_fallback',
        needsUserReason: 'No extension receipt was received. Complete the employer form manually.',
        events: [{ id: `event-ext-timeout-${Date.now()}`, type: 'extension_no_receipt', createdAt: new Date().toISOString(), metadata: { bundleId: bundle.bundleId } }],
        createdAt: new Date().toISOString(),
      });
    }, 60_000);
    // Queue it as an execution record immediately; the receipt updates it below.
    onSaveApplication?.({
      id: `application-${job.id}`,
      jobId: job.id,
      job,
      pack: visiblePackRef.current,
      autofillBundle: bundle,
      status: 'queued',
      executionRoute: 'extension',
      executionState: 'queued',
      events: [{ id: `event-queue-${Date.now()}`, type: 'queued_for_extension', createdAt: new Date().toISOString(), metadata: { bundleId: bundle.bundleId } }],
      createdAt: new Date().toISOString(),
    });
  };

  const submitViaAdapter = async () => {
    setAdapterMessage('Submitting safe fields to the Greenhouse public endpoint…');
    const result = await submitGreenhouseApplication({ applyUrl: job.applyUrl, pack: visiblePack, profile });
    if (result.success && result.confirmationId) {
      setAdapterMessage(`Verified by Greenhouse (id ${result.confirmationId}). ${result.reason}`);
      onSaveApplication?.({
        id: `application-${job.id}`,
        jobId: job.id,
        job,
        pack: visiblePack,
        status: 'applied',
        executionRoute: 'api',
        appliedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        executionState: 'adapter_submitted',
        submissionReceipt: { url: result.receiptUrl, reference: result.confirmationId, confirmedBy: 'greenhouse-adapter', confirmedAt: new Date().toISOString() },
        events: [{ id: `event-ats-${Date.now()}`, type: 'adapter_submitted', createdAt: new Date().toISOString(), metadata: { adapter: adapterKey, fieldsSubmitted: result.fieldsSubmitted, confirmationId: result.confirmationId } }],
        createdAt: new Date().toISOString(),
      });
      return;
    }
    // Never mark Applied without a verified receipt — open the page instead.
    setAdapterMessage(`${result.reason} This is not recorded as submitted until you confirm evidence.`);
    if (result.receiptUrl && result.receiptUrl !== '#') window.open(result.receiptUrl, '_blank', 'noopener,noreferrer');
    onSaveApplication?.({
      id: `application-${job.id}`,
      jobId: job.id,
      job,
      pack: visiblePack,
      status: 'manual_fallback',
      executionRoute: 'manual',
      executionState: 'manual_fallback',
      events: [{ id: `event-fallback-${Date.now()}`, type: 'adapter_fallback', createdAt: new Date().toISOString(), metadata: { adapter: adapterKey, reason: result.reason } }],
      createdAt: new Date().toISOString(),
    });
  };
  const toggleRemember = (key) => (event) => setRememberAnswers((current) => ({ ...current, [key]: event.target.checked }));
  const savePack = (status) => {
    let answerMemory = learnedAnswers;
    learnedFields.forEach(({ key }) => {
      if (rememberAnswers[key] && pack.learnedAnswers[key]?.trim()) {
        answerMemory = rememberApplicationAnswer(key, pack.learnedAnswers[key], {
          unassisted: Boolean(reuseUnassisted[key] && (learnedAnswers[key]?.confirmations || 0) >= 2),
        });
      }
    });
    setLearnedAnswers(answerMemory);
    const finalSuggestions = buildAutofillSuggestions({ fields: autofillSuggestions.map(({ fieldId, label, type }) => ({ id: fieldId, label, type })), profile, job, learnedAnswers: answerMemory, unassistedMode: true });
    const autofillBundle = withCoverNote(visiblePack.autofillBundle || createAutofillBundle({ suggestions: finalSuggestions, job, cvDocumentId: visiblePack.cvDocumentId }), visiblePack);
    const nextStatus = status === 'ready_for_approval' && !readiness.canApprove ? 'needs_user' : status;
    onSaveApplication?.({
      id: `application-${job.id}`,
      jobId: job.id,
      job,
      pack: { ...visiblePack, autofillBundle },
      autofillBundle,
      status: nextStatus,
      executionRoute: capabilityDetail.capability,
      employerQuestions: employerQuestions.map(({ key, label, type, required }) => ({ key, label, type, required })),
      questionAnswers,
      learnedAnswerKeys: Object.keys(answerMemory),
      createdAt: new Date().toISOString(),
    });
    setSaved(true);
    setStep('ready');
  };

  return (
    <section className="apply-flow" role="dialog" aria-modal="true" aria-label="ApplyFlow application review">
      <div className="apply-flow__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="apply-flow__sheet" ref={sheetRef}>
        <div className="apply-flow__topline">
          <div>
            <span className="apply-flow__eyebrow">ApplyFlow · {step === 'prepare' ? '01' : step === 'review' ? '02' : '03'} / 03</span>
            <h2>{step === 'prepare' ? 'Prepare inside JobMap.' : step === 'review' ? 'Review before anything goes out.' : 'Your application is queued.'}</h2>
          </div>
          <button className="job-detail__close" type="button" onClick={onClose} aria-label="Close ApplyFlow">×</button>
        </div>

        <div className="apply-flow__job">
          <span>{job.company}</span>
          <strong>{job.title}</strong>
          <small>{job.location} · {eligibilityLabels[job.remoteEligibility] || 'Source eligibility not yet classified'}</small>
          <span className="apply-flow__capability">{capabilityLabels[capabilityDetail.capability] || capabilityLabels.manual}</span>
        </div>

        {step === 'prepare' && (
          <>
            <p className="apply-flow__intro">Build the application pack here first. Nothing is submitted and the employer website is never opened unless you choose “Send to extension”.</p>
            <div className="apply-flow__checks">
              <div><span>01</span><strong>Profile baseline</strong><small>{profile.fullName ? `Use ${profile.fullName} and ${profileSkills}.` : 'Add your profile details before tailoring the pack.'}</small></div>
              <div><span>02</span><strong>AI-assisted preparation</strong><small>JobMap can reuse approved profile facts and previously confirmed answers, but every draft remains editable.</small></div>
              <div><span>03</span><strong>Explicit approval</strong><small>Saving the pack queues it; it does not submit anything to the employer.</small></div>
            </div>
            <div className="apply-flow__capability-card">
              <p className="results-kicker">Execution capability · before you build the pack</p>
              <h3>{capabilityLabels[capabilityDetail.capability] || capabilityLabels.manual}</h3>
              <p>{capabilityDetail.note}</p>
              <small>
                {capabilityDetail.domains.length ? `Allowed host: ${capabilityDetail.domains.join(', ')}` : 'No verified host yet'}
                {capabilityDetail.supportedFields.length ? ` · Fills: ${capabilityDetail.supportedFields.map((field) => field.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}` : ''}
                {capabilityDetail.health ? ` · Adapter health: ${capabilityDetail.health}` : ''}
              </small>
            </div>
            <div className="apply-flow__actions">
              <button className="primary-action" type="button" onClick={() => setStep('review')}>Build application pack</button>
              <button className="secondary-action" type="button" onClick={() => savePack('draft')}>Save draft</button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <p className="apply-flow__intro">Your saved account facts are already included below. Edit the draft as needed; empty screening answers remain your responsibility. JobMap never invents qualifications or submits sensitive answers without your confirmation.</p>
            <div className="apply-flow__express-action"><button className="primary-action" type="button" onClick={runAutoFill}>AutoFill forms</button><span>Fill only source-backed safe fields now; review-gated and blocked fields stay visible below.</span></div>
            {autofillMessage && <p className="apply-flow__autofill-message" role="status">{autofillMessage}</p>}
            <div className="apply-flow__editor">
              <label><span>Your name</span><input value={visiblePack.fullName} onChange={updatePack('fullName')} placeholder="Add your name" /></label>
              <label><span>Email address</span><input type="email" value={visiblePack.email} onChange={updatePack('email')} placeholder="Add your email" /></label>
              <label><span>Phone number</span><input value={visiblePack.phone} onChange={updatePack('phone')} placeholder="Add your phone" /></label>
              <label><span>Target role</span><input value={visiblePack.targetRole} onChange={updatePack('targetRole')} /></label>
              <label><span>Approved CV</span><select value={visiblePack.cvDocumentId} onChange={updatePack('cvDocumentId')} disabled={!cvDocuments.length}><option value="">{cvDocuments.length ? 'Select a private CV' : 'No private CV linked yet'}</option>{cvDocuments.map((document) => <option key={document.id} value={document.id}>{document.file_name}{document.is_default ? ' · default' : ''}</option>)}</select></label>
              <label><span>Cover note</span><textarea value={visiblePack.coverNote} onChange={updatePack('coverNote')} rows="5" /></label>
              <label><span>Screening answers</span><textarea value={visiblePack.screeningAnswers} onChange={updatePack('screeningAnswers')} rows="4" placeholder="Answer employer questions here, or leave blank until asked." /></label>
            </div>

            {questionStatus === 'loading' && <p className="apply-flow__autofill-message" role="status">Loading the employer form’s questions…</p>}
            {questionStatus === 'unavailable' && <p className="apply-flow__autofill-message">Could not read this form’s questions. Review the employer page when you open it.</p>}
            {questionStatus === 'loaded' && (
              <div className="apply-flow__questions">
                <div><p className="results-kicker">Employer form review · {employerQuestions.length} question{employerQuestions.length === 1 ? '' : 's'}</p><h3>These are the questions on the real form.</h3><p>Approving this pack means these answers are for <strong>this</strong> form. File uploads (CV) are attached by you on the employer page.</p></div>
                <div className="apply-flow__questions-list">
                  {employerQuestions.map((question) => {
                    const isText = questionInputTypes.has(question.type);
                    const isSelect = question.type === 'select' || question.type === 'multi_select';
                    const isBoolean = question.type === 'boolean';
                    const isFile = question.type === 'file';
                    return (
                      <label className="apply-flow__question" key={question.key}>
                        <span>{question.label}{question.required ? ' · required' : ''} <em>({questionTypeLabels[question.type] || questionTypeLabels.unknown})</em></span>
                        {isFile
                          ? <small>Attach your CV on the employer form — JobMap never uploads files.</small>
                          : isSelect
                            ? <select value={questionAnswers[question.key] || ''} onChange={updateQuestionAnswer(question.key)}><option value="">{question.required ? 'Choose an answer' : 'Optional — choose an answer'}</option>{question.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                            : isBoolean
                              ? <select value={questionAnswers[question.key] || ''} onChange={updateQuestionAnswer(question.key)}><option value="">Choose…</option><option value="Yes">Yes</option><option value="No">No</option></select>
                              : isText
                                ? (question.type === 'multi_line_text' || question.type === 'textarea'
                                  ? <textarea rows="3" value={questionAnswers[question.key] || ''} onChange={updateQuestionAnswer(question.key)} placeholder={question.required ? 'Required on the form' : 'Optional'} />
                                  : <input value={questionAnswers[question.key] || ''} onChange={updateQuestionAnswer(question.key)} placeholder={question.required ? 'Required on the form' : 'Optional'} />)
                                : <input value={questionAnswers[question.key] || ''} onChange={updateQuestionAnswer(question.key)} placeholder="Answer on the form" />}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="apply-flow__autofill">
              <div><p className="results-kicker">Source-backed autofill map</p><h3>Fill facts, pause on risk.</h3><p>Known profile and CV facts are ready for autofill. Generated, sensitive, legal, and unknown fields remain review-gated.</p></div>
              <div className="apply-flow__autofill-list">{autofillSuggestions.map((suggestion) => <div className="apply-flow__autofill-row" key={suggestion.fieldId}><span><strong>{suggestion.label}</strong><small>{suggestion.source} · {suggestion.status}</small></span><em>{suggestion.blocked ? 'User only' : suggestion.value || 'Needs input'}</em></div>)}</div>
            </div>
            <div className="apply-flow__memory">
              <div><p className="results-kicker">AI-assisted answer memory</p><h3>Learn once, confirm every reuse.</h3><p>When you confirm an answer, JobMap can suggest it next time. Sensitive answers are never silently submitted.</p></div>
              {learnedFields.map(({ key, label, placeholder }) => (
                <label key={key} className="apply-flow__memory-field">
                  <span>{label}{learnedAnswers[key]?.confirmations ? ` · confirmed ${learnedAnswers[key].confirmations}×` : ''}</span>
                  <textarea value={visiblePack.learnedAnswers[key]} onChange={updateLearnedAnswer(key)} rows="2" placeholder={learnedAnswers[key]?.value || placeholder} />
                  <small><input type="checkbox" checked={Boolean(rememberAnswers[key])} onChange={toggleRemember(key)} /> Remember this answer for future review suggestions</small>
                  <small><input type="checkbox" checked={Boolean(reuseUnassisted[key])} onChange={(event) => setReuseUnassisted((current) => ({ ...current, [key]: event.target.checked }))} disabled={(learnedAnswers[key]?.confirmations || 0) < 2} /> Allow unassisted reuse after 3 confirmed uses</small>
                </label>
              ))}
            </div>
            {!readiness.canApprove && <p className="apply-flow__guardrail apply-flow__guardrail--warning">Approval paused: {readiness.reasons.join(' ')}</p>}
            <div className="apply-flow__actions">
              <button className="primary-action" type="button" onClick={() => savePack('ready_for_approval')}>{readiness.canApprove ? 'Save approved pack' : 'Save pack for review'}</button>
              <button className="secondary-action" type="button" onClick={() => setStep('prepare')}>Back</button>
            </div>
          </>
        )}

        {step === 'ready' && (
          <>
            <p className="apply-flow__intro">Your pack is saved in JobMap and ready for the next execution layer. This job has not been submitted.</p>
            <div className="apply-flow__draft">
              <DraftBlock label="Pack status">{saved ? 'Ready for user-approved execution' : 'Saved locally'}</DraftBlock>
              <DraftBlock label="Execution route">{capabilityLabels[capabilityDetail.capability] || capabilityLabels.manual}</DraftBlock>
              <DraftBlock label="Route detail">{capabilityDetail.note}</DraftBlock>
              <DraftBlock label="Approved CV">{cvDocuments.find((document) => document.id === pack.cvDocumentId)?.file_name || 'No private CV selected — attach your file on the employer form.'}</DraftBlock>
              <DraftBlock label="Autofill bundle">{visiblePack.autofillBundle ? `${visiblePack.autofillBundle.fields.length} safe fields ready; ${visiblePack.autofillBundle.requiresReviewFieldIds.length} require review.` : 'Created when this pack is saved.'}</DraftBlock>
              <DraftBlock label="Employer questions">{employerQuestions.length ? `${employerQuestions.length} question${employerQuestions.length === 1 ? '' : 's'} from the real form included in this pack.` : 'Form questions not yet ingested for this job.'}</DraftBlock>
              <DraftBlock label="Answer memory">{Object.keys(learnedAnswers).length ? 'Previously confirmed answers are available for future review.' : 'No answers have been remembered yet.'}</DraftBlock>
              <DraftBlock label="Next safe action">{capabilityDetail.capability === 'extension' ? 'Send the pack to the extension; it opens the employer form and fills safe fields.' : 'Keep this pack queued while the approved adapter or browser extension is built.'}</DraftBlock>
            </div>
            <div className="apply-flow__actions">
              <button className="primary-action" type="button" onClick={onClose}>Return to JobMap</button>
              {isGreenhouseJob && (
                <button className="primary-action apply-flow__adapter-btn" type="button" onClick={submitViaAdapter}>
                  Submit via Greenhouse adapter
                </button>
              )}
              <button className="secondary-action" type="button" onClick={sendToExtension}>Send to extension</button>
              <a className="secondary-action" href={job.applyUrl} target="_blank" rel="noopener noreferrer">Continue manually ↗</a>
              {adapterMessage && <p className="apply-flow__autofill-message apply-flow__autofill-message--adapter" role="status">{adapterMessage}</p>}
              {extensionMessage && <p className="apply-flow__autofill-message" role="status">{extensionMessage}</p>}
            </div>
          </>
        )}

        <p className="apply-flow__guardrail">{session ? 'Account-synced preparation' : 'Local-first preparation'} · explicit approval · no silent submission</p>
      </div>
    </section>
  );
}