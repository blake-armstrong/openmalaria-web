import { useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView, hoverTooltip } from '@codemirror/view';
import { xml } from '@codemirror/lang-xml';
import { foldEffect, foldNodeProp, syntaxTree, unfoldAll } from '@codemirror/language';
import { linter, lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import type { XmlValidationError } from '../lib/parseValidationErrors';
import { wikiLinkFor, wikiUrl } from '../lib/wikiLinks';

// Hovering an element's tag name (e.g. the "demography" in <demography ...>)
// shows a small tooltip linking to that element's section in the OpenMalaria
// wiki, for tags we have a curated mapping for (see lib/wikiLinks.ts).
const wikiHover = hoverTooltip((view, pos) => {
  const tree = syntaxTree(view.state);
  let node = tree.resolveInner(pos, 1);
  if (node.name !== 'TagName') node = tree.resolveInner(pos, -1);
  if (node.name !== 'TagName') return null;
  const tagName = view.state.sliceDoc(node.from, node.to);
  const link = wikiLinkFor(tagName);
  if (!link) return null;
  return {
    pos: node.from,
    end: node.to,
    above: true,
    create() {
      const dom = document.createElement('div');
      dom.className = 'cm-wiki-tooltip';
      const a = document.createElement('a');
      a.href = wikiUrl(link);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = `📖 ${link.label} ↗`;
      dom.appendChild(a);
      return { dom };
    },
  };
});

// No continuous linting source — diagnostics are only ever pushed in
// imperatively (via the `errors` prop, from a Validate/Run failure). The
// linter() extension still needs to be present for setDiagnostics() to have
// somewhere to store them; its own source just reports "nothing new".
const extensions = [xml(), linter(() => []), lintGutter(), wikiHover];

// The built-in foldAll() only folds each top-level element and skips past
// its contents entirely, so it never records fold state for the elements
// nested inside — collapsing "everything" and then re-expanding just the
// root leaves you with everything else flattened out too. Walk the whole
// syntax tree instead so every element gets its own fold entry; expanding
// one parent then reveals its children still individually collapsed.
function foldEverything(view: EditorView): boolean {
  const { state } = view;
  const tree = syntaxTree(state);
  const effects: ReturnType<typeof foldEffect.of>[] = [];
  tree.iterate({
    enter: (node) => {
      const prop = node.type.prop(foldNodeProp);
      if (!prop) return;
      const range = prop(node.node, state);
      if (range && range.from < range.to) effects.push(foldEffect.of(range));
    },
  });
  if (effects.length) view.dispatch({ effects });
  return effects.length > 0;
}

function toDiagnostics(view: EditorView, errors: XmlValidationError[]): Diagnostic[] {
  const doc = view.state.doc;
  const out: Diagnostic[] = [];
  for (const err of errors) {
    if (err.line < 1 || err.line > doc.lines) continue;
    const line = doc.line(err.line);
    const from = Math.min(line.from + Math.max(0, err.col - 1), line.to);
    out.push({ from, to: line.to > from ? line.to : from + 1, severity: 'error', message: err.message });
  }
  return out;
}

export function XmlEditor({
  value,
  onChange,
  readOnly,
  errors,
}: {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  errors?: XmlValidationError[];
}) {
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const diagnostics = errors && errors.length > 0 ? toDiagnostics(view, errors) : [];
    view.dispatch(setDiagnostics(view.state, diagnostics));
    if (diagnostics.length > 0) {
      view.dispatch({ effects: EditorView.scrollIntoView(diagnostics[0].from, { y: 'center' }) });
    }
  }, [errors]);

  return (
    <div>
      <div className="editor-toolbar">
        <button className="btn" onClick={() => viewRef.current && unfoldAll(viewRef.current)}>
          Expand all
        </button>
        <button className="btn" onClick={() => viewRef.current && foldEverything(viewRef.current)}>
          Collapse all
        </button>
      </div>
      <CodeMirror
        value={value}
        height="60vh"
        extensions={extensions}
        onChange={onChange}
        readOnly={readOnly}
        basicSetup={{ lineNumbers: true, bracketMatching: true, foldGutter: true }}
        onCreateEditor={(view) => {
          viewRef.current = view;
        }}
      />
    </div>
  );
}
