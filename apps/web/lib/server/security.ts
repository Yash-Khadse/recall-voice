import { createHmac } from 'node:crypto';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function assertOrigin(request: Request, allowedOrigin: string) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(allowedOrigin).origin) {
    throw new HttpError(403, 'invalid_origin', 'Request origin is not allowed.');
  }
}

export function ipHash(request: Request, secret: string, vercel: boolean) {
  // Vercel overwrites x-vercel-forwarded-for. Never trust generic client-supplied XFF.
  const address = vercel ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : 'local-shared';
  if (!address) throw new HttpError(503, 'missing_client_address', 'Unable to validate session admission.');
  return createHmac('sha256', secret).update(address).digest('hex');
}

export async function boundedJson(request: Request, limit = 8192) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'invalid_content_type', 'Expected JSON.');
  if (Number(request.headers.get('content-length') || 0) > limit) throw new HttpError(413, 'body_too_large', 'Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'invalid_json', 'Expected a request body.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const {value, done} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, 'body_too_large', 'Request is too large.'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'invalid_json', 'Invalid JSON.');
  }
}
