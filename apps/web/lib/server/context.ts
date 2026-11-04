import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { ZodError } from 'zod';
import { assertOrigin, HttpError } from './security';

const required = ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET','APP_ORIGIN','IP_HASH_SECRET'] as const;
export function configured() { return required.every((key) => Boolean(process.env[key])); }
export function admin() {
  if (!configured()) throw new HttpError(503, 'not_configured', 'Cloud services are not configured. Use the documented local setup.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {auth:{persistSession:false,autoRefreshToken:false}});
}
export async function context(request: Request, mutation = false) {
  const db = admin();
  if (mutation) assertOrigin(request, process.env.APP_ORIGIN!);
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ') || header.length > 8192) throw new HttpError(401,'unauthorized','Sign in to continue.');
  const {data, error} = await db.auth.getUser(header.slice(7));
  if (error || !data.user) throw new HttpError(401,'unauthorized','Your session expired. Please sign in again.');
  return {db,user:data.user};
}
export function persistentUser(user: {is_anonymous?: boolean}) {
  if (user.is_anonymous !== false) throw new HttpError(403,'account_required','Create an account to access persistent history and memory.');
}
export function json(data: unknown, status = 200) { return Response.json(data,{status,headers:{'Cache-Control':'no-store'}}); }
export function failure(error: unknown) {
  if (error instanceof HttpError) return json({error:error.message,code:error.code},error.status);
  if (error instanceof ZodError) return json({error:'Invalid request fields.',code:'validation_error'},400);
  return json({error:'The service is temporarily unavailable.',code:'service_unavailable'},503);
}
export function checkDb(error: unknown) { if (error) throw new HttpError(503,'storage_unavailable','Storage is temporarily unavailable.'); }
