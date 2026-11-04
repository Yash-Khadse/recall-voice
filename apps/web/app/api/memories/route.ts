import { z } from 'zod';
import { context, persistentUser, json, failure, checkDb } from '@/lib/server/context';
import { boundedJson, HttpError } from '@/lib/server/security';
export async function GET(request: Request) {
  try {
    const {db,user}=await context(request); persistentUser(user);
    const {data,error}=await db.from('memories').select('id,type,content,confidence,importance,source,created_at,updated_at,session_id').eq('user_id',user.id).is('superseded_by',null).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('updated_at',{ascending:false}).limit(200); checkDb(error);
    return json({memories:data});
  } catch(error) {return failure(error);}
}
export async function PATCH(request: Request) {
  try {
    const {db,user}=await context(request,true); persistentUser(user);
    const body=z.object({id:z.string().uuid(),content:z.string().trim().min(1).max(4000)}).strict().parse(await boundedJson(request));
    const {data,error}=await db.from('memories').update({content:body.content,embedding:null,updated_at:new Date().toISOString(),source:'user_edit'}).eq('id',body.id).eq('user_id',user.id).select('id,content').maybeSingle(); checkDb(error);
    if (!data) throw new HttpError(404,'not_found','Memory not found.');
    return json({memory:data});
  } catch(error) {return failure(error);}
}
export async function DELETE(request: Request) {
  try {
    const {db,user}=await context(request,true); persistentUser(user);
    const {id}=z.object({id:z.string().uuid()}).strict().parse(await boundedJson(request));
    const {data,error}=await db.from('memories').delete().eq('id',id).eq('user_id',user.id).select('id').maybeSingle(); checkDb(error);
    if (!data) throw new HttpError(404,'not_found','Memory not found.');
    return json({deleted:true});
  } catch(error) {return failure(error);}
}
