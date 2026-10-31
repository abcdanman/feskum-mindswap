import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/server/session';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

const MAX_BYTES = 5 * 1024 * 1024;
const FOLDERS = new Set(['booths', 'speakers']);
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  if (!hasAdminSession(request)) {
    return json({ error: 'Admin session required.' }, 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Invalid upload.' }, 400);
  }

  const file = form.get('file');
  const folder = String(form.get('folder') || 'booths');
  if (!(file instanceof File) || !file.size) {
    return json({ error: 'Choose an image to upload.' }, 400);
  }
  if (!FOLDERS.has(folder)) {
    return json({ error: 'Invalid upload folder.' }, 400);
  }
  if (file.size > MAX_BYTES) {
    return json({ error: 'Image must be 5 MB or smaller.' }, 400);
  }
  const ext = MIME_EXT[file.type];
  if (!ext) {
    return json({ error: 'Use a JPG, PNG, WEBP, or GIF image.' }, 400);
  }

  const path = `${folder}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await getSupabaseAdmin().storage.from('booth-images').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    console.error('upload:', error.message);
    return json({ error: 'Could not upload that image.' }, 500);
  }
  const { data } = getSupabaseAdmin().storage.from('booth-images').getPublicUrl(path);
  return json({ url: data.publicUrl });
}
