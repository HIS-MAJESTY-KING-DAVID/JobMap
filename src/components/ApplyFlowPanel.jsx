import { useState } from 'react';

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

export default function ApplyFlowPanel({ job, onClose, onSaveApplication }) {
  const [step, setStep] = useState('prepare');
  const [saved, setSaved] = useState(false);
  const [profile] = useState(readProfile);
  const [pack, setPack] = useState(() => {
    const initialProfile = readProfile();
    return {
      fullName: initialProfile.fullName || '',
      targetRole: initialProfile.targetRole || job?.title || '',
      coverNote: `Hello ${job?.company || 'team'} team, I am interested in the ${job?.title || 'role'} opportunity and would welcome the chance to discuss how my experience could contribute.`,
      screeningAnswers: '',
    };
  });

  if (!job) return null;

  const capability = job.applicationCapability || 'manual';
  const profileSkills = profile.skills || 'your saved skills and experience';
  const updatePack = (field) => (event) => setPack((current) => ({ ...current, [field]: event.target.value }));
  const savePack = (status) => {
    onSaveApplication?.({
      id: `application-${job.id}`,
      jobId: job.id,
      job,
      pack,
      status,
      executionRoute: capability,
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
              <div><span>02</span><strong>Editable pack</strong><small>Review the role headline, cover note, and screening answers in JobMap.</small></div>
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
            <p className="apply-flow__intro">Edit the draft below. Empty screening answers remain your responsibility and are never invented by JobMap.</p>
            <div className="apply-flow__editor">
              <label><span>Your name</span><input value={pack.fullName} onChange={updatePack('fullName')} placeholder="Add your name" /></label>
              <label><span>Target role</span><input value={pack.targetRole} onChange={updatePack('targetRole')} /></label>
              <label><span>Cover note</span><textarea value={pack.coverNote} onChange={updatePack('coverNote')} rows="5" /></label>
              <label><span>Screening answers</span><textarea value={pack.screeningAnswers} onChange={updatePack('screeningAnswers')} rows="4" placeholder="Answer employer questions here, or leave blank until asked." /></label>
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
              <DraftBlock label="Next safe action">{capability === 'api' ? 'Confirm the in-site submission request.' : 'Keep this pack queued while the approved adapter or browser extension is built.'}</DraftBlock>
            </div>
            <div className="apply-flow__actions">
              <button className="primary-action" type="button" onClick={onClose}>Return to JobMap</button>
              <a className="secondary-action" href={job.applyUrl} target="_blank" rel="noopener noreferrer">Continue manually ↗</a>
            </div>
          </>
        )}

        <p className="apply-flow__guardrail">In-site preparation · explicit approval · no silent submission</p>
      </div>
    </section>
  );
}
