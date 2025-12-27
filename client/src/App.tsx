import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProductProvider } from "@/lib/product-context";
import { TransactionProvider } from "@/lib/transaction-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import History from "@/pages/history";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/history" component={History} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductProvider>
        <TransactionProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </TransactionProvider>
      </ProductProvider>
    </QueryClientProvider>
  );
}

export default App;
