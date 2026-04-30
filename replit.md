# E-Savdo Platform - Multi-Tenant SaaS POS System

## Overview
The E-Savdo Platform is a multi-tenant SaaS Point of Sale (POS) system designed for general stores in Uzbekistan. It provides each subscriber with a branded storefront, an administrative panel, and isolated data, supporting any type of product or goods. The platform aims to modernize retail operations by offering comprehensive inventory, order, and customer management, sales reporting, and profit tracking. It features an offline-first architecture, PWA installability, and per-tenant Telegram notifications to enhance usability and connectivity.

## User Preferences
Preferred communication style: Simple, everyday language (Uzbek).

## System Architecture

### Multi-Tenant Design
The platform employs a shared database architecture where each tenant's data is isolated using a `tenant_id` column on all tables. Tenant resolution is handled via an `x-tenant-slug` header or JWT token, with an in-memory tenant cache for performance. Various subscription plans are available, including a free trial and tiered paid plans.

### Authentication
Authentication relies on JWT tokens with a 30-day expiration, secured using bcrypt for password hashing (10 salt rounds). Middleware manages access control, distinguishing between required authentication, optional authentication for public routes, and super admin access.

### Frontend Architecture
The frontend is built with React 18 and TypeScript, utilizing Wouter for routing and React Context API for state management. Server-side data fetching is managed by TanStack Query. UI components are developed using `shadcn/ui` (built on Radix UI) and styled with Tailwind CSS v4. Vite is used as the build tool. The system supports offline functionality via IndexedDB and Dexie.js.

### Backend Architecture
The backend is powered by Express.js and TypeScript, using Drizzle ORM with PostgreSQL for database interactions. It exposes RESTful API endpoints, with rate limiting and gzip compression for efficiency. Key backend components include route definitions with authentication and tenant context, a tenant-scoped database access layer, JWT authentication middleware, tenant resolution, and a per-tenant Telegram notification system (fire-and-forget via `setImmediate`).

### Performance Optimizations
- DB indexes: 21+ tenant_id indexes on hot tables (products, transactions, orders, categories, suppliers, customers, users, expenses, staff_members) plus composites (tenant_id, date DESC), (tenant_id, status), (tenant_id, stock).
- Connection pool: pg pool max=20, min=2, idleTimeout=30s, statement_timeout=30s, keepAlive enabled.
- N+1 elimination: `getAllTenantsWithStats` uses 3 GROUP BY queries instead of 3*N. `voidTransaction` uses single `IN` query + parallel updates. `/api/stores` uses `getProductCountsByTenants` (single GROUP BY).
- Reorder batching: `reorderProducts` and `reorderCategories` use single CASE WHEN UPDATE instead of N updates.
- Telegram notifications: deferred via `setImmediate` so order POST responds immediately.
- Log middleware: response body logging only in dev, truncated to 500 chars.
- Frontend refetch: courier-deliveries and employees use `refetchOnWindowFocus + staleTime` instead of 30s polling.

### Mobile UX Fixes
- Image upload (`useUpload` hook): 15s timeout on canvas compression, 15s on presigned URL request, 60s on R2 PUT — never hangs on "Yuklanmoqda…". HEIC/HEIF files bypass canvas (iOS camera). Object URLs revoked.
- Receipt dialog: `max-h-[90vh] flex flex-col` with inner `overflow-y-auto` body and sticky `shrink-0` footer so "Chop etish" button always remains visible/tappable.

### Print System
- **Receipt printing**: uses `window.open()` popup with self-contained HTML (`buildReceiptHtml` in `receipt-dialog.tsx`) — same proven pattern as `barcode-print.tsx`. The popup's `<head>` includes `@page { size: 80mm auto; margin: 0 }` and `html/body { width: 80mm }`. The popup's own inline script waits for images to load (or 3s timeout), calls `window.print()`, then `window.close()`. Logo and Telegram QR are preloaded via `new Image()` for cache warmth.
- **Why popup vs. in-page CSS**: thermal printer drivers (XP-365B) ignored named `@page` rules in the main app's stylesheet, so the receipt rendered at A4 width → 700+ pages. An isolated popup document gets a fresh print context where `@page` is honored.
- **Auto-print**: when `settings.autoPrint` is enabled, the receipt popup fires automatically as soon as the receipt dialog opens (300ms after open so the dialog renders first). Implemented inside `ReceiptDialog` via a `useRef`-guarded `useEffect` that fires once per `transaction.id` to prevent duplicates on re-render. Dashboard passes `autoPrint={settings.autoPrint}` to `ReceiptDialog`. Pop-up blocker must be allowed in browser; failures are silent (console warning) so the on-screen receipt stays usable. Old `window.print()` call in dashboard removed (it printed the entire page, not the receipt).
- **XSS protection**: `escapeHtml()` helper escapes all user-supplied content (product/customer names, store info, footer text, payment labels, IDs, dates).
- **Finance reports & other print flows**: use plain `window.print()`. Only `.no-print` CSS class remains in `index.css` to hide toolbar buttons during print. Receipt printing no longer affects this stylesheet at all.

### Data Storage
PostgreSQL serves as the primary database, with Drizzle ORM managing schema and queries. Tenant isolation is enforced by filtering all queries by `tenant_id`. The database schema, defined in `/shared/schema.ts`, includes tables for tenants, users, products, orders, categories, transactions, income/expense categories, and shift handovers. Barcodes maintain uniqueness across each tenant.

### Key Features
- **Barcode Scanning & OCR**: Integrated `@zxing/library` for barcode detection and Tesseract.js for OCR.
- **PWA & Electron Support**: Progressive Web App capabilities and an Electron wrapper for desktop applications.
- **Image Storage**: Utilizes Cloudflare R2 for image storage with presigned URL uploads.
- **Financial Management**: Includes profit tracking, configurable payment methods, expense and income management with categories, and a professional finance module featuring cash register balance, debt overview, and detailed reports.
- **Customer & Sales Management**: Nasiya (credit/debt) system with detailed debt tracking and partial payments, enhanced customer pages with debt management, and configurable online order forms.
- **Inventory & Product Customization**: Configurable product fields, multiple price types (regular, barcode, wholesale), supplier tracking, inline category creation, and supplier currency support (UZS/USD with auto-calculated cost price from exchange rate).
- **Staff Management**: Comprehensive staff attendance system with Face ID verification, GPS geofencing, and salary calculation based on attendance.
- **Delivery Management**: Courier assignment, delivery tracking, and public courier delivery pages.
- **Product Units**: Support for multiple measurement units (dona, litr, kg, metr) with decimal stock quantities.
- **Inventory Tabs**: Ombor page has filterable tabs — Barchasi, Mavjud (stock > 5), Kam qolgan (stock 1-5), Qolmagan (stock = 0).
- **Supplier Management**: CRUD for suppliers, supplier payment methods, and debt tracking.
- **CRM Hub**: A unified customer relationship management interface combining customers, orders, deliveries, and debtors with advanced filtering and workflow capabilities.
- **Store QR Code**: On-the-fly QR code generation for store access.
- **Tenant Configuration**: Tenants can configure payment methods, product form fields, customer fields, and receipt logos.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Type-safe ORM for database interactions.

### Security
- **bcryptjs**: Password hashing.
- **jsonwebtoken**: JWT authentication.
- **express-rate-limit**: API rate limiting.
- **compression**: Gzip compression for responses.

### UI Libraries
- **Radix UI**: Primitives for UI components.
- **Recharts**: Data visualization.
- **Framer Motion**: Animations.
- **Lucide React**: Icons.

### Utilities
- **date-fns**: Date formatting.
- **Zod**: Schema validation.
- **class-variance-authority + clsx**: Component variants.
- **Dexie.js**: IndexedDB for offline storage.