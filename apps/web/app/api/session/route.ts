import { AccessToken, AgentDispatchClient, RoomServiceClient } from 'livekit-server-sdk';
import { z } from 'zod';
import { context, failure, json, checkDb } from '@/lib/server/context';
import { boundedJson, ipHash, HttpError } from '@/lib/server/security';
const schema = z.object({language:z.enum(['auto','en','hi','te']),memoryConsent:z.boolean()}).strict();
export async function POST(request: Request) {
  try {
    const {db,user} = await context(request,true);
    const body = schema.parse(await boundedJson(request));
    const {data,error} = await db.rpc('admit_session',{p_user_id:user.id,p_ip_hash:ipHash(request,process.env.IP_HASH_SECRET!,process.env.VERCEL==='1'),p_language:body.language,p_memory_consent:body.memoryConsent});
    if (error) {
      if (/concurrency_limit|frequency_limit|monthly_limit/.test(error.message)) throw new HttpError(429,'quota_exhausted','Demo capacity is reached. Please try again later or use local mode.');
      checkDb(error);
    }
    const session = Array.isArray(data)?data[0]:data;
    if (!session?.id) throw new HttpError(503,'admission_failed','Unable to start a session.');
    try {
      const token = new AccessToken(process.env.LIVEKIT_API_KEY!,process.env.LIVEKIT_API_SECRET!,{identity:user.id,ttl:60,metadata:JSON.stringify({sessionId:session.id})});
      token.addGrant({roomJoin:true,room:session.room_name,canPublish:true,canSubscribe:true,canPublishData:true,canUpdateOwnMetadata:false});
      const dispatch = new AgentDispatchClient(process.env.LIVEKIT_URL!,process.env.LIVEKIT_API_KEY!,process.env.LIVEKIT_API_SECRET!);
      await dispatch.createDispatch(session.room_name,'recall-voice',{metadata:JSON.stringify({sessionId:session.id})});
      return json({sessionId:session.id,token:await token.toJwt(),url:process.env.LIVEKIT_URL,expiresAt:session.expires_at,mode:session.mode});
    } catch (cause) {
      // Log the class of failure only (no tokens, user ids or content) so operators can diagnose.
      console.error('session_dispatch_failed', cause instanceof Error ? cause.name : typeof cause, cause instanceof Error ? cause.message.slice(0,200) : '');
      await db.from('sessions').update({ended_at:new Date().toISOString()}).eq('id',session.id).eq('user_id',user.id);
      throw new HttpError(503,'agent_unavailable','The voice agent could not be reached. Please try again in a moment.');
    }
  } catch(error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    const {db,user}=await context(request,true);
    const {sessionId}=z.object({sessionId:z.string().uuid()}).strict().parse(await boundedJson(request));
    const {data,error}=await db.from('sessions').select('id,room_name').eq('id',sessionId).eq('user_id',user.id).maybeSingle(); checkDb(error);
    if (!data) throw new HttpError(404,'not_found','Session not found.');
    // Persist termination first; the worker independently checks it even if LiveKit is down.
    checkDb((await db.from('sessions').update({ended_at:new Date().toISOString()}).eq('id',sessionId).eq('user_id',user.id)).error);
    try { await new RoomServiceClient(process.env.LIVEKIT_URL!,process.env.LIVEKIT_API_KEY!,process.env.LIVEKIT_API_SECRET!).deleteRoom(data.room_name); } catch { /* durable termination remains authoritative */ }
    return json({ended:true});
  } catch(error) {return failure(error);}
}
