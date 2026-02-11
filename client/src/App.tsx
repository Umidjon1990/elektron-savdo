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
import React, { lazy, Suspense, useEffect } from "react";

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
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated) {
      preloadAdminPages();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <PageLoader />;
  }
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={StoresListPage} />
      <Route path="/store/:slug" component={SlugStorePage} />
      <Route path="/store/:slug/cart" component={SlugCartPage} />
      <Route path="/store/:slug/login" component={SlugLoginPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      
      {/* Admin Routes - Protected */}
      <Route path="/admin">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/admin/inventory">
        {() => <ProtectedRoute component={Inventory} />}
      </Route>
      <Route path="/admin/history">
        {() => <ProtectedRoute component={History} />}
      </Route>
      <Route path="/admin/orders">
        {() => <ProtectedRoute component={OrdersPage} />}
      </Route>
      <Route path="/admin/customers">
        {() => <ProtectedRoute component={CustomersPage} />}
      </Route>
      <Route path="/admin/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/admin/categories">
        {() => <ProtectedRoute component={CategoriesPage} />}
      </Route>
      <Route path="/admin/super">
        {() => <ProtectedRoute component={SuperAdminPage} />}
      </Route>
      
      {/* Catch-all for legacy or unknown routes */}
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
