import type { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { tenants } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Tenant } from "@shared/schema";

const tenantCache = new Map<string, { tenant: Tenant; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const cached = tenantCache.get(slug);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.tenant;
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
  if (tenant) {
    tenantCache.set(slug, { tenant, cachedAt: Date.now() });
  }
  return tenant || null;
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const keys = Array.from(tenantCache.keys());
  for (const key of keys) {
    const entry = tenantCache.get(key)!;
    if (entry.tenant.id === id && Date.now() - entry.cachedAt < CACHE_TTL) {
      return entry.tenant;
    }
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
  if (tenant) {
    tenantCache.set(tenant.slug, { tenant, cachedAt: Date.now() });
  }
  return tenant || null;
}

export function invalidateTenantCache(slug?: string) {
  if (slug) {
    tenantCache.delete(slug);
  } else {
    tenantCache.clear();
  }
}

export function tenantFromSlug(req: Request, res: Response, next: NextFunction) {
  const slug = req.headers["x-tenant-slug"] as string;
  if (slug) {
    getTenantBySlug(slug).then(tenant => {
      if (tenant) {
        req.tenantId = tenant.id;
      }
      next();
    }).catch(next);
  } else {
    next();
  }
}
