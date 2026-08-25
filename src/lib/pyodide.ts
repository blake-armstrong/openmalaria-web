// Lazily-created singleton Pyodide (Python-in-the-browser) engine backing the
// results Charts/Table/Explore tabs (see components/PyResults.tsx). All data
// wrangling and rendering for those tabs happens in Python via pandas +
// matplotlib; this module just gets Python running and exposes typed JS
// wrappers around a handful of Python functions.
//
// Self-hosted, not CDN-loaded: Pyodide core + the pandas/matplotlib wheel
// closure (~32MB total) live under public/pyodide/ (gitignored, regenerate
// with `npm run fetch:pyodide`), matching the "no external runtime
// dependency" principle already applied to openmalaria-wasm.
import { loadPyodide, type PyodideAPI } from 'pyodide';
import type { SurveyRow } from './parseSurvey';
import type { CtsTable } from './parseCts';
import { labelFor } from './measures';

let enginePromise: Promise<PyodideAPI> | null = null;

// Defined once, right after packages load. Referencing survey_df/cts_df by
// name (rather than as closures) means loadResultTables only needs to
// reassign those two globals on each run — the functions below pick up the
// new data automatically since Python looks up globals at call time.
const PREAMBLE = `
import io, json, base64, traceback
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd

survey_df = pd.DataFrame()
cts_df = None

def _fig_to_b64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=130, bbox_inches='tight')
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode('ascii')

def _fmt(n):
    try:
        n = float(n)
    except (TypeError, ValueError):
        return str(n)
    if n != n:
        return '—'
    if n == int(n) and abs(n) < 1e15:
        return f'{int(n):,}'
    a = abs(n)
    if a != 0 and (a < 1e-3 or a >= 1e6):
        return f'{n:.3e}'
    return f'{n:,.4g}'

def render_measure_chart(measure_id, label, is_vector, max_series=8):
    sub = survey_df[survey_df['measureId'] == measure_id]
    pivot = sub.pivot_table(index='survey', columns='ageGroup', values='value', aggfunc='mean')
    pivot = pivot.iloc[:, :max_series]
    kind = 'species' if is_vector else 'age group'
    pivot.columns = [f'{kind} {c}' for c in pivot.columns]
    fig, ax = plt.subplots(figsize=(7.5, 4))
    pivot.plot(ax=ax, marker='o', markersize=3, linewidth=1.4)
    ax.set_xlabel('survey')
    ax.set_ylabel(label)
    ax.set_title(label)
    ax.grid(alpha=0.3)
    if len(pivot.columns) > 1:
        ax.legend(fontsize=8, loc='center left', bbox_to_anchor=(1, 0.5))
    elif ax.get_legend() is not None:
        ax.get_legend().remove()
    return _fig_to_b64(fig)

def render_cts_chart(columns_json):
    cols = json.loads(columns_json)
    fig, ax = plt.subplots(figsize=(7.5, 4))
    for c in cols:
        ax.plot(cts_df['timestep'], cts_df[c], linewidth=1.4, label=c)
    ax.set_xlabel('timestep')
    ax.grid(alpha=0.3)
    ax.legend(fontsize=8)
    return _fig_to_b64(fig)

def render_table(measure_filter_json, sort_key, sort_dir, page, page_size=50):
    filt = json.loads(measure_filter_json)
    df = survey_df if filt is None else survey_df[survey_df['measureId'] == filt]
    df = df.sort_values(sort_key, ascending=(int(sort_dir) == 1), kind='stable')
    total = len(df)
    start = int(page) * page_size
    page_df = df.iloc[start:start + page_size]
    rows = []
    for r in page_df.itertuples(index=False):
        rows.append(
            '<tr>'
            f'<td class="num mono">{r.survey}</td>'
            f'<td class="num mono">{r.ageGroup}</td>'
            f'<td class="num mono">{r.cohort}</td>'
            f'<td class="num mono">{r.genotype}</td>'
            f'<td>{r.measureLabel} <span class="muted-id mono">#{r.measureId}</span></td>'
            f'<td class="num mono">{_fmt(r.value)}</td>'
            '</tr>'
        )
    return json.dumps({'rowsHtml': ''.join(rows), 'total': int(total)})

def export_csv(measure_filter_json):
    filt = json.loads(measure_filter_json)
    df = survey_df if filt is None else survey_df[survey_df['measureId'] == filt]
    out = df[['survey', 'genotype', 'cohort', 'ageGroup', 'measureId', 'measureLabel', 'value']]
    out = out.rename(columns={'measureLabel': 'measure'})
    return out.to_csv(index=False)

def run_explore(code):
    ns = globals()
    plt.close('all')
    try:
        import ast
        tree = ast.parse(code, mode='exec')
        last_expr = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            last_expr = tree.body.pop()
        exec(compile(tree, '<explore>', 'exec'), ns)
        value = None
        if last_expr is not None:
            value = eval(compile(ast.Expression(last_expr.value), '<explore>', 'eval'), ns)
    except Exception as e:
        plt.close('all')
        msg = ''.join(traceback.format_exception_only(type(e), e)).strip()
        return json.dumps({'kind': 'error', 'message': msg})

    if plt.get_fignums():
        png = _fig_to_b64(plt.gcf())
        return json.dumps({'kind': 'image', 'image': png})

    if isinstance(value, pd.DataFrame):
        html = value.to_html(index=True, classes='data-table', border=0)
        return json.dumps({'kind': 'table', 'html': html, 'rows': len(value)})
    if isinstance(value, pd.Series):
        html = value.to_frame(name=value.name or 'value').to_html(classes='data-table', border=0)
        return json.dumps({'kind': 'table', 'html': html, 'rows': len(value)})
    if value is not None:
        return json.dumps({'kind': 'text', 'text': repr(value)})
    return json.dumps({'kind': 'none'})
`;

async function initEngine(): Promise<PyodideAPI> {
  const indexURL = `${import.meta.env.BASE_URL}pyodide/`;
  const pyodide = await loadPyodide({ indexURL });
  await pyodide.loadPackage(['pandas', 'matplotlib']);
  await pyodide.runPythonAsync(PREAMBLE);
  return pyodide;
}

function getEngine(): Promise<PyodideAPI> {
  if (!enginePromise) enginePromise = initEngine();
  return enginePromise;
}

// All Python calls share one interpreter/global namespace, so they must run
// one at a time — same StrictMode-double-invoke hazard as the earlier DuckDB
// integration (two concurrent loadResultTables() calls could interleave
// their globals assignments), fixed the same way: a chained queue.
let opChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(op: () => Promise<T>): Promise<T> {
  const result = opChain.then(op, op);
  opChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** Calls a top-level Python function by name and destroys the fetched PyProxy afterwards. */
function callPy<T>(pyodide: PyodideAPI, name: string, ...args: unknown[]): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn: any = pyodide.globals.get(name);
  try {
    return fn(...args) as T;
  } finally {
    fn.destroy();
  }
}

interface SurveyRowWithLabel extends SurveyRow {
  measureLabel: string;
}

/**
 * (Re-)assigns the `survey_df`/`cts_df` Python globals from a run's parsed
 * output. Called once per run result, when the results view first needs
 * Python (Charts is the default tab) and whenever rows/cts change.
 */
export function loadResultTables(rows: SurveyRow[], cts: CtsTable | null): Promise<void> {
  return enqueue(async () => {
    const pyodide = await getEngine();
    const labeled: SurveyRowWithLabel[] = rows.map((r) => ({ ...r, measureLabel: labelFor(r.measureId) }));
    pyodide.globals.set('__survey_json', JSON.stringify(labeled));
    pyodide.globals.set('__cts_json', cts && cts.rows.length > 0 ? JSON.stringify(cts.rows) : null);
    await pyodide.runPythonAsync(`
survey_df = pd.DataFrame(json.loads(__survey_json))
cts_df = pd.DataFrame(json.loads(__cts_json)) if __cts_json is not None else None
`);
  });
}

export function renderMeasureChart(measureId: number, label: string, isVector: boolean): Promise<string> {
  return enqueue(async () => {
    const pyodide = await getEngine();
    return callPy<string>(pyodide, 'render_measure_chart', measureId, label, isVector);
  });
}

export function renderCtsChart(columns: string[]): Promise<string> {
  return enqueue(async () => {
    const pyodide = await getEngine();
    return callPy<string>(pyodide, 'render_cts_chart', JSON.stringify(columns));
  });
}

export interface TablePage {
  rowsHtml: string;
  total: number;
}

export function renderTable(measureFilter: number | null, sortKey: string, sortDir: 1 | -1, page: number): Promise<TablePage> {
  return enqueue(async () => {
    const pyodide = await getEngine();
    const raw = callPy<string>(pyodide, 'render_table', JSON.stringify(measureFilter), sortKey, sortDir, page);
    return JSON.parse(raw) as TablePage;
  });
}

export function exportCsv(measureFilter: number | null): Promise<string> {
  return enqueue(async () => {
    const pyodide = await getEngine();
    return callPy<string>(pyodide, 'export_csv', JSON.stringify(measureFilter));
  });
}

export type ExploreResult =
  | { kind: 'image'; image: string }
  | { kind: 'table'; html: string; rows: number }
  | { kind: 'text'; text: string }
  | { kind: 'error'; message: string }
  | { kind: 'none' };

export function runExplore(code: string): Promise<ExploreResult> {
  return enqueue(async () => {
    const pyodide = await getEngine();
    const raw = callPy<string>(pyodide, 'run_explore', code);
    return JSON.parse(raw) as ExploreResult;
  });
}
