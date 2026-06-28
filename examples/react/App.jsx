import { useState } from 'react';
import { compress, formatBytes } from 'compressojs';

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const optimized = await compress(file, {
      quality: 0.8,
      maxWidth: 1920,
      format: 'webp',
      maxSizeMB: 2,
    });
    setResult(optimized);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>Compresso — React Example</h1>

      <input type="file" accept="image/*" onChange={handleFile} />

      {loading && <p>Optimizing...</p>}

      {result && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: 8 }}>
            <p><strong>Original:</strong> {formatBytes(result.originalSize)}</p>
            <p><strong>Optimized:</strong> {formatBytes(result.compressedSize)}</p>
            <p><strong>Reduction:</strong> {result.savings}%</p>
            <p><strong>Dimensions:</strong> {result.width} × {result.height}</p>
          </div>
          <img
            src={result.url}
            alt="Optimized"
            style={{ maxWidth: '100%', borderRadius: 8, marginTop: '0.5rem' }}
          />
        </div>
      )}
    </div>
  );
}
