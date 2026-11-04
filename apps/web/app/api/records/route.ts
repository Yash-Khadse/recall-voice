import {z} from 'zod';
import {context,persistentUser,json,failure,checkDb} from '@/lib/server/context';
import {boundedJson,HttpError} from '@/lib/server/security';
const kind=z.enum(['notes','tasks','reminders']);
export async function GET(request:Request){
 try{const {db,user}=await context(request);persistentUser(user);const result:Record<string,unknown>={};
 for(const table of kind.options){const {data,error}=await db.from(table).select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);checkDb(error);result[table]=data;}return json(result);
 }catch(error){return failure(error);}
}
export async function PATCH(request:Request){
 try{const {db,user}=await context(request,true);persistentUser(user);const body=z.object({kind,id:z.string().uuid(),content:z.string().min(1).max(4000).optional(),status:z.enum(['pending','done','delivered']).optional()}).strict().parse(await boundedJson(request));
 if(body.status&&((body.kind==='tasks'&&body.status==='delivered')||(body.kind==='reminders'&&body.status==='done')||body.kind==='notes'))throw new HttpError(400,'invalid_status','Invalid status for this record type.');
 const patch={...(body.content!==undefined?{content:body.content}:{}),...(body.status?{status:body.status}:{}),updated_at:new Date().toISOString()};
 const {data,error}=await db.from(body.kind).update(patch).eq('id',body.id).eq('user_id',user.id).select('*').maybeSingle();checkDb(error);if(!data)throw new HttpError(404,'not_found','Record not found.');return json({record:data});
 }catch(error){return failure(error);}
}
export async function DELETE(request:Request){
 try{const {db,user}=await context(request,true);persistentUser(user);const body=z.object({kind,id:z.string().uuid()}).strict().parse(await boundedJson(request));const {data,error}=await db.from(body.kind).delete().eq('id',body.id).eq('user_id',user.id).select('id').maybeSingle();checkDb(error);if(!data)throw new HttpError(404,'not_found','Record not found.');return json({deleted:true});
 }catch(error){return failure(error);}
}
