import { useRef, useState } from 'react';
import type { Example } from '../scenarios';

interface Props {
  examples: Example[];
  selectedId: string | null;
  uploadedName: string | null;
  disabled: boolean;
  onSelectExample: (id: string) => void;
  onUpload: (name: string, xml: string) => void;
}

export function ScenarioPicker({ examples, selectedId, uploadedName, disabled, onSelectExample, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
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
    onUpload(file.name, text);
  }

  return (
    <section className="picker">
      <p className="eyebrow">Scenario</p>

      <ul className="example-list">
        {examples.map((ex) => {
          const on = selectedId === ex.id;
          return (
            <li key={ex.id}>
              <button
                type="button"
                className={`example ${on ? 'example-on' : ''}`}
                onClick={() => onSelectExample(ex.id)}
                disabled={disabled}
                aria-pressed={on}
              >
                <span className="example-top">
                  <span className="example-name">{ex.name}</span>
                  <span className={`tag tag-${ex.tag}`}>{ex.tag}</span>
                </span>
                <span className="example-blurb">{ex.blurb}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="picker-or">
        <span>or bring your own</span>
      </div>

      <div
        className={`dropzone ${dragging ? 'dropzone-drag' : ''} ${uploadedName ? 'dropzone-loaded' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          const f = e.dataTransfer.files[0];
          if (f) void ingest(f);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void ingest(f);
            e.target.value = '';
          }}
        />
        {uploadedName ? (
          <span className="dropzone-file mono">{uploadedName}</span>
        ) : (
          <span className="dropzone-hint">
            Drop a schema-49 <code>.xml</code> here, or click to browse
          </span>
        )}
      </div>
      {uploadError && <p className="field-error">{uploadError}</p>}
    </section>
  );
}
