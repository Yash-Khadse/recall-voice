import {z} from 'zod';
import {context,persistentUser,json,failure,checkDb} from '@/lib/server/context';
import {boundedJson,HttpError} from '@/lib/server/security';
export async function POST(request:Request){
  try{
    const {db,user}=await context(request,true);persistentUser(user);
    const body=z.object({title:z.string().min(1).max(200),content:z.string().min(1).max(16000)}).strict().parse(await boundedJson(request,65536));
    const {data,error}=await db.rpc('ingest_document',{p_user_id:user.id,p_title:body.title,p_content:body.content});
    if(error?.message.includes('session_required'))throw new HttpError(409,'session_required','Start an authenticated session before adding documents.');
    if(error?.message.includes('storage_limit'))throw new HttpError(429,'storage_limit','Document limit reached.');
    checkDb(error);return json({chunks:data});
  }catch(error){return failure(error);}
}
