import process from 'node:process';

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const now = new Date().toISOString();
const dryRun = process.env.PURGE_DRY_RUN === 'true';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Retention purge requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

async function request(path, options = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || 'GET'} ${path} returned ${response.status}: ${body.slice(0, 240)}`);
  }
  return response.status === 204 ? null : response.json();
}

async function purgeStorageObject(storagePath, userId) {
  if (!storagePath) return;
  if (!storagePath.startsWith(`${userId}/`)) throw new Error(`Refusing to purge CV path outside user folder: ${storagePath}`);
  if (dryRun) return;
  await request(`/storage/v1/object/cv-documents/${storagePath.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' });
}

async function purgeUser(requestRow) {
  const userId = requestRow.user_id;
  const cvRows = await request(`/rest/v1/cv_documents?user_id=eq.${encodeURIComponent(userId)}&select=storage_path`);
  for (const cv of cvRows || []) await purgeStorageObject(cv.storage_path, userId);

  // Delete application-owned rows explicitly before removing the auth user. This keeps
  // the worker safe even if a deployment has not applied every cascade constraint.
  if (dryRun) return;

  const ownedTables = [
    'application_events',
    'applications',
    'application_answers',
    'saved_jobs',
    'saved_searches',
    'profile_versions',
    'cv_documents',
    'notification_preferences',
    'consent_records',
    'profiles',
  ];
  for (const table of ownedTables) {
    await request(`/rest/v1/${table}?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  }

  await request(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  await request(`/rest/v1/user_deletion_requests?id=eq.${encodeURIComponent(requestRow.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'completed', completed_at: now }),
  });
}

const dueRequests = await request(`/rest/v1/user_deletion_requests?status=eq.requested&scheduled_purge_at=lte.${encodeURIComponent(now)}&select=id,user_id,scheduled_purge_at`);
let completed = 0;
for (const requestRow of dueRequests || []) {
  try {
    if (dryRun) console.log(`Dry run: would purge deletion request ${requestRow.id} for user ${requestRow.user_id}.`);
    await purgeUser(requestRow);
    completed += 1;
    console.log(`Purged deletion request ${requestRow.id}.`);
  } catch (error) {
    console.error(`Deletion request ${requestRow.id} failed: ${error.message}`);
    process.exitCode = 1;
  }
}
console.log(`${dryRun ? 'Retention purge dry run' : 'Retention purge'} complete: ${completed}/${(dueRequests || []).length} deletion requests completed.`);
