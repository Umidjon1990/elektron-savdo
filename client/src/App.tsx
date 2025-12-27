import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProductProvider } from "@/lib/product-context";
import { TransactionProvider } from "@/lib/transaction-context";
import { CartProvider } from "@/lib/cart-context";
import { OrderProvider } from "@/lib/order-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import History from "@/pages/history";
import OrdersPage from "@/pages/orders";
import CustomersPage from "@/pages/customers";
import StoreHome from "@/pages/store/home";
import CartPage from "@/pages/store/cart";

function Router() {
  return (
    <Switch>
      {/* Admin Routes */}
      <Route path="/" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/history" component={History} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/customers" component={CustomersPage} />
      
      {/* Store Routes */}
      <Route path="/store" component={StoreHome} />
      <Route path="/store/cart" component={CartPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}

export default App;
