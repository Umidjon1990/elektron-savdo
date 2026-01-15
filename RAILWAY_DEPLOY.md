# Railway Deployment Guide

## 1. GitHub'ga yuklash

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kitoblar-olami.git
git push -u origin main
```

## 2. Railway'da yangi loyiha yaratish

1. [Railway.app](https://railway.app) ga kiring
2. "New Project" tugmasini bosing
3. "Deploy from GitHub repo" ni tanlang
4. Repositoriyangizni tanlang

## 3. PostgreSQL qo'shish

1. Railway dashboardda "+ New" tugmasini bosing
2. "Database" → "PostgreSQL" ni tanlang
3. Database avtomatik yaratiladi va `DATABASE_URL` o'rnatiladi

## 4. Environment Variables sozlash

Railway dashboard → Variables bo'limida quyidagilarni qo'shing:

| Variable | Qiymat |
|----------|--------|
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 Access Key |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Key |
| `R2_BUCKET_NAME` | Bucket nomi |
| `R2_PUBLIC_URL` | R2 Public URL |
| `NODE_ENV` | production |
| `PORT` | 5000 |

Optional (SMS uchun):
| `ESKIZ_EMAIL` | Eskiz email |
| `ESKIZ_PASSWORD` | Eskiz parol |

## 5. Deploy

Railway avtomatik deploy qiladi. Health check `/api/health` endpointida ishlaydi.

## 6. Domain sozlash

1. Settings → Domains
2. "Generate Domain" yoki custom domain qo'shing

## Foydali buyruqlar

```bash
# Lokal test
npm run build
npm run start

# Database migration
npm run db:push
```
