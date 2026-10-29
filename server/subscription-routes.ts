import type {Express,RequestHandler} from 'express';
import {subscriptionState} from '@shared/subscription';
export function tenantSession(tenant:any) {
  if(!tenant)return null;
  return {id:tenant.id,slug:tenant.slug,name:tenant.name,logo:tenant.logo,brandColor:tenant.brandColor,
    plan:tenant.plan,status:tenant.status,trialEnd:tenant.trialEnd,subscriptionDays:tenant.subscriptionDays,
    telegramBotToken:!!tenant.telegramBotToken,telegramChatId:!!tenant.telegramChatId};
}
export function registerSubscriptionRoutes(app:Express,deps:{auth:RequestHandler;superOnly:RequestHandler;getTenant:(id:string)=>Promise<any>;getTenants:()=>Promise<any[]>}) {
  app.get('/api/auth/subscription',deps.auth,async(req,res)=>{
    try{
      const tenant=req.tenantId?await deps.getTenant(req.tenantId):null;
      if(!tenant&&!req.user?.isSuper)return res.status(404).json({error:'Do‘kon topilmadi'});
      const now=new Date();res.setHeader('Cache-Control','no-store');
      res.json({serverNow:now.toISOString(),tenant:tenantSession(tenant),subscription:tenant?subscriptionState(tenant,now.getTime()):null});
    }catch{res.status(503).json({error:'Obuna ma’lumotini olishda xatolik'});}
  });
  app.get('/api/admin/subscription-alerts',deps.auth,deps.superOnly,async(_req,res)=>{
    try{
      const now=new Date(),tenants=await deps.getTenants();
      const alerts=tenants.map(t=>({tenantId:t.id,name:t.name,slug:t.slug,...subscriptionState(t,now.getTime())})).filter(t=>t.expired||t.warning).sort((a,b)=>Number(b.expired)-Number(a.expired)||String(a.expiresAt).localeCompare(String(b.expiresAt)));
      res.setHeader('Cache-Control','no-store');res.json({serverNow:now.toISOString(),alerts});
    }catch{res.status(503).json({error:'Bildirishnomalarni olishda xatolik'});}
  });
}
