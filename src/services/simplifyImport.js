const fieldDefinitions = [
  { key: 'fullName', label: 'Full name', aliases: ['fullname', 'name', 'candidate name', 'first and last name'] },
  { key: 'email', label: 'Email', aliases: ['email', 'email address', 'contact email'] },
  { key: 'phone', label: 'Phone', aliases: ['phone', 'phone number', 'telephone', 'mobile'] },
  { key: 'targetRole', label: 'Target role', aliases: ['targetrole', 'target role', 'desired role', 'job title', 'headline'] },
  { key: 'skills', label: 'Skills', aliases: ['skills', 'technical skills', 'core skills', 'key skills'] },
  { key: 'languages', label: 'Languages', aliases: ['languages', 'language'] },
  { key: 'timezone', label: 'Timezone', aliases: ['timezone', 'time zone'] },
  { key: 'workAuthorization', label: 'Work authorization', aliases: ['workauthorization', 'work authorization', 'visa status', 'right to work'] },
  { key: 'salaryPreference', label: 'Salary preference', aliases: ['salary', 'salary preference', 'desired salary', 'compensation'] },
  { key: 'city', label: 'City', aliases: ['city', 'location', 'current location'] },
  { key: 'country', label: 'Country', aliases: ['country', 'current country'] },
  { key: 'linkedin', label: 'LinkedIn', aliases: ['linkedin', 'linkedin url', 'linkedin profile'] },
  { key: 'portfolio', label: 'Portfolio', aliases: ['portfolio', 'portfolio url', 'website', 'personal website'] },
  { key: 'education', label: 'Education', aliases: ['education', 'academic background'] },
  { key: 'experience', label: 'Experience', aliases: ['experience', 'work experience', 'professional experience'] },
  { key: 'certifications', label: 'Certifications', aliases: ['certifications', 'certificates', 'licenses'] },
];

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function findDefinition(key) {
  const normalized = normalizeKey(key);
  return fieldDefinitions.find((definition) => definition.aliases.includes(normalized));
}

function cleanValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean).join(', ');
  return String(value ?? '').trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parsePairs(text) {
  return text.split(/\r?\n/).reduce((result, line) => {
    const match = line.match(/^\s*([^:;\t]+)\s*[:;\t]\s*(.*?)\s*$/);
    if (match) result[match[1]] = match[2];
    return result;
  }, {});
}

function flattenObject(value, result = {}) {
  if (!value || typeof value !== 'object') return result;
  Object.entries(value).forEach(([key, child]) => {
    if (child && typeof child === 'object' && !Array.isArray(child)) flattenObject(child, result);
    else result[key] = child;
  });
  return result;
}

function objectFromInput(text, filename) {
  const trimmed = text.trim();
  const extension = filename.toLowerCase().split('.').pop();
  if (extension === 'json' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const source = Array.isArray(parsed) ? Object.assign({}, ...parsed) : parsed.profile || parsed.data || parsed;
      return { values: flattenObject(source), format: 'JSON' };
    } catch {
      return { values: parsePairs(text), format: 'text', warning: 'The file looked like JSON but could not be parsed, so JobMap treated it as copied text.' };
    }
  }
  if (extension === 'csv' || text.split(/\r?\n/)[0].includes(',')) {
    const rows = parseCsv(text);
    if (rows.length > 1) {
      const headers = rows[0];
      const values = {};
      rows.slice(1).forEach((dataRow) => headers.forEach((header, index) => {
        if (dataRow[index]) values[header] = values[header] ? `${values[header]}, ${dataRow[index]}` : dataRow[index];
      }));
      return { values, format: 'CSV' };
    }
  }
  return { values: parsePairs(text), format: 'copied text' };
}

export function parseSimplifyExport(text, filename = '') {
  const { values, format, warning } = objectFromInput(text, filename);
  const mapped = [];
  const unmapped = [];
  Object.entries(values).forEach(([sourceKey, rawValue]) => {
    const value = cleanValue(rawValue);
    if (!value) return;
    const definition = findDefinition(sourceKey);
    if (definition) mapped.push({ key: definition.key, label: definition.label, value, sourceKey });
    else unmapped.push(sourceKey);
  });
  const uniqueFields = [...new Map(mapped.map((field) => [field.key, field])).values()];
  return {
    format,
    fields: uniqueFields,
    warnings: [warning, unmapped.length ? `Not imported: ${unmapped.slice(0, 4).join(', ')}${unmapped.length > 4 ? ' and more' : ''}.` : ''].filter(Boolean),
  };
}

export async function readSimplifyFile(file) {
  return parseSimplifyExport(await file.text(), file.name);
}
