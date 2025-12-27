import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProductProvider } from "@/lib/product-context";
import { TransactionProvider } from "@/lib/transaction-context";
import { CartProvider } from "@/lib/cart-context";
import { OrderProvider } from "@/lib/order-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import History from "@/pages/history";
import OrdersPage from "@/pages/orders";
import CustomersPage from "@/pages/customers";
import StoreHome from "@/pages/store/home";
import CartPage from "@/pages/store/cart";
import LoginPage from "@/pages/auth/login";

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
                  <Router />
                  <Toaster />
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
