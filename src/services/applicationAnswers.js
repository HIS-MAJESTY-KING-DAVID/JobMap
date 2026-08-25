const ANSWERS_KEY = 'jobmap.applicationAnswers.v1';

function readAnswers() {
  try {
    const value = window.localStorage.getItem(ANSWERS_KEY);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function writeAnswers(value) {
  try {
    window.localStorage.setItem(ANSWERS_KEY, JSON.stringify(value));
  } catch {
    // Private or restricted browsing contexts may deny local storage.
  }
}

export function getLearnedApplicationAnswers() {
  return readAnswers();
}

export function rememberApplicationAnswer(key, value, source = 'user-confirmed') {
  if (!key || !value?.trim()) return readAnswers();
  const answers = readAnswers();
  const previous = answers[key] || { confirmations: 0 };
  const next = {
    ...answers,
    [key]: {
      value: value.trim(),
      confirmations: previous.confirmations + 1,
      source,
      updatedAt: new Date().toISOString(),
    },
  };
  writeAnswers(next);
  return next;
}

export function forgetApplicationAnswer(key) {
  const answers = readAnswers();
  delete answers[key];
  writeAnswers(answers);
  return answers;
}
