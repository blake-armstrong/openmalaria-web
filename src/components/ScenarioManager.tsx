import { useRef, useState } from 'react';
import type { StoredScenario } from '../lib/scenarioStore';
import { DEFAULT_TEMPLATE_ID, TEMPLATES } from '../scenarios/templates';
import { downloadText } from '../lib/download';

interface Props {
  scenarios: StoredScenario[];
  selected: StoredScenario | null;
  dirty: boolean;
  disabled: boolean;
  creatingTemplate: boolean;
  templateError: string | null;
  onSelect: (id: string) => void;
  onNew: (templateId: string) => void;
  onSave: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpload: (name: string, xml: string) => void;
}

export function ScenarioManager({
  scenarios,
  selected,
  dirty,
  disabled,
  creatingTemplate,
  templateError,
  onSelect,
  onNew,
  onSave,
  onRename,
  onDuplicate,
  onDelete,
  onUpload,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [newTemplate, setNewTemplate] = useState(DEFAULT_TEMPLATE_ID);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function ingest(file: File) {
    setUploadError(null);
    if (!/\.xml$/i.test(file.name)) {
      setUploadError('Please choose an .xml scenario file.');
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      setUploadError('That file is empty.');
      return;
    }
    onUpload(file.name.replace(/\.xml$/i, ''), text);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <p className="eyebrow">Scenarios</p>
      </div>

      <ul className="scenario-list">
        {scenarios.length === 0 && <li className="scenario-empty">No saved scenarios yet.</li>}
        {scenarios.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={`scenario-item ${selected?.id === s.id ? 'scenario-item-on' : ''}`}
              onClick={() => onSelect(s.id)}
              disabled={disabled}
            >
              {s.name}
            </button>
          </li>
        ))}
      </ul>

      <div className="scenario-new">
        <select
          className="select"
          value={newTemplate}
          onChange={(e) => setNewTemplate(e.target.value)}
          disabled={disabled || creatingTemplate}
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => onNew(newTemplate)} disabled={disabled || creatingTemplate}>
          {creatingTemplate ? 'Loading…' : 'New from template'}
        </button>
      </div>
      {templateError && <p className="field-error">{templateError}</p>}

      {selected && (
        <>
          <label className="field">
            <span className="field-label">Name</span>
            <input
              className="input"
              value={selected.name}
              onChange={(e) => onRename(e.target.value)}
              disabled={disabled}
            />
          </label>
          <div className="scenario-actions">
            <button className="btn btn-primary" onClick={onSave} disabled={disabled || !dirty}>
              {dirty ? 'Save*' : 'Saved'}
            </button>
            <button className="btn" onClick={onDuplicate} disabled={disabled}>
              Duplicate
            </button>
            <button className="btn" onClick={onDelete} disabled={disabled}>
              Delete
            </button>
            <button
              className="btn"
              onClick={() => downloadText(`${selected.name || 'scenario'}.xml`, selected.xml, 'text/xml')}
              disabled={disabled}
            >
              Download .xml
            </button>
          </div>
        </>
      )}

      <div className="scenario-upload">
        <input
          ref={fileInput}
          type="file"
          accept=".xml,text/xml,application/xml"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void ingest(f);
            e.target.value = '';
          }}
        />
        <button className="btn" onClick={() => fileInput.current?.click()} disabled={disabled}>
          Upload .xml…
        </button>
        {uploadError && <p className="field-error">{uploadError}</p>}
      </div>
    </section>
  );
}
