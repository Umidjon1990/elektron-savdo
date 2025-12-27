# Kitoblar Olami - POS System

## Overview

This is a Point of Sale (POS) system designed for bookstores, featuring both a customer-facing online store and an admin panel for inventory management, order processing, and sales tracking. The application is built as a full-stack TypeScript application with a React frontend and Express backend, using PostgreSQL for data persistence.

The system supports:
- Customer product browsing and ordering
- Admin dashboard with cash register functionality
- Inventory management with barcode scanning
- Order management and customer tracking
- Sales history and reporting

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: React Context API for local state (auth, cart, products, orders, transactions)
- **Server State**: TanStack Query (React Query) for API data fetching and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme configuration
- **Build Tool**: Vite

The frontend is organized into:
- `/client/src/pages/` - Route-based page components (dashboard, inventory, orders, customers, store)
- `/client/src/components/` - Reusable UI components split into `/ui/` (shadcn), `/pos/` (POS-specific), and `/layout/`
- `/client/src/lib/` - Context providers and utilities
- `/client/src/hooks/` - Custom React hooks

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Design**: RESTful endpoints under `/api/`

Key backend files:
- `/server/routes.ts` - API route definitions
- `/server/storage.ts` - Database access layer implementing IStorage interface
- `/server/db.ts` - Database connection pool setup

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `/shared/schema.ts` - defines users, products, and orders tables
- **Migrations**: Managed via drizzle-kit with output to `/migrations/`

### Authentication
- Simple mock authentication in frontend context (`/client/src/lib/auth-context.tsx`)
- Admin routes protected via ProtectedRoute component
- Default credentials: admin/admin123

### Key Features
1. **Barcode Scanning**: Uses @zxing/library for camera-based barcode detection
2. **OCR Support**: Tesseract.js integration for text recognition
3. **PWA Support**: Service worker and manifest for installable app
4. **Electron Support**: Desktop app wrapper available in `/electron/`

## External Dependencies

### Database
- PostgreSQL (required - connection via DATABASE_URL environment variable)
- Drizzle ORM for type-safe database queries
- connect-pg-simple for session storage

### UI Libraries
- Radix UI primitives (full suite: dialogs, dropdowns, forms, etc.)
- Recharts for data visualization
- Framer Motion for animations
- Lucide React for icons

### Utilities
- date-fns for date formatting
- Zod for schema validation (integrated with Drizzle via drizzle-zod)
- class-variance-authority + clsx for component variants

### Development Tools
- Vite with React plugin
- TypeScript with strict mode
- Tailwind CSS v4 with @tailwindcss/vite plugin

### PWA/Desktop
- Service worker for offline support
- Electron for desktop deployment (optional)