import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProductProvider } from "@/lib/product-context";
import { TransactionProvider } from "@/lib/transaction-context";
import { CartProvider } from "@/lib/cart-context";
import { OrderProvider } from "@/lib/order-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SettingsProvider } from "@/lib/settings-context";
import React, { lazy, Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const importDashboard = () => import("@/pages/dashboard");
const importInventory = () => import("@/pages/inventory");
const importHistory = () => import("@/pages/history");
const importCustomers = () => import("@/pages/customers");
const importStoreHome = () => import("@/pages/store/home");
const importCart = () => import("@/pages/store/cart");
const importLogin = () => import("@/pages/auth/login");
// importRegister removed: public self-registration is disabled.
const importSettings = () => import("@/pages/settings");
const importCategories = () => import("@/pages/categories");
const importNotFound = () => import("@/pages/not-found");
const importSuperAdmin = () => import("@/pages/super-admin");
const importLanding = () => import("@/pages/landing");
const importStoresList = () => import("@/pages/store/stores-list");
const importSlugStore = () => import("@/pages/store/slug-store");
const importSlugCart = () => import("@/pages/store/slug-cart");
const importSlugLogin = () => import("@/pages/store/slug-login");
const importFinance = () => import("@/pages/finance");
const importEmployees = () => import("@/pages/employees");
const importAttendanceCheck = () => import("@/pages/attendance-check");
const importCourierDeliveries = () => import("@/pages/courier-deliveries");
const importNasiya = () => import("@/pages/nasiya");

const NotFound = lazy(importNotFound);
const SuperAdminPage = lazy(importSuperAdmin);
const LandingPage = lazy(importLanding);
const StoresListPage = lazy(importStoresList);
const SlugStorePage = lazy(importSlugStore);
const SlugCartPage = lazy(importSlugCart);
const SlugLoginPage = lazy(importSlugLogin);
const Dashboard = lazy(importDashboard);
const Inventory = lazy(importInventory);
const History = lazy(importHistory);
const CustomersPage = lazy(importCustomers);
const StoreHome = lazy(importStoreHome);
const CartPage = lazy(importCart);
const LoginPage = lazy(importLogin);
const SettingsPage = lazy(importSettings);
const CategoriesPage = lazy(importCategories);
const FinancePage = lazy(importFinance);
const EmployeesPage = lazy(importEmployees);
const AttendanceCheckPage = lazy(importAttendanceCheck);
const CourierDeliveriesPage = lazy(importCourierDeliveries);
const NasiyaPage = lazy(importNasiya);

let adminPagesPreloaded = false;
function preloadAdminPages() {
  // Idempotent — guard against StrictMode double-effect and multiple
  // ProtectedRoute mounts (each layout switch was retriggering this).
  if (adminPagesPreloaded) return;
  adminPagesPreloaded = true;

  // The sidebar lives INSIDE each lazy-loaded page, so route switches
  // unmount the entire page (sidebar included) and show <PageLoader />
  // until the next chunk finishes downloading. On a slow desktop POS
  // network this looked like a blank white screen for several seconds.
  // Solution: kick off ALL admin chunk downloads in parallel as soon as
  // the user is authenticated, so by the time they click the sidebar
  // the chunk is already in browser cache and the route swap is instant.
  // 100ms delay — small enough that even a fast first sidebar click
  // catches up to the preload, but lets the initial dashboard paint first.
  // .catch on each: prevents "unhandled rejection" noise if a chunk load
  // fails (network blip), while still letting React Suspense retry on demand.
  setTimeout(() => {
    importDashboard().catch(() => {});
    importInventory().catch(() => {});
    importHistory().catch(() => {});
    importCustomers().catch(() => {});
    importSettings().catch(() => {});
    importCategories().catch(() => {});
    importFinance().catch(() => {});
    importEmployees().catch(() => {});
    importNasiya().catch(() => {});
  }, 100);
}

function PageLoader() {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: "100vh", background: "#f1f5f9" }}
    >
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
      <p style={{ color: "#64748b", fontSize: 14, fontWeight: 500 }}>
        Yuklanmoqda...
      </p>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }
  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || "Noma'lum xatolik";
      const errStack = this.state.error?.stack || "";
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <h2 style={{ marginBottom: 16 }}>Xatolik yuz berdi</h2>
          <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 16, maxWidth: 600, margin: "0 auto 16px", wordBreak: "break-word" }}>{errMsg}</p>
          <details style={{ fontSize: 11, color: "#64748b", marginBottom: 16, textAlign: "left", maxWidth: 600, margin: "0 auto 16px" }}>
            <summary>Batafsil</summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 10 }}>{errStack}</pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: "8px 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", marginRight: 8 }}
          >
            Qayta urinish
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "8px 24px", background: "#64748b", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Sahifani yangilash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ExpiredPage({ message }: { message: string }) {
  const { logout } = useAuth();
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f8fafc, #e2e8f0)" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 40, background: "white", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 28 }}>⏰</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Muddat tugagan</h2>
        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Obunani yangilash uchun admin bilan bog'laning.</p>
        <button
          onClick={logout}
          style={{ padding: "10px 32px", background: "#4f46e5", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
          data-testid="button-expired-logout"
        >
          Chiqish
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, tenant, isExpired, expiredMessage } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated) {
      preloadAdminPages();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isExpired) {
    return <ExpiredPage message={expiredMessage} />;
  }
  
  if (!isAuthenticated) {
    if (tenant?.slug) {
      return <Redirect to={`/store/${tenant.slug}/login`} />;
    }
    return <Redirect to="/login" />;
  }
  return <Component />;
}

function SlugProtectedRoute({ component: Component, slug }: { component: React.ComponentType; slug: string }) {
  const { isAuthenticated, isLoading, tenant, isExpired, expiredMessage } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated) {
      preloadAdminPages();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isExpired) {
    return <ExpiredPage message={expiredMessage} />;
  }
  
  if (!isAuthenticated) {
    return <Redirect to={`/store/${slug}/login`} />;
  }

  if (tenant && tenant.slug !== slug) {
    return <Redirect to={`/store/${tenant.slug}/admin`} />;
  }

  return <Component />;
}

function LegacyAdminRedirect({ component: Component, subPath }: { component: React.ComponentType; subPath?: string }) {
  const { isAuthenticated, isLoading, tenant } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      preloadAdminPages();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated && tenant?.slug) {
    const target = subPath ? `/store/${tenant.slug}/admin/${subPath}` : `/store/${tenant.slug}/admin`;
    return <Redirect to={target} />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function HomeRedirect() {
  const { data: defaultSlug, isLoading } = useQuery({
    queryKey: ["default-tenant-slug"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/default");
      if (res.ok) {
        const data = await res.json();
        return data.slug;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (defaultSlug) {
    return <Redirect to={`/store/${defaultSlug}`} />;
  }

  return <Redirect to="/stores" />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/stores" component={StoresListPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/attendance/:token" component={AttendanceCheckPage} />
      <Route path="/courier/:token" component={CourierDeliveriesPage} />
      <Route path="/login" component={LoginPage} />
      {/* Public self-registration is disabled. Redirect any old /register
          links to the login page so users contact the admin instead. */}
      <Route path="/register">
        <Redirect to="/login" />
      </Route>
      
      {/* Slug-scoped Admin Routes (must be before /store/:slug to avoid matching) */}
      <Route path="/store/:slug/admin/inventory">
        {(params) => <SlugProtectedRoute component={Inventory} slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/admin/history">
        {(params) => <SlugProtectedRoute component={History} slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/admin/orders">
        {(params) => <Redirect to={`/store/${params.slug}/admin/customers`} />}
      </Route>
      <Route path="/store/:slug/admin/customers">
        {(params) => <SlugProtectedRoute component={CustomersPage} slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/admin/settings">
        {(params) => <SlugProtectedRoute component={SettingsPage} slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/admin/categories">
        {(params) => <SlugProtectedRoute component={CategoriesPage} slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/admin/finance">
        {(params) => <SlugProtectedRoute component={FinancePage} slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/admin/nasiya">
        {(params) => <SlugProtectedRoute component={NasiyaPage} slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/admin/employees">
        {(params) => <SlugProtectedRoute component={EmployeesPage} slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/admin/deliveries">
        {(params) => <Redirect to={`/store/${params.slug}/admin/customers`} />}
      </Route>
      <Route path="/store/:slug/admin/debtors">
        {(params) => <Redirect to={`/store/${params.slug}/admin/customers`} />}
      </Route>
      <Route path="/store/:slug/admin/super">
        {(params) => <SlugProtectedRoute component={SuperAdminPage} slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/admin">
        {(params) => <SlugProtectedRoute component={Dashboard} slug={params.slug} />}
      </Route>

      {/* Public Store Routes */}
      <Route path="/store/:slug/cart" component={SlugCartPage} />
      <Route path="/store/:slug/login" component={SlugLoginPage} />
      <Route path="/store/:slug" component={SlugStorePage} />

      {/* Legacy Admin Routes - redirect to slug-based if tenant exists */}
      <Route path="/admin">
        {() => <LegacyAdminRedirect component={Dashboard} />}
      </Route>
      <Route path="/admin/inventory">
        {() => <LegacyAdminRedirect component={Inventory} subPath="inventory" />}
      </Route>
      <Route path="/admin/history">
        {() => <LegacyAdminRedirect component={History} subPath="history" />}
      </Route>
      <Route path="/admin/orders">
        {() => <LegacyAdminRedirect component={CustomersPage} subPath="customers" />}
      </Route>
      <Route path="/admin/customers">
        {() => <LegacyAdminRedirect component={CustomersPage} subPath="customers" />}
      </Route>
      <Route path="/admin/settings">
        {() => <LegacyAdminRedirect component={SettingsPage} subPath="settings" />}
      </Route>
      <Route path="/admin/categories">
        {() => <LegacyAdminRedirect component={CategoriesPage} subPath="categories" />}
      </Route>
      <Route path="/admin/finance">
        {() => <LegacyAdminRedirect component={FinancePage} subPath="finance" />}
      </Route>
      <Route path="/admin/nasiya">
        {() => <LegacyAdminRedirect component={NasiyaPage} subPath="nasiya" />}
      </Route>
      <Route path="/admin/employees">
        {() => <LegacyAdminRedirect component={EmployeesPage} subPath="employees" />}
      </Route>
      <Route path="/admin/deliveries">
        {() => <LegacyAdminRedirect component={CustomersPage} subPath="customers" />}
      </Route>
      <Route path="/admin/debtors">
        {() => <LegacyAdminRedirect component={CustomersPage} subPath="customers" />}
      </Route>
      <Route path="/admin/super">
        {() => <LegacyAdminRedirect component={SuperAdminPage} subPath="super" />}
      </Route>
      
      {/* Catch-all for unknown routes */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            <ProductProvider>
              <TransactionProvider>
                <OrderProvider>
                  <CartProvider>
                    <TooltipProvider>
                      <Suspense fallback={<PageLoader />}>
                        <ErrorBoundary>
                          <Router />
                        </ErrorBoundary>
                      </Suspense>
                      <Toaster />
                      <SonnerToaster position="top-center" richColors />
                    </TooltipProvider>
                  </CartProvider>
                </OrderProvider>
              </TransactionProvider>
            </ProductProvider>
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
