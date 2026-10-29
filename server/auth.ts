import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { getTenantById } from "./tenant";
import { authSecret } from './auth-secret';
import {subscriptionGate} from './subscription-gate';
const checkSubscription=subscriptionGate(id=>getTenantById(id,true));

const JWT_SECRET = authSecret(process.env);
const JWT_EXPIRES_IN = "30d";

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  isSuper: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Avtorizatsiya talab qilinadi" });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Token yaroqsiz yoki muddati tugagan" });
  }

  req.user = payload;
  req.tenantId = payload.tenantId;

  if (['PATCH','PUT'].includes(req.method) && req.body && ['id','tenantId','createdBy','userId'].some(k=>k in req.body)) {
    return res.status(400).json({error:'Yozuv egasi va identifikatorini o‘zgartirish mumkin emas'});
  }
  if(payload.tenantId&&!['GET','HEAD','OPTIONS'].includes(req.method)&&req.body){
    const {finance}=await import('./finance-runtime');
    if(!await finance.references(payload.tenantId,req.body))return res.status(400).json({error:'Bog‘langan yozuv bu do‘konga tegishli emas'});
  }
  const management = /^\/api\/(expenses|cash-register|suppliers|products|tenant-settings|shift-handovers)/.test(req.path);
  if(management && !['GET','HEAD','OPTIONS'].includes(req.method) && !payload.isSuper && !['owner','admin','manager'].includes(payload.role)) {
    return res.status(403).json({error:'Bu moliyaviy amal uchun rahbar huquqi kerak'});
  }

  return checkSubscription(req,res,next);
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
      req.tenantId = payload.tenantId;
    }
  }
  next();
}

export function superAdminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isSuper) {
    return res.status(403).json({ error: "Faqat super admin uchun" });
  }
  next();
}
