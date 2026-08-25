import { useState } from 'react';
import { getLearnedApplicationAnswers, rememberApplicationAnswer } from '../services/applicationAnswers.js';
import { buildAutofillSuggestions, createAutofillBundle } from '../services/fieldAutofill.js';

const eligibilityLabels = {
  'cameroon-eligible': 'Cameroon eligible',
  'africa-eligible': 'Africa eligible',
  worldwide: 'Worldwide remote',
  restricted: 'Location restricted',
  unclear: 'Eligibility unclear',
};

const capabilityLabels = {
  api: 'In-site submission available',
  extension: 'Browser-assisted submission next',
  manual: 'Manual source fallback',
  unsupported: 'Submission route not verified',
};

const learnedFields = [
  { key: 'workAuthorization', label: 'Work authorization', placeholder: 'Example: Authorized to work in Cameroon; requires sponsorship elsewhere.' },
  { key: 'sponsorship', label: 'Sponsorship', placeholder: 'Example: I may require sponsorship for this country.' },
  { key: 'salary', label: 'Salary preference', placeholder: 'Example: USD 2,000 monthly, negotiable.' },
];

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

export default function ApplyFlowPanel({ job, profile: providedProfile, cvDocuments = [], session, onClose, onSaveApplication }) {
  const [step, setStep] = useState('prepare');
  const [saved, setSaved] = useState(false);
  const [profile] = useState(() => ({ ...readProfile(), ...(providedProfile || {}) }));
  const [learnedAnswers, setLearnedAnswers] = useState(getLearnedApplicationAnswers);
  const [rememberAnswers, setRememberAnswers] = useState({});
  const [reuseUnassisted, setReuseUnassisted] = useState({});
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
      targetRole: initialProfile.targetRole || job?.title || '',
      coverNote: `Hello ${job?.company || 'team'} team, I am interested in the ${job?.title || 'role'} opportunity and would welcome the chance to discuss how my experience could contribute.`,
      screeningAnswers: '',
      cvDocumentId: defaultCv?.id || '',
      learnedAnswers: Object.fromEntries(learnedFields.map(({ key }) => [key, knownAnswers[key]?.value || accountAnswers[key] || ''])),
    };
  });

  if (!job) return null;

  const capability = job.applicationCapability || 'manual';
  const profileSkills = profile.skills || 'your saved skills and experience';
  const autofillSuggestions = buildAutofillSuggestions({
    fields: [
      { id: 'fullName', label: 'Full name' },
      { id: 'email', label: 'Email address' },
      { id: 'phone', label: 'Phone number' },
      { id: 'targetRole', label: 'Target role' },
      { id: 'skills', label: 'Skills' },
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
    const autofillBundle = createAutofillBundle({ suggestions: finalSuggestions, job, cvDocumentId: pack.cvDocumentId });
    onSaveApplication?.({
      id: `application-${job.id}`,
      jobId: job.id,
      job,
      pack: { ...pack, autofillBundle },
      autofillBundle,
      status,
      executionRoute: capability,
      learnedAnswerKeys: Object.keys(answerMemory),
      createdAt: new Date().toISOString(),
    });
    setSaved(true);
    setStep('ready');
  };

  return (
    <section className="apply-flow" role="dialog" aria-modal="true" aria-label="ApplyFlow application review">
      <div className="apply-flow__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="apply-flow__sheet">
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
          <span className="apply-flow__capability">{capabilityLabels[capability] || capabilityLabels.manual}</span>
        </div>

        {step === 'prepare' && (
          <>
            <p className="apply-flow__intro">Build the application pack here first. The employer website is only a fallback for this job; JobMap will not open it unless you choose to.</p>
            <div className="apply-flow__checks">
              <div><span>01</span><strong>Profile baseline</strong><small>{profile.fullName ? `Use ${profile.fullName} and ${profileSkills}.` : 'Add your profile details before tailoring the pack.'}</small></div>
              <div><span>02</span><strong>AI-assisted preparation</strong><small>JobMap can reuse approved profile facts and previously confirmed answers, but every draft remains editable.</small></div>
              <div><span>03</span><strong>Explicit approval</strong><small>Saving the pack queues it; it does not submit anything to the employer.</small></div>
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
            <div className="apply-flow__editor">
              <label><span>Your name</span><input value={pack.fullName} onChange={updatePack('fullName')} placeholder="Add your name" /></label>
              <label><span>Target role</span><input value={pack.targetRole} onChange={updatePack('targetRole')} /></label>
              <label><span>Approved CV</span><select value={pack.cvDocumentId} onChange={updatePack('cvDocumentId')} disabled={!cvDocuments.length}><option value="">{cvDocuments.length ? 'Select a private CV' : 'No private CV linked yet'}</option>{cvDocuments.map((document) => <option key={document.id} value={document.id}>{document.file_name}{document.is_default ? ' · default' : ''}</option>)}</select></label>
              <label><span>Cover note</span><textarea value={pack.coverNote} onChange={updatePack('coverNote')} rows="5" /></label>
              <label><span>Screening answers</span><textarea value={pack.screeningAnswers} onChange={updatePack('screeningAnswers')} rows="4" placeholder="Answer employer questions here, or leave blank until asked." /></label>
            </div>
            <div className="apply-flow__autofill">
              <div><p className="results-kicker">Source-backed autofill map</p><h3>Fill facts, pause on risk.</h3><p>Known profile and CV facts are ready for autofill. Generated, sensitive, legal, and unknown fields remain review-gated.</p></div>
              <div className="apply-flow__autofill-list">{autofillSuggestions.map((suggestion) => <div className="apply-flow__autofill-row" key={suggestion.fieldId}><span><strong>{suggestion.label}</strong><small>{suggestion.source} · {suggestion.status}</small></span><em>{suggestion.blocked ? 'User only' : suggestion.value || 'Needs input'}</em></div>)}</div>
            </div>
            <div className="apply-flow__memory">
              <div><p className="results-kicker">AI-assisted answer memory</p><h3>Learn once, confirm every reuse.</h3><p>When you confirm an answer, JobMap can suggest it next time. Sensitive answers are never silently submitted.</p></div>
              {learnedFields.map(({ key, label, placeholder }) => (
                <label key={key} className="apply-flow__memory-field">
                  <span>{label}{learnedAnswers[key]?.confirmations ? ` · confirmed ${learnedAnswers[key].confirmations}×` : ''}</span>
                  <textarea value={pack.learnedAnswers[key]} onChange={updateLearnedAnswer(key)} rows="2" placeholder={learnedAnswers[key]?.value || placeholder} />
                  <small><input type="checkbox" checked={Boolean(rememberAnswers[key])} onChange={toggleRemember(key)} /> Remember this answer for future review suggestions</small>
                  <small><input type="checkbox" checked={Boolean(reuseUnassisted[key])} onChange={(event) => setReuseUnassisted((current) => ({ ...current, [key]: event.target.checked }))} disabled={(learnedAnswers[key]?.confirmations || 0) < 2} /> Allow unassisted reuse after 3 confirmed uses</small>
                </label>
              ))}
            </div>
            <div className="apply-flow__actions">
              <button className="primary-action" type="button" onClick={() => savePack('ready_for_approval')}>Save approved pack</button>
              <button className="secondary-action" type="button" onClick={() => setStep('prepare')}>Back</button>
            </div>
          </>
        )}

        {step === 'ready' && (
          <>
            <p className="apply-flow__intro">Your pack is saved in JobMap and ready for the next execution layer. This job has not been submitted.</p>
            <div className="apply-flow__draft">
              <DraftBlock label="Pack status">{saved ? 'Ready for user-approved execution' : 'Saved locally'}</DraftBlock>
              <DraftBlock label="Execution route">{capabilityLabels[capability] || capabilityLabels.manual}</DraftBlock>
              <DraftBlock label="Approved CV">{cvDocuments.find((document) => document.id === pack.cvDocumentId)?.file_name || 'No private CV selected'}</DraftBlock>
              <DraftBlock label="Autofill bundle">{pack.autofillBundle ? `${pack.autofillBundle.fields.length} safe fields ready; ${pack.autofillBundle.requiresReviewFieldIds.length} require review.` : 'Created when this pack is saved.'}</DraftBlock>
              <DraftBlock label="Answer memory">{Object.keys(learnedAnswers).length ? 'Previously confirmed answers are available for future review.' : 'No answers have been remembered yet.'}</DraftBlock>
              <DraftBlock label="Next safe action">{capability === 'api' ? 'Confirm the in-site submission request.' : 'Keep this pack queued while the approved adapter or browser extension is built.'}</DraftBlock>
            </div>
            <div className="apply-flow__actions">
              <button className="primary-action" type="button" onClick={onClose}>Return to JobMap</button>
              <a className="secondary-action" href={job.applyUrl} target="_blank" rel="noopener noreferrer">Continue manually ↗</a>
            </div>
          </>
        )}

        <p className="apply-flow__guardrail">{session ? 'Account-synced preparation' : 'Local-first preparation'} · explicit approval · no silent submission</p>
      </div>
    </section>
  );
}
