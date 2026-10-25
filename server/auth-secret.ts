import { randomBytes } from 'node:crypto';
export function authSecret(env:Record<string,string|undefined>) {
 const value=env.JWT_SECRET;
 if(env.NODE_ENV==='production'&&(!value||value.length<32))throw new Error('Production uchun JWT_SECRET kamida 32 belgili maxfiy qiymat bo‘lishi kerak');
 return value||randomBytes(32).toString('hex');
}
