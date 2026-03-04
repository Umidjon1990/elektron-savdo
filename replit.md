# E-Savdo Platform - Multi-Tenant SaaS POS System

## Overview

Multi-tenant SaaS Point of Sale system for general stores in Uzbekistan. Each store subscriber gets their own branded storefront, admin panel, and isolated data. Built as a full-stack TypeScript application with React frontend and Express backend using PostgreSQL. The platform is fully generic (not book-specific) and supports any type of product/goods.

The system supports:
- Multi-tenant architecture with shared database and tenant_id isolation
- Customer product browsing and ordering (online store)
- Admin dashboard with cash register functionality
- Inventory management with barcode scanning (auto-detection)
- Order management and customer tracking
- Sales history, reporting, and profit tracking
- Per-tenant Telegram bot notifications
- Offline-first architecture with IndexedDB sync
- PWA installability

## User Preferences

Preferred communication style: Simple, everyday language (Uzbek).

## System Architecture

### Multi-Tenant Design
- **Architecture**: Shared database with `tenant_id` column on all tables
- **Tenant Resolution**: Via `x-tenant-slug` header or JWT token
- **Caching**: In-memory tenant cache with 5-minute TTL
- **Plans**: Free trial (14 days), Boshlang'ich (99k/mo), Professional (199k/mo), Premium (399k/mo)
- **Default tenant**: 'kitoblar-olami' with ID 'default-tenant', premium plan

### Authentication
- **Method**: JWT tokens with 30-day expiration
- **Password Hashing**: bcrypt with salt rounds 10
- **Middleware**: `authMiddleware` (required), `optionalAuth` (public), `superAdminOnly` (super admin)
- **Token Storage**: localStorage key `kitoblar_token`
- **Default credentials**: Abdulaziz / Abdulaziz5552

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: React Context API (auth, cart, products, orders, transactions)
- **Server State**: TanStack Query (React Query) for API data fetching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme configuration
- **Build Tool**: Vite
- **Offline**: IndexedDB via Dexie.js for offline-first data

The frontend is organized into:
- `/client/src/pages/` - Route-based page components
- `/client/src/pages/auth/` - Login and register pages
- `/client/src/components/` - Reusable UI components
- `/client/src/lib/` - Context providers, utilities, and IndexedDB sync
- `/client/src/hooks/` - Custom React hooks

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Design**: RESTful endpoints under `/api/`
- **Rate Limiting**: 200 req/min for API, 20 per 15min for auth
- **Compression**: gzip via compression middleware

Key backend files:
- `/server/routes.ts` - API route definitions with auth/tenant context
- `/server/storage.ts` - Tenant-scoped database access layer (IStorage interface)
- `/server/auth.ts` - JWT auth middleware, bcrypt password hashing
- `/server/tenant.ts` - Tenant resolution middleware with in-memory cache
- `/server/telegram.ts` - Per-tenant Telegram notification system
- `/server/db.ts` - Database connection pool setup

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `/shared/schema.ts` - defines tenants, users, products, orders, categories, transactions
- **Tenant Isolation**: All queries filtered by tenant_id
- **Barcode Uniqueness**: Composite unique index on (tenant_id, barcode)

### Key Features
1. **Multi-Tenant**: Each store gets isolated data, branding, Telegram bot
2. **Barcode Scanning**: @zxing/library with auto-detection (no focus needed)
3. **OCR Support**: Tesseract.js integration
4. **PWA Support**: Service worker, manifest, offline-first
5. **Electron Support**: Desktop app wrapper in `/electron/`
6. **Image Storage**: Cloudflare R2 with presigned URL uploads
7. **Telegram**: Per-tenant bot token/chat ID for order notifications
8. **Profit Tracking**: Cost price tracking with profit calculations
9. **Configurable Payment Methods**: Per-tenant custom payment methods (add/edit/remove)
10. **Configurable Product Fields**: Per-tenant custom product form fields
11. **Customer Data on Transactions**: Optional customer info (name, phone, custom fields) attached to each sale
12. **Multiple Price Types**: Regular price, barcode price (for labels), wholesale price
15. **Supplier Tracking**: `supplier` text column on products table, configurable visibility via productFormVisibility
16. **Inline Category Creation**: "+" button next to category dropdown in product form for quick category addition
13. **Barcode Label Printing**: JsBarcode with configurable label dimensions, font zoom slider (50-200%), barcodePrice support
14. **Receipt Logo**: Per-tenant receipt logo upload with fallback to store initial
15. **Product Description & Metadata**: `description` text column + `metadata` JSON for custom product fields
16. **PWA Standalone Mode**: overscroll-behavior:none, safe-area-insets, no pull-to-refresh in standalone mode
17. **Nasiya (Credit/Debt) System**: When selecting "Nasiya" payment, customer name/phone required, due date picker, debt tracking with partial payments
18. **Debt Payments**: `debt_payments` table tracks each payment against a nasiya transaction, `paidAmount`/`debtStatus` on transactions
19. **Enhanced Customers Page**: Tabs (Hammasi/Qarzdorlar/To'lganlar/Muddati yaqin), debt cards with progress bars, inline payment dialog, search by name/phone
20. **Professional Finance Module**: 5 submenu tabs (Kassa/Kirim/Chiqim/Nasiya/Hisobot), cash register balance tracking (naqd/karta/nasiya/chiqarilgan), income entries (cash_register_entries table), expense management with categories, debt overview, daily/weekly/monthly reports with print support

### Tenant Configuration (JSON columns on tenants table)
- `payment_methods`: Array of `{id, name}` - custom payment methods for POS
- `product_fields`: Array of `{key, label, required}` - custom product form fields
- `customer_fields`: Array of `{key, label}` - optional customer info fields at checkout
- `receipt_logo`: URL for receipt logo (falls back to tenant logo, then initial letter)

### Recent Changes (Mar 2026)
- Modern dark-themed landing page at `/` with 3D-style design, animated slogans, feature showcase
- Matching dark-themed login (`/login`) and register (`/register`) pages
- Landing page auto-redirects authenticated users to their dashboard
- Stores list moved to `/stores` route
- Added multi-tenant database schema (tenants table, tenant_id on all tables)
- Implemented JWT authentication with bcrypt password hashing
- Built tenant middleware with in-memory caching
- Refactored storage layer with tenant-scoped queries
- Added registration/onboarding flow for new stores
- Added rate limiting and gzip compression
- Migrated existing data to default tenant
- Super admin panel (/admin/super) - manage all tenants, create stores, set plans
- Slug-based store routing: /store/:slug, /store/:slug/cart, /store/:slug/login
- Stores list page at / showing all active stores
- Secure slug-based public APIs: /api/store/:slug/products, /api/store/:slug/categories, /api/store/:slug/orders
- Each store has its own branded page with logo, colors, products
- Slug-scoped admin dashboard: /store/:slug/admin/* (kassa, ombor, buyurtmalar, tarix, sozlamalar)
- Login redirects to /store/:slug/admin, logout returns to /store/:slug
- SlugProtectedRoute ensures tenant ownership validation
- Legacy /admin/* routes auto-redirect to /store/:slug/admin/* when tenant exists
- SidebarNav dynamically generates slug-based navigation links
- Finance module: expense_categories, expenses tables, CRUD APIs, summary/daily-breakdown endpoints, finance page with KPI cards, BarChart, PieChart, expense management
- Product form visibility settings: `productFormVisibility` JSON on tenants table, toggle switches in settings page to show/hide fields (costPrice, barcodePrice, wholesalePrice, description, videoUrl, isNew, category, author)
- CRM Module: customers table, deliveries table, audit_logs table, enhanced orders with statusHistory/paymentStatus/address/courier
- Professional Customers page: server-side search+pagination, Customer Card drawer (orders/deliveries/debts tabs), CRUD
- Enhanced Orders page: 6-status workflow (new→confirmed→preparing→out_for_delivery→delivered/cancelled), filters, order detail drawer with status timeline, courier assignment, audit trail
- Deliveries page: delivery tracking with status badges (pending/delivered/failed/returned/cancelled), filters by courier/status/date
- Debtors page: nasiya debt tracking, grouped by customer, KPI cards, period filters, inline payment dialog
- Sidebar nav: Mijozlar moved to primary, Yetkazish and Qarzdorlar added to secondary

## External Dependencies

### Database
- PostgreSQL (required - connection via DATABASE_URL)
- Drizzle ORM for type-safe database queries

### Security
- bcryptjs for password hashing
- jsonwebtoken for JWT authentication
- express-rate-limit for API rate limiting
- compression for gzip responses

### UI Libraries
- Radix UI primitives (full suite)
- Recharts for data visualization
- Framer Motion for animations
- Lucide React for icons

### Utilities
- date-fns for date formatting
- Zod for schema validation (integrated with Drizzle via drizzle-zod)
- class-variance-authority + clsx for component variants
- Dexie.js for IndexedDB offline storage
