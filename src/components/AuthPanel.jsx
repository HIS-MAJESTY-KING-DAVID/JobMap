import { useEffect, useState } from 'react';
import { getCvDownloadUrl, isSupabaseConfigured, removeCv, requestAccountDeletion, setDefaultCv, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, subscribeToAuth, supabase, uploadCv } from '../services/supabase';

export default function AuthPanel({ session: suppliedSession, cvFiles: suppliedCvFiles = [], onCvFilesChange }) {
  const [internalSession, setInternalSession] = useState(null);
  const session = suppliedSession !== undefined ? suppliedSession : internalSession;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [internalCvFiles, setInternalCvFiles] = useState(suppliedCvFiles);
  const cvFiles = suppliedSession !== undefined ? suppliedCvFiles : internalCvFiles;
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);

  useEffect(() => {
    if (suppliedSession !== undefined || !supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setInternalSession(data.session));
    return subscribeToAuth(setInternalSession);
  }, [suppliedSession]);

  const handleEmail = async (event) => {
    event.preventDefault();
    setBusy(true); setStatus('');
    try {
      const result = mode === 'signin' ? await signInWithEmail(email, password) : await signUpWithEmail(email, password);
      if (result.error) throw result.error;
      setStatus(mode === 'signin' ? 'Signed in.' : 'Check your email to confirm your account.');
    } catch (error) { setStatus(error.message || 'Authentication failed.'); }
    finally { setBusy(false); }
  };

  const handleGoogle = async () => {
    setStatus('');
    try { const result = await signInWithGoogle(); if (result.error) throw result.error; }
    catch (error) { setStatus(error.message || 'Google sign-in could not start.'); }
  };

  const handleCvUpload = async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length || !session?.user?.id) return;
    setBusy(true); setStatus('Uploading privately…');
    try {
      const uploaded = [];
      for (const file of files) uploaded.push(await uploadCv(file, session.user.id));
      const nextFiles = [...uploaded, ...cvFiles];
      setInternalCvFiles(nextFiles); onCvFilesChange?.(nextFiles); setStatus(`${uploaded.length} CV${uploaded.length > 1 ? 's' : ''} uploaded privately.`);
    } catch (error) { setStatus(error.message || 'CV upload failed.'); }
    finally { setBusy(false); event.target.value = ''; }
  };

  const handleDeletionRequest = async () => {
    if (!session?.user?.id || deletionRequested || !window.confirm('Request deletion of your JobMap account and user-visible data? Retained backups and a restricted deletion record are purged after 90 days.')) return;
    setBusy(true); setStatus('Submitting deletion request…');
    try {
      const request = await requestAccountDeletion(session.user.id, 'User requested account deletion');
      setDeletionRequested(true);
      setStatus(`Deletion requested. Scheduled purge: ${new Date(request.scheduled_purge_at).toLocaleDateString()}.`);
    } catch (error) { setStatus(error.message || 'Deletion request failed.'); }
    finally { setBusy(false); }
  };

  const handleCvAction = async (action, file) => {
    if (!session?.user?.id || !file) return;
    setBusy(true); setStatus('Updating private CV settings…');
    try {
      if (action === 'download') {
        const url = await getCvDownloadUrl(file.path || file.storage_path);
        window.open(url, '_blank', 'noopener,noreferrer');
        setStatus('Secure CV link created and opened.');
      } else {
        const nextFiles = action === 'default' ? await setDefaultCv(file.id, session.user.id) : await removeCv(file.id, session.user.id);
        setInternalCvFiles(nextFiles); onCvFilesChange?.(nextFiles); setStatus(action === 'default' ? 'Default CV updated.' : 'CV removed from active ApplyFlow use.');
      }
    } catch (error) { setStatus(error.message || 'CV action failed.'); }
    finally { setBusy(false); }
  };

  if (!isSupabaseConfigured) return <div className="auth-panel"><strong>Accounts are being configured.</strong><span>The public discovery experience remains available while secure account storage is prepared.</span></div>;
  if (session) return <div className="auth-panel"><div className="auth-panel__topline"><div><p className="results-kicker">Account connected</p><strong>{session.user.email}</strong></div><button className="secondary-action" type="button" onClick={() => signOut()}>Sign out</button></div><label className="auth-panel__file"><span>Upload private CVs</span><input type="file" accept="application/pdf,.pdf,.doc,.docx" multiple onChange={handleCvUpload} disabled={busy} /></label>{cvFiles.length > 0 && <><p className="results-kicker">Private CVs available to ApplyFlow</p><ul className="auth-panel__files">{cvFiles.map((file) => <li key={file.path || file.storage_path}><span>{file.name || file.file_name}</span><small>{file.version_label || (file.is_default ? 'Default CV' : 'Available CV')}</small><div className="auth-panel__file-actions">{!file.is_default && <button type="button" className="auth-panel__mini-action" onClick={() => handleCvAction('default', file)} disabled={busy}>Make default</button>}<button type="button" className="auth-panel__mini-action" onClick={() => handleCvAction('download', file)} disabled={busy}>Download</button><button type="button" className="auth-panel__mini-action auth-panel__mini-action--danger" onClick={() => handleCvAction('remove', file)} disabled={busy}>Remove</button></div></li>)}</ul></>}<div className="auth-panel__danger-zone"><strong>Account lifecycle</strong><span>Deletion removes user-visible data and schedules restricted retained copies for purge after 90 days.</span><button type="button" className="auth-panel__delete" onClick={handleDeletionRequest} disabled={busy || deletionRequested}>{deletionRequested ? 'Deletion requested' : 'Request account deletion'}</button></div>{status && <p className="auth-panel__status">{status}</p>}</div>;

  return <div className="auth-panel"><div className="auth-panel__heading"><div><p className="results-kicker">Private ApplyFlow workspace</p><h2>Sign in to sync your profile</h2></div><span className="profile-panel__status">Email + Google</span></div><p>Discovery stays public. Sign in to save profile versions, upload private CVs, sync Application Packs, and track applications across devices.</p><form className="auth-panel__form" onSubmit={handleEmail}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" required /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength="8" required /><button className="primary-action" type="submit" disabled={busy}>{mode === 'signin' ? 'Sign in with email' : 'Create account'}</button></form><button className="secondary-action auth-panel__google" type="button" onClick={handleGoogle}>Continue with Google</button><button className="auth-panel__switch" type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button>{status && <p className="auth-panel__status">{status}</p>}</div>;
}
