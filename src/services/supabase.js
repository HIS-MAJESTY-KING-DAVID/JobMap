import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase is not configured for this deployment.');
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
}

export async function signInWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured for this deployment.');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured for this deployment.');
  return supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
}

export async function signOut() {
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}

const profileFields = ['fullName', 'email', 'phone', 'targetRole', 'skills', 'languages', 'timezone', 'workAuthorization', 'salaryPreference', 'city', 'country', 'linkedin', 'portfolio', 'education', 'experience', 'certifications', 'gpa', 'preferences'];
const profileColumn = (field) => field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

function profileToRow(profile, userId) {
  return Object.fromEntries([
    ['id', userId],
    ...profileFields.map((field) => [profileColumn(field), profile[field] || null]),
    ['updated_at', new Date().toISOString()],
  ]);
}

function rowToProfile(row) {
  if (!row) return null;
  return Object.fromEntries(profileFields.map((field) => [field, row[profileColumn(field)] || '']));
}

export async function loadRemoteProfile(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return rowToProfile(data);
}

export async function saveRemoteProfile(profile, userId) {
  if (!supabase || !userId) throw new Error('Sign in before syncing your profile.');
  const { data, error } = await supabase.from('profiles').upsert(profileToRow(profile, userId)).select().single();
  if (error) throw error;
  return rowToProfile(data);
}

export async function listCvDocuments(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase.from('cv_documents').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function uploadCv(file, userId) {
  if (!supabase || !userId) throw new Error('Sign in before uploading a CV.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('cv-documents').upload(path, file, { upsert: false, contentType: file.type || 'application/pdf' });
  if (error) throw error;
  const metadata = { user_id: userId, storage_path: path, file_name: file.name, content_type: file.type || 'application/pdf', file_size: file.size };
  const { data: record, error: metadataError } = await supabase.from('cv_documents').insert(metadata).select().single();
  if (metadataError) {
    await supabase.storage.from('cv-documents').remove([path]);
    throw metadataError;
  }
  return record;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function applicationToRow(application, userId) {
  const job = application.job || {};
  const pack = application.pack || {};
  const bundle = application.autofillBundle || pack.autofillBundle || null;
  const jobFingerprint = application.jobFingerprint || `${job.source || 'jobmap'}:${application.jobId || job.id || application.id}`;
  return {
    user_id: userId,
    job_id: UUID_PATTERN.test(application.jobId || '') ? application.jobId : null,
    job_fingerprint: jobFingerprint,
    cv_document_id: UUID_PATTERN.test(pack.cvDocumentId || '') ? pack.cvDocumentId : null,
    status: application.status || 'draft',
    application_mode: application.executionRoute || 'manual_fallback',
    cover_note: pack.coverNote || null,
    screening_answers: pack.screeningAnswers ? { text: pack.screeningAnswers } : null,
    autofill_bundle: bundle,
    autofill_state: bundle?.blockedFieldIds?.length ? 'blocked' : bundle?.requiresReviewFieldIds?.length ? 'needs_review' : 'ready_for_handoff',
    eligibility: job.remoteEligibility ? { remoteEligibility: job.remoteEligibility, eligibleCountries: job.eligibleCountries || [] } : null,
    source_url: job.applyUrl || job.sourceUrl || null,
    submitted_at: application.submittedAt || null,
    applied_at: application.appliedAt || null,
    follow_up_at: application.followUpAt || null,
    follow_up_note: application.followUpNote || null,
    recruiter_contact: application.recruiterContact || null,
    next_action: application.nextAction || null,
    submission_receipt: application.submissionReceipt || null,
    execution_state: application.executionState || 'not_started',
    updated_at: application.updatedAt || new Date().toISOString(),
  };
}

export async function saveRemoteApplication(application, userId) {
  if (!supabase || !userId || !application) return null;
  const { data, error } = await supabase.from('applications').upsert(applicationToRow(application, userId), { onConflict: 'user_id,job_fingerprint' }).select().single();
  if (error) throw error;
  return data;
}

export function subscribeToAuth(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
