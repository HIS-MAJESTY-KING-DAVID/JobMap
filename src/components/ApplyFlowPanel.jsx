import { useState } from 'react';

const eligibilityLabels = {
  'cameroon-eligible': 'Cameroon eligible',
  'africa-eligible': 'Africa eligible',
  worldwide: 'Worldwide remote',
  restricted: 'Location restricted',
  unclear: 'Eligibility unclear',
};

function DraftBlock({ label, children }) {
  return (
    <div className="apply-flow__draft-block">
      <span>{label}</span>
      <p>{children}</p>
    </div>
  );
}

export default function ApplyFlowPanel({ job, onClose }) {
  const [step, setStep] = useState('prepare');
  const [profile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jobmap-profile') || '{}');
    } catch {
      return {};
    }
  });
  const profileName = profile.fullName || 'your approved profile';
  const profileSkills = profile.skills || 'your saved skills and experience';

  if (!job) return null;

  return (
    <section className="apply-flow" role="dialog" aria-modal="true" aria-label="ApplyFlow application review">
      <div className="apply-flow__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="apply-flow__sheet">
        <div className="apply-flow__topline">
          <div>
            <span className="apply-flow__eyebrow">ApplyFlow · {step === 'prepare' ? '01' : '02'} / 02</span>
            <h2>{step === 'prepare' ? 'Prepare before you apply.' : 'Your reviewable application pack.'}</h2>
          </div>
          <button className="job-detail__close" type="button" onClick={onClose} aria-label="Close ApplyFlow">×</button>
        </div>

        <div className="apply-flow__job">
          <span>{job.company}</span>
          <strong>{job.title}</strong>
          <small>{job.location} · {eligibilityLabels[job.remoteEligibility] || 'Source eligibility not yet classified'}</small>
        </div>

        {step === 'prepare' ? (
          <>
            <p className="apply-flow__intro">JobMap will prepare a draft from your approved profile. Nothing is submitted without your confirmation.</p>
            <div className="apply-flow__checks">
              <div><span>01</span><strong>Profile baseline</strong><small>Use your saved skills, languages, and experience.</small></div>
              <div><span>02</span><strong>Source preserved</strong><small>Apply through the original employer or job-board link.</small></div>
              <div><span>03</span><strong>Human review</strong><small>Review every answer before opening or submitting.</small></div>
            </div>
            <div className="apply-flow__actions">
              <button className="primary-action" type="button" onClick={() => setStep('review')}>Review application pack</button>
              <a className="secondary-action" href={job.applyUrl} target="_blank" rel="noopener noreferrer">Open source listing ↗</a>
            </div>
          </>
        ) : (
          <>
            <p className="apply-flow__intro">This local draft uses {profile.fullName ? <strong>{profileName}</strong> : 'your local profile draft'}. Profile tailoring and saved application history will unlock with your JobMap account.</p>
            <div className="apply-flow__draft">
              <DraftBlock label="Position headline">{job.title} · {job.company}</DraftBlock>
              <DraftBlock label="Relevant signal">{profile.fullName ? `Prioritize ${profileSkills} when tailoring this application.` : 'Experience and skills matched to this opening will appear here after your profile is connected.'}</DraftBlock>
              <DraftBlock label="Short application note">Hello {job.company} team, I am interested in the {job.title} opportunity and would welcome the chance to discuss how my experience could contribute.</DraftBlock>
            </div>
            <div className="apply-flow__actions">
              <a className="primary-action" href={job.applyUrl} target="_blank" rel="noopener noreferrer">Open application ↗</a>
              <button className="secondary-action" type="button" onClick={onClose}>Save draft for later</button>
            </div>
          </>
        )}

        <p className="apply-flow__guardrail">User-controlled · canonical source link · no automatic submission</p>
      </div>
    </section>
  );
}
