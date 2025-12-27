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
import { lazy, Suspense } from "react";

const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Inventory = lazy(() => import("@/pages/inventory"));
const History = lazy(() => import("@/pages/history"));
const OrdersPage = lazy(() => import("@/pages/orders"));
const CustomersPage = lazy(() => import("@/pages/customers"));
const StoreHome = lazy(() => import("@/pages/store/home"));
const CartPage = lazy(() => import("@/pages/store/cart"));
const LoginPage = lazy(() => import("@/pages/auth/login"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const CategoriesPage = lazy(() => import("@/pages/categories"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  // Using a component wrapper to handle the redirect logic cleanly
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
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
