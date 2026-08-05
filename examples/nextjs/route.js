// app/api/upload/route.js
//
// Receives the already-compressed file from UploadForm.jsx. The image was
// optimized client-side, so this handler just needs to accept and store it —
// no server-side image processing required.
export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  // Replace with your own storage (S3, Vercel Blob, disk, etc.)
  const bytes = await file.arrayBuffer();
  console.log(`Received ${file.name}: ${bytes.byteLength} bytes`);

  return Response.json({ ok: true, name: file.name, size: bytes.byteLength });
}
