# E-Savdo Platform - Multi-Tenant SaaS POS System

## Overview
The E-Savdo Platform is a multi-tenant SaaS Point of Sale (POS) system designed for general stores in Uzbekistan. It provides each subscriber with a branded storefront, an administrative panel, and isolated data, supporting any type of product or goods. The platform aims to modernize retail operations by offering comprehensive inventory, order, and customer management, sales reporting, and profit tracking. It features an offline-first architecture, PWA installability, and per-tenant Telegram notifications to enhance usability and connectivity.

## User Preferences
Preferred communication style: Simple, everyday language (Uzbek).

## System Architecture

### Multi-Tenant Design
The platform employs a shared database architecture where each tenant's data is isolated using a `tenant_id` column on all tables. Tenant resolution is handled via an `x-tenant-slug` header or JWT token. Various subscription plans are available, including a free trial and tiered paid plans.

### Authentication
Authentication relies on JWT tokens with bcrypt for password hashing. Middleware manages access control. Public self-registration is disabled; only the super admin can create new tenants. Tenant deletion by super admin is protected for the `default-tenant`.

### Frontend Architecture
The frontend is built with React 18, TypeScript, Wouter for routing, and React Context API for state management. Server-side data fetching is managed by TanStack Query. UI components use `shadcn/ui` (built on Radix UI) and Tailwind CSS v4. Vite is used as the build tool. Offline functionality is supported via IndexedDB and Dexie.js. Preloading mechanisms are implemented for improved navigation performance.

### Backend Architecture
The backend is powered by Express.js and TypeScript, using Drizzle ORM with PostgreSQL. It exposes RESTful API endpoints with rate limiting and gzip compression. Key components include route definitions, a tenant-scoped database access layer, JWT authentication middleware, tenant resolution, and a per-tenant Telegram notification system.

### Key Features
- **Barcode Scanning & OCR**: Integrated `@zxing/library` for barcode detection and Tesseract.js for OCR.
- **PWA & Electron Support**: Progressive Web App capabilities and an Electron wrapper for desktop applications.
- **Image Storage**: Utilizes Cloudflare R2 for image storage with presigned URL uploads.
- **Financial Management**: Includes profit tracking, configurable payment methods, expense and income management with categories, and a professional finance module.
- **Customer & Sales Management**: Nasiya (credit/debt) system with detailed debt tracking and partial payments, enhanced customer pages, and configurable online order forms.
- **Inventory & Product Customization**: Configurable product fields, multiple price types, supplier tracking, inline category creation, and supplier currency support. Supports multiple measurement units with decimal stock quantities.
- **Staff Management**: Comprehensive staff attendance system with Face ID verification, GPS geofencing, and salary calculation.
- **Delivery Management**: Courier assignment, delivery tracking, and public courier delivery pages.
- **Supplier Management**: CRUD for suppliers, payment methods, and debt tracking with bulk payment options. **USD payment support**: in Finance → Tovar beruvchi → "To'lash", suppliers with USD-currency nasiya products see a "So'm / Dollar" currency toggle. USD payments are distributed per-product with each portion converted back to UZS using THAT product's stored `supplierCurrencyRate` (not today's rate). Full-pay snaps `supplierPaidAmount` to `costPrice * stock` to eliminate rounding dust. The cash-register expense is recorded in UZS as the sum of per-product deltas. Default dialog currency is USD only when the supplier has zero UZS-only debt remaining.
- **CRM Hub**: A unified customer relationship management interface.
- **Tenant Configuration**: Tenants can configure payment methods, product form fields, customer fields, and receipt logos.

### Print System
Receipt printing uses a `window.open()` popup with self-contained HTML for thermal printers, bypassing main app CSS for proper formatting. Auto-print functionality is optimized for speed and user experience, directly handling printing without opening the on-screen `ReceiptDialog` unless necessary. User-supplied content is XSS protected.

### Performance Optimizations
Database indexes, connection pooling, N+1 query elimination, batching for updates, deferred Telegram notifications, and optimized frontend refetching contribute to performance. Large-tenant performance is addressed by optimizing product queries, memoizing React components, and optimizing image loading.

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