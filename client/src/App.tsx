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
import { lazy, Suspense, useEffect } from "react";

const importDashboard = () => import("@/pages/dashboard");
const importInventory = () => import("@/pages/inventory");
const importHistory = () => import("@/pages/history");
const importOrders = () => import("@/pages/orders");
const importCustomers = () => import("@/pages/customers");
const importStoreHome = () => import("@/pages/store/home");
const importCart = () => import("@/pages/store/cart");
const importLogin = () => import("@/pages/auth/login");
const importSettings = () => import("@/pages/settings");
const importCategories = () => import("@/pages/categories");
const importNotFound = () => import("@/pages/not-found");

const NotFound = lazy(importNotFound);
const Dashboard = lazy(importDashboard);
const Inventory = lazy(importInventory);
const History = lazy(importHistory);
const OrdersPage = lazy(importOrders);
const CustomersPage = lazy(importCustomers);
const StoreHome = lazy(importStoreHome);
const CartPage = lazy(importCart);
const LoginPage = lazy(importLogin);
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

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated) {
      preloadAdminPages();
    }
  }, [isAuthenticated]);
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={StoreHome} />
      <Route path="/cart" component={CartPage} />
      <Route path="/login" component={LoginPage} />
      
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
      
      {/* Catch-all for legacy or unknown routes */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <ProductProvider>
            <TransactionProvider>
              <OrderProvider>
                <CartProvider>
                  <TooltipProvider>
                    <Suspense fallback={<PageLoader />}>
                      <Router />
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
  );
}

export default App;
