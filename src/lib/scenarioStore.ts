// Simple localStorage-backed CRUD for scenario XML documents. No accounts,
// no server — a named list that survives page reloads on the same browser.

export interface StoredScenario {
  id: string;
  name: string;
  xml: string;
  updatedAt: number;
}

const KEY = 'openmalaria-web.scenarios.v1';
const LAST_OPEN_KEY = 'openmalaria-web.lastOpenId.v1';

function readAll(): StoredScenario[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(scenarios: StoredScenario[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(scenarios));
  } catch (err) {
    console.error('Failed to save scenarios to localStorage', err);
  }
}

export function listScenarios(): StoredScenario[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getScenario(id: string): StoredScenario | undefined {
  return readAll().find((s) => s.id === id);
}

export function createScenario(name: string, xml: string): StoredScenario {
  const scenario: StoredScenario = {
    id: crypto.randomUUID(),
    name,
    xml,
    updatedAt: Date.now(),
  };
  writeAll([...readAll(), scenario]);
  return scenario;
}

export function saveScenario(id: string, xml: string): void {
  writeAll(readAll().map((s) => (s.id === id ? { ...s, xml, updatedAt: Date.now() } : s)));
}

export function renameScenario(id: string, name: string): void {
  writeAll(readAll().map((s) => (s.id === id ? { ...s, name, updatedAt: Date.now() } : s)));
}

export function duplicateScenario(id: string): StoredScenario | undefined {
  const source = getScenario(id);
  if (!source) return undefined;
  return createScenario(`${source.name} (copy)`, source.xml);
}

export function deleteScenario(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}

export function getLastOpenId(): string | null {
  try {
    return localStorage.getItem(LAST_OPEN_KEY);
  } catch {
    return null;
  }
}

export function setLastOpenId(id: string): void {
  try {
    localStorage.setItem(LAST_OPEN_KEY, id);
  } catch {
    // ignore — non-critical convenience state
  }
}
