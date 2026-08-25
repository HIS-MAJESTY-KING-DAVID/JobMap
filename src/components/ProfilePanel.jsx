import { useEffect, useState } from 'react';
import { parseSimplifyExport, readSimplifyFile } from '../services/simplifyImport';
import AuthPanel from './AuthPanel';
import { loadRemoteProfile, saveRemoteProfile, supabase } from '../services/supabase';

const PROFILE_KEY = 'jobmap-profile';
const emptyProfile = {
  fullName: '', email: '', phone: '', targetRole: '', skills: '', languages: 'English, French',
  timezone: 'Africa/Douala (WAT)', workAuthorization: 'Cameroon', salaryPreference: '', city: '',
  country: 'Cameroon', linkedin: '', portfolio: '', education: '', experience: '', certifications: '',
};

function readProfile() {
  try { return { ...emptyProfile, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') }; }
  catch { return emptyProfile; }
}

function fieldValue(profile, key) { return profile[key] || ''; }

export default function ProfilePanel({ onBack }) {
  const [profile, setProfile] = useState(readProfile);
  const [saved, setSaved] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedImportKeys, setSelectedImportKeys] = useState([]);
  const [pasteText, setPasteText] = useState('');
  const [importError, setImportError] = useState('');
  const [syncStatus, setSyncStatus] = useState('');

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const remoteProfile = await loadRemoteProfile(data.session.user.id);
        if (active && remoteProfile) setProfile((current) => ({ ...current, ...remoteProfile }));
      } catch { setSyncStatus('Signed in, but the remote profile could not be loaded.'); }
    });
    return () => { active = false; };
  }, []);

  const update = (field) => (event) => {
    setSaved(false);
    setProfile((current) => ({ ...current, [field]: event.target.value }));
  };
  const saveProfile = async (event) => {
    event.preventDefault();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setSaved(true);
    setSyncStatus('');
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        try { await saveRemoteProfile(profile, data.session.user.id); setSyncStatus('Synced privately to your account.'); }
        catch { setSyncStatus('Saved locally; remote sync needs attention.'); }
      }
    }
  };
  const previewImport = (result) => {
    setImportError(''); setImportResult(result); setSelectedImportKeys(result.fields.map((field) => field.key));
  };
  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { previewImport(await readSimplifyFile(file)); }
    catch { setImportError('JobMap could not read that file. Try a CSV, JSON, TXT, or copied profile export.'); }
  };
  const previewPastedText = () => {
    if (!pasteText.trim()) { setImportError('Paste your Simplify profile details first.'); return; }
    previewImport(parseSimplifyExport(pasteText, 'simplify-profile.txt'));
  };
  const toggleImportField = (key) => setSelectedImportKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const applyImport = () => {
    const imported = Object.fromEntries(importResult.fields.filter((field) => selectedImportKeys.includes(field.key)).map((field) => [field.key, field.value]));
    const nextProfile = { ...profile, ...imported };
    setProfile(nextProfile); localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile)); setSaved(true); setImportResult(null); setPasteText('');
  };

  return (
    <section className="profile-panel" aria-label="Job seeker profile">
      <div className="profile-panel__heading"><div><p className="results-kicker">ApplyFlow foundation</p><h1>Your profile</h1></div><span className="profile-panel__status">Local draft</span></div>
      <p className="profile-panel__intro">Build once, then reuse an approved profile across remote applications. Keep it local-first or sign in to sync it privately across devices.</p>
      <AuthPanel />
      <div className="simplify-import">
        <div className="simplify-import__heading"><div><p className="results-kicker">Simplify bridge</p><h2>Import profile settings</h2></div><span className="profile-panel__status">User-provided only</span></div>
        <p>Export or copy your Simplify profile details, then preview the mappings before anything replaces your JobMap profile. Credentials and private extension storage are never requested.</p>
        <label className="simplify-import__file"><span>Choose CSV, JSON, TXT, or Markdown</span><input type="file" accept=".csv,.json,.txt,.md,text/csv,application/json,text/plain,text/markdown" onChange={handleImportFile} /></label>
        <div className="simplify-import__paste"><textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} rows="3" placeholder="Or paste copied Simplify profile lines, e.g. Skills: React, Excel" /><button className="secondary-action" type="button" onClick={previewPastedText}>Preview pasted profile</button></div>
        {importError && <p className="simplify-import__error">{importError}</p>}
        {importResult && <div className="simplify-import__preview"><div className="simplify-import__preview-topline"><strong>{importResult.format} preview</strong><span>{importResult.fields.length} fields recognized</span></div>
          {importResult.fields.length === 0 ? <p className="simplify-import__empty">No supported fields were recognized. Try copying labelled profile lines or exporting a CSV/JSON file.</p> : <div className="simplify-import__fields">{importResult.fields.map((field) => <label key={field.key} className="simplify-import__field"><input type="checkbox" checked={selectedImportKeys.includes(field.key)} onChange={() => toggleImportField(field.key)} /><span><strong>{field.label}</strong><small>{field.value}</small></span></label>)}</div>}
          {importResult.warnings.map((warning) => <p className="simplify-import__warning" key={warning}>{warning}</p>)}
          <div className="profile-panel__actions"><button className="primary-action" type="button" disabled={!selectedImportKeys.length} onClick={applyImport}>Confirm selected fields</button><button className="secondary-action" type="button" onClick={() => setImportResult(null)}>Discard preview</button></div>
        </div>}
      </div>
      <form className="profile-form" onSubmit={saveProfile}>
        <label><span>Full name</span><input value={fieldValue(profile, 'fullName')} onChange={update('fullName')} placeholder="Your name" autoComplete="name" /></label>
        <div className="profile-form__grid"><label><span>Email</span><input value={fieldValue(profile, 'email')} onChange={update('email')} placeholder="you@example.com" autoComplete="email" /></label><label><span>Phone</span><input value={fieldValue(profile, 'phone')} onChange={update('phone')} placeholder="Optional" autoComplete="tel" /></label></div>
        <label><span>Target role</span><input value={fieldValue(profile, 'targetRole')} onChange={update('targetRole')} placeholder="e.g. Customer support specialist" /></label>
        <label><span>Skills</span><textarea value={fieldValue(profile, 'skills')} onChange={update('skills')} placeholder="List your strongest skills" rows="3" /></label>
        <div className="profile-form__grid"><label><span>Languages</span><input value={fieldValue(profile, 'languages')} onChange={update('languages')} /></label><label><span>Timezone</span><input value={fieldValue(profile, 'timezone')} onChange={update('timezone')} /></label></div>
        <div className="profile-form__grid"><label><span>Work authorization</span><input value={fieldValue(profile, 'workAuthorization')} onChange={update('workAuthorization')} /></label><label><span>Salary preference</span><input value={fieldValue(profile, 'salaryPreference')} onChange={update('salaryPreference')} placeholder="Currency + period" /></label></div>
        <div className="profile-form__grid"><label><span>City</span><input value={fieldValue(profile, 'city')} onChange={update('city')} placeholder="Douala" /></label><label><span>Country</span><input value={fieldValue(profile, 'country')} onChange={update('country')} /></label></div>
        <label><span>Education</span><textarea value={fieldValue(profile, 'education')} onChange={update('education')} rows="2" placeholder="Degrees, schools, or training" /></label>
        <label><span>Experience</span><textarea value={fieldValue(profile, 'experience')} onChange={update('experience')} rows="3" placeholder="Roles, employers, and measurable outcomes" /></label>
        <div className="profile-form__grid"><label><span>LinkedIn</span><input value={fieldValue(profile, 'linkedin')} onChange={update('linkedin')} placeholder="https://linkedin.com/in/..." /></label><label><span>Portfolio</span><input value={fieldValue(profile, 'portfolio')} onChange={update('portfolio')} placeholder="https://..." /></label></div>
        <div className="profile-panel__actions"><button className="primary-action" type="submit">{saved ? 'Profile saved' : 'Save profile'}</button><button className="secondary-action" type="button" onClick={onBack}>Back to jobs</button></div>
      </form>
      {syncStatus && <p className="profile-panel__note">{syncStatus}</p>}
      <p className="profile-panel__note">Next: profile versions, CV selection in Application Packs, and approved application adapters.</p>
    </section>
  );
}
