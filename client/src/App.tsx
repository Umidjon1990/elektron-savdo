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
const importOrders = () => import("@/pages/orders");
const importCustomers = () => import("@/pages/customers");
const importStoreHome = () => import("@/pages/store/home");
const importCart = () => import("@/pages/store/cart");
const importLogin = () => import("@/pages/auth/login");
const importRegister = () => import("@/pages/auth/register");
const importSettings = () => import("@/pages/settings");
const importCategories = () => import("@/pages/categories");
const importNotFound = () => import("@/pages/not-found");
const importSuperAdmin = () => import("@/pages/super-admin");
const importStoresList = () => import("@/pages/store/stores-list");
const importSlugStore = () => import("@/pages/store/slug-store");
const importSlugCart = () => import("@/pages/store/slug-cart");
const importSlugLogin = () => import("@/pages/store/slug-login");

const NotFound = lazy(importNotFound);
const SuperAdminPage = lazy(importSuperAdmin);
const StoresListPage = lazy(importStoresList);
const SlugStorePage = lazy(importSlugStore);
const SlugCartPage = lazy(importSlugCart);
const SlugLoginPage = lazy(importSlugLogin);
const Dashboard = lazy(importDashboard);
const Inventory = lazy(importInventory);
const History = lazy(importHistory);
const OrdersPage = lazy(importOrders);
const CustomersPage = lazy(importCustomers);
const StoreHome = lazy(importStoreHome);
const CartPage = lazy(importCart);
const LoginPage = lazy(importLogin);
const RegisterPage = lazy(importRegister);
const SettingsPage = lazy(importSettings);
const CategoriesPage = lazy(importCategories);

function preloadAdminPages() {
  importDashboard();
  importInventory();
  importHistory();
  importOrders();
  importCustomers();
  importSettings();
  importCategories();
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
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
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <h2 style={{ color: "red" }}>Xatolik yuz berdi</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "#666", fontSize: 12, maxWidth: 600, margin: "16px auto" }}>
            {this.state.error?.message}
            {"\n"}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 24px", background: "#4f46e5", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
            Qayta yuklash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, tenant } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated) {
      preloadAdminPages();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <PageLoader />;
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
  const { isAuthenticated, isLoading, tenant } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated) {
      preloadAdminPages();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <PageLoader />;
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

  return <Redirect to="/store/kitoblar-olami" />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/">
        {() => <HomeRedirect />}
      </Route>
      <Route path="/cart" component={CartPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      
      {/* Slug-scoped Admin Routes (must be before /store/:slug to avoid matching) */}
      <Route path="/store/:slug/admin/inventory">
        {(params) => <SlugProtectedRoute component={Inventory} slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/admin/history">
        {(params) => <SlugProtectedRoute component={History} slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/admin/orders">
        {(params) => <SlugProtectedRoute component={OrdersPage} slug={params.slug} />}
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
        {() => <LegacyAdminRedirect component={OrdersPage} subPath="orders" />}
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
