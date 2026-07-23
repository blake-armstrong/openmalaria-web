// Parse the continuous time-series output (result.cts). Unlike the survey table it
// HAS a header row and is a wide table: first column is the timestep, remaining
// columns are whatever the scenario's <continuous> block enabled (js/API.md §6).
//
// The file may be prefixed with a comment line (e.g. "##\t##"); the real header is
// the first line whose first cell is "timestep".

export interface CtsTable {
  /** Column names, in file order. columns[0] is the timestep column. */
  columns: string[];
  /** One object per timestep row, keyed by column name (numbers). */
  rows: Array<Record<string, number>>;
}

export function parseCts(cts: string): CtsTable | null {
  const lines = cts.split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  let headerIdx = lines.findIndex((l) => l.split('\t')[0]?.trim() === 'timestep');
  if (headerIdx === -1) headerIdx = 0; // fall back to first line as header

  const columns = lines[headerIdx].split('\t').map((c) => c.trim());
  const rows: Array<Record<string, number>> = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    if (cells.length < columns.length) continue;
    const row: Record<string, number> = {};
    for (let c = 0; c < columns.length; c++) row[columns[c]] = Number(cells[c]);
    rows.push(row);
  }
  return { columns, rows };
}
