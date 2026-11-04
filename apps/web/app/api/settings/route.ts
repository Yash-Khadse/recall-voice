import { z } from 'zod';
import { context,persistentUser,json,failure,checkDb } from '@/lib/server/context';
import { boundedJson } from '@/lib/server/security';
const schema=z.object({language:z.enum(['auto','en','hi','te']),memoryConsent:z.boolean(),theme:z.enum(['light','dark','system']),voicePreference:z.string().max(100)}).strict();
export async function GET(request: Request) {
  try {
    const {db,user}=await context(request); persistentUser(user);
    const {data,error}=await db.from('user_settings').select('*').eq('user_id',user.id).maybeSingle(); checkDb(error);
    return json({language:data?.language??'auto',memoryConsent:data?.memory_consent??false,theme:data?.theme??'system',voicePreference:data?.voice_preference??'browser'});
  } catch(error) {return failure(error);}
}
export async function PUT(request: Request) {
  try {
    const {db,user}=await context(request,true); persistentUser(user);
    const body=schema.parse(await boundedJson(request));
    checkDb((await db.from('user_settings').upsert({user_id:user.id,language:body.language,memory_consent:body.memoryConsent,theme:body.theme,voice_preference:body.voicePreference})).error);
    return json(body);
  } catch(error) {return failure(error);}
}
