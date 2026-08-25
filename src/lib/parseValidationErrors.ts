// OpenMalaria's XSD validator (Xerces-C) emits stderr lines shaped like
// `:<line>:<col> error: <message>` (the leading colon stands in for a
// filename it doesn't bother printing, since the file only ever exists in
// wasm's in-memory FS). Pull those out so the editor can point at the exact
// spot that failed, instead of just showing the raw log.
const LINE_RE = /^:(\d+):(\d+)\s+error:\s*(.*)$/;

export interface XmlValidationError {
  line: number; // 1-based
  col: number; // 1-based
  message: string;
}

export function parseValidationErrors(stderr: string[]): XmlValidationError[] {
  const errors: XmlValidationError[] = [];
  for (const raw of stderr) {
    const m = LINE_RE.exec(raw.trim());
    if (!m) continue;
    errors.push({ line: Number(m[1]), col: Number(m[2]), message: m[3] });
  }
  return errors;
}
