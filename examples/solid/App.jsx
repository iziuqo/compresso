import { createSignal, Show } from 'solid-js';
import { compress, formatBytes } from 'compresso.js';

export default function App() {
  const [result, setResult] = createSignal(null);
  const [loading, setLoading] = createSignal(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const optimized = await compress(file, {
        quality: 0.8,
        maxWidth: 1920,
        format: 'webp',
        maxSizeMB: 2,
      });
      const previous = result();
      if (previous) URL.revokeObjectURL(previous.url);
      setResult(optimized);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 'max-width': '600px', margin: '2rem auto', 'font-family': 'system-ui' }}>
      <h1>Compresso — Solid Example</h1>

      <input type="file" accept="image/*" onChange={handleFile} />

      <Show when={loading()}>
        <p>Optimizing...</p>
      </Show>

      <Show when={result()} keyed>
        {(res) => (
          <div style={{ 'margin-top': '1rem' }}>
            <div style={{ background: '#f3f4f6', padding: '1rem', 'border-radius': '8px' }}>
              <p><strong>Original:</strong> {formatBytes(res.originalSize)}</p>
              <p><strong>Optimized:</strong> {formatBytes(res.compressedSize)}</p>
              <p><strong>Reduction:</strong> {res.savings}%</p>
              <p><strong>Dimensions:</strong> {res.width} × {res.height}</p>
            </div>
            <img
              src={res.url}
              alt="Optimized"
              style={{ 'max-width': '100%', 'border-radius': '8px', 'margin-top': '0.5rem' }}
            />
          </div>
        )}
      </Show>
    </div>
  );
}
