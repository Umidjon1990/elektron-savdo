import type {RequestHandler} from 'express';
import {subscriptionState} from '@shared/subscription';
/** Authentication runs first. Expired accounts may inspect/renew their own
 * session, but may not read business APIs or write through a stale browser. */
export function subscriptionGate(getTenant:(id:string)=>Promise<any>,clock=()=>Date.now()):RequestHandler{
  return async(req,res,next)=>{
    try{
      if(req.user?.isSuper)return next();
      if(!req.tenantId)return res.status(403).json({error:'Do‘kon belgilanmagan',expired:true});
      const tenant=await getTenant(req.tenantId);
      if(!tenant)return res.status(403).json({error:'Do‘kon topilmadi',expired:true});
      const state=subscriptionState(tenant,clock());
      const introspection=req.method==='GET'&&['/api/auth/me','/api/auth/subscription'].includes(req.path);
      if(state.blocked&&!introspection)return res.status(403).json({error:state.suspended?'Do‘koningiz to‘xtatilgan. Admin bilan bog‘laning.':'Obuna muddati tugagan. To‘lov qiling va admin bilan bog‘laning.',expired:true,subscription:state});
      next();
    }catch(error){next(error);}
  };
}
