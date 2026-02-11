import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "kitoblar-olami-jwt-secret-2024-dev-only";
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("WARNING: JWT_SECRET environment variable is not set in production!");
}
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

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
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
  req.tenantId = payload.tenantId; // JWT always overrides header for tenant isolation
  next();
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
