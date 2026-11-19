const KEY = 'stolarnia_token';
let token = null;
try {
  token = localStorage.getItem(KEY);
} catch {
  token = null;
}

export const getToken = () => token;

export function setToken(t) {
  token = t;
  try {
    if (t) localStorage.setItem(KEY, t);
    else localStorage.removeItem(KEY);
  } catch {
    /* brak dostępu do localStorage – token zostaje tylko w pamięci */
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Błąd serwera (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Szkic konfiguracji niezalogowanego użytkownika – żeby nie zgubić pracy przy logowaniu.
export function writeDraft(type, config) {
  try {
    sessionStorage.setItem(`draft:${type}`, JSON.stringify(config));
  } catch {
    /* ignoruj */
  }
}

export function readDraft(type) {
  try {
    const raw = sessionStorage.getItem(`draft:${type}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft(type) {
  try {
    sessionStorage.removeItem(`draft:${type}`);
  } catch {
    /* ignoruj */
  }
}
