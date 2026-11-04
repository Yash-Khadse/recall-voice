import { z } from 'zod';
import { context,persistentUser,json,failure,checkDb } from '@/lib/server/context';
export async function GET(request: Request) {
  try {
    const {db,user}=await context(request); persistentUser(user);
    const sessionId=new URL(request.url).searchParams.get('sessionId');
    if(sessionId) {
      const id=z.string().uuid().parse(sessionId);
      const {data,error}=await db.from('messages').select('id,session_id,role,content,created_at').eq('user_id',user.id).eq('session_id',id).order('created_at').limit(300); checkDb(error); return json({messages:data});
    }
    const {data,error}=await db.from('sessions').select('id,language,mode,created_at,expires_at,ended_at').eq('user_id',user.id).eq('mode','authenticated').order('created_at',{ascending:false}).limit(100); checkDb(error);
    return json({sessions:data});
  } catch(error) {return failure(error);}
}
