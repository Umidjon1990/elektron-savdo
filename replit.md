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
- Image upload (`useUpload` hook): 6s timeout on canvas compression (kept short so iOS Safari never feels frozen), 15s on presigned URL request, 60s on R2 PUT — never hangs on "Yuklanmoqda…". HEIC/HEIF files bypass canvas (iOS camera). Object URLs revoked.
- Receipt dialog: `max-h-[90vh] flex flex-col` with inner `overflow-y-auto` body and sticky `shrink-0` footer so "Chop etish" button always remains visible/tappable. Manual "Chop etish" click also auto-closes the dialog after ~600ms so the user never has to tap "Yopish" separately.

### Navigation Performance
- `preloadAdminPages()` in `App.tsx` runs once via `setTimeout(100ms)` after auth (was: `requestIdleCallback`, which often never fired on busy POS terminals). Module-level `adminPagesPreloaded` flag makes it idempotent across StrictMode / multiple `ProtectedRoute` mounts. Preloads ALL 8 admin chunks in parallel: `dashboard`, `inventory`, `history`, `customers`, `settings`, `categories`, `finance`, `employees`. After this fires, `lazy()` resolves synchronously → sidebar route switches show no Suspense fallback at all.
- **Why eager preload matters**: Each admin page renders its OWN `SidebarNav` inside its layout. Before this fix, every sidebar click unmounted the entire current page (including sidebar) → tiny Suspense fallback shown → entire screen looked blank/white until next chunk downloaded (seconds on slow desktop network).
- `PageLoader` upgraded from a small `h-32` spinner to a full-viewport `min-h-screen` loader with "Yuklanmoqda..." text, so the first navigation (or a slow chunk fetch) shows an obviously-working loading state instead of a blank white screen.
- Each preload import is `.catch(() => {})` to suppress unhandled-rejection noise on transient network failures; React Suspense will retry on actual demand.
- `inventory.tsx` filtering (`searchFiltered`, `filteredProducts`, `tabCounts`) wrapped in `useMemo` with single-pass tab counter — eliminates 4 full array scans per render on the inventory page.

### Large-Tenant Performance (e.g. "Kitoblar")
For tenants with thousands of products, the following changes prevent UI freezes:
- **Product query no longer refetches on every page mount**: `product-context.tsx` sets `refetchOnMount: false`, `staleTime: 5min`, `gcTime: 30min`. Mutations still invalidate the cache, so freshness is preserved when the user adds/edits/deletes a product. Was the #1 source of lag — every navigation between Dashboard ↔ Ombor ↔ Tarix re-downloaded the entire product list (megabytes for Kitoblar) and re-decoded every image.
- **`ProductCard` is `React.memo`'d** with custom equality (product ref + onClick + size). Without this, ANY state change on the dashboard (cart update, search keystroke, mobile cart toggle) re-rendered every product card.
- **`addToCart` is `useCallback`'d** so its identity is stable across renders, allowing `ProductCard.memo` to actually skip re-renders.
- **Dashboard's `filteredProducts` is `useMemo`'d** with the search query lowercased once outside the filter loop. Returns the original `products` reference unchanged when no filters are active (keeps memo equality stable downstream).
- **`<img>` elements have explicit `width`/`height` + `decoding="async"`** to prevent layout thrash and unblock the main thread during image decoding. `loading="lazy"` was already present.

### Sidebar (Desktop)
- `SidebarNav` (desktop) supports two widths: compact `w-20` (icons + tiny text-[10px] labels) and expanded `w-52` (icons + horizontal text-sm labels). Toggle button (ChevronsLeft/Right) lives in the sidebar header. Preference persisted to localStorage key `esavdo-sidebar-expanded`. **Default = expanded** so labels like "Kassa", "Ombor" are clearly readable.
- All admin page main containers use `flex-1 min-w-0` after `<SidebarNav />` to prevent horizontal overflow when sidebar widens (verified in customers, settings, categories, employees, history, dashboard, inventory, finance).
- Mobile bottom nav unchanged (untouched).

### Settings
- `settings.autoPrint` defaults to `true` for new installs. A one-time migration (`pos_settings_autoprint_migrated_v1` localStorage key) force-enables it once for existing installs that explicitly had `autoPrint: false`. Future user toggles are respected.

### Print System
- **Receipt printing**: uses `window.open()` popup with self-contained HTML (`buildReceiptHtml` in `client/src/lib/receipt-html.ts`) — same proven pattern as `barcode-print.tsx`. The popup's `<head>` includes `@page { size: 80mm auto; margin: 0 }` and `html/body { width: 80mm }`. The popup's own inline script uses `requestAnimationFrame` to print as soon as images are ready, with a hard cap of 800ms (down from 3000ms) so a slow external QR API never delays printing. After print, popup auto-closes after 300ms. Logo and Telegram QR are preloaded on dashboard mount (in `dashboard.tsx`'s preload `useEffect`) so they're already in browser cache when the popup opens.
- **Why popup vs. in-page CSS**: thermal printer drivers (XP-365B) ignored named `@page` rules in the main app's stylesheet, so the receipt rendered at A4 width → 700+ pages. An isolated popup document gets a fresh print context where `@page` is honored.
- **Auto-print fast path** (when `settings.autoPrint` is enabled): the dashboard handles auto-print directly — it does NOT open the on-screen `ReceiptDialog`. Flow: (1) inside `handleCheckout`, BEFORE any `await`, `window.open()` is called synchronously to keep the user-gesture context alive (popup blocker bypass) and the popup is filled with placeholder "Chek tayyorlanmoqda…" HTML; window ref stored in `preOpenedPrintWindowRef`. (2) After transaction succeeds, `buildReceiptHtml({transaction, settings, tenantSettings})` from `client/src/lib/receipt-html.ts` builds the HTML and `document.write()`s it into the same popup. (3) Popup's inline script waits for images then calls `window.print()` and `window.close()`. (4) On checkout error or popup write failure, popup is closed and dialog opens as fallback. (5) `ReceiptDialog` is no longer involved in auto-print — only used for manual print mode (when `autoPrint` is off).
- **Receipt HTML builder** lives in `client/src/lib/receipt-html.ts` (extracted from `receipt-dialog.tsx`) — a pure function consumed by both the dashboard auto-print path and `ReceiptDialog`'s manual print button.
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