import { useState } from 'react';

const PROFILE_KEY = 'jobmap-profile';
const emptyProfile = {
  fullName: '',
  targetRole: '',
  skills: '',
  languages: 'English, French',
  timezone: 'Africa/Douala (WAT)',
  workAuthorization: 'Cameroon',
  salaryPreference: '',
};

function readProfile() {
  try {
    return { ...emptyProfile, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') };
  } catch {
    return emptyProfile;
  }
}

export default function ProfilePanel({ onBack }) {
  const [profile, setProfile] = useState(readProfile);
  const [saved, setSaved] = useState(false);

  const update = (field) => (event) => {
    setSaved(false);
    setProfile((current) => ({ ...current, [field]: event.target.value }));
  };

  const saveProfile = (event) => {
    event.preventDefault();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setSaved(true);
  };

  return (
    <section className="profile-panel" aria-label="Job seeker profile">
      <div className="profile-panel__heading">
        <div>
          <p className="results-kicker">ApplyFlow foundation</p>
          <h1>Your profile</h1>
        </div>
        <span className="profile-panel__status">Local draft</span>
      </div>
      <p className="profile-panel__intro">Build once, then reuse an approved profile across remote applications. This draft stays on this device until accounts and private storage ship.</p>
      <form className="profile-form" onSubmit={saveProfile}>
        <label><span>Full name</span><input value={profile.fullName} onChange={update('fullName')} placeholder="Your name" autoComplete="name" /></label>
        <label><span>Target role</span><input value={profile.targetRole} onChange={update('targetRole')} placeholder="e.g. Customer support specialist" /></label>
        <label><span>Skills</span><textarea value={profile.skills} onChange={update('skills')} placeholder="List your strongest skills" rows="3" /></label>
        <div className="profile-form__grid">
          <label><span>Languages</span><input value={profile.languages} onChange={update('languages')} /></label>
          <label><span>Timezone</span><input value={profile.timezone} onChange={update('timezone')} /></label>
        </div>
        <div className="profile-form__grid">
          <label><span>Work authorization</span><input value={profile.workAuthorization} onChange={update('workAuthorization')} /></label>
          <label><span>Salary preference</span><input value={profile.salaryPreference} onChange={update('salaryPreference')} placeholder="Currency + period" /></label>
        </div>
        <div className="profile-panel__actions">
          <button className="primary-action" type="submit">{saved ? 'Profile saved' : 'Save local profile'}</button>
          <button className="secondary-action" type="button" onClick={onBack}>Back to jobs</button>
        </div>
      </form>
      <p className="profile-panel__note">Next: email/Google sign-in, CV upload, and Simplify import.</p>
    </section>
  );
}
