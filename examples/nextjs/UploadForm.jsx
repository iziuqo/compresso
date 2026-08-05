'use client';

import { useState } from 'react';
import { compress, formatBytes } from 'compresso.js';

// App Router client component: compress an image in the browser, then upload
// the result to a route handler (e.g. app/api/upload/route.js) instead of
// the original file.
export default function UploadForm() {
  const [status, setStatus] = useState('idle'); // idle | compressing | uploading | done | error
  const [result, setResult] = useState(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('compressing');
    const optimized = await compress(file, {
      quality: 0.8,
      maxWidth: 1920,
      format: 'webp',
      maxSizeMB: 2,
    });
    setResult(optimized);

    setStatus('uploading');
    const body = new FormData();
    body.append('file', optimized.file);

    const res = await fetch('/api/upload', { method: 'POST', body });
    setStatus(res.ok ? 'done' : 'error');
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>Compresso — Next.js App Router Upload</h1>

      <input type="file" accept="image/*" onChange={handleFile} disabled={status === 'compressing' || status === 'uploading'} />

      {status === 'compressing' && <p>Optimizing...</p>}
      {status === 'uploading' && <p>Uploading...</p>}
      {status === 'error' && <p>Upload failed.</p>}

      {result && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: 8 }}>
            <p><strong>Original:</strong> {formatBytes(result.originalSize)}</p>
            <p><strong>Optimized:</strong> {formatBytes(result.compressedSize)}</p>
            <p><strong>Reduction:</strong> {result.savings}%</p>
          </div>
          {status === 'done' && <p>Uploaded {result.file.name}.</p>}
        </div>
      )}
    </div>
  );
}
