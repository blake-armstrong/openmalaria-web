export function ValidateResult({ ms }: { ms: number }) {
  return (
    <div className="validate-result">
      <p className="validate-ok">✓ Valid — schema check and model graph build passed</p>
      <p className="note">{(ms / 1000).toFixed(2)}s</p>
    </div>
  );
}
