import { useState } from "react";
import { useOrders } from "@/lib/order-context";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, User, Phone, ShoppingBag, Calendar } from "lucide-react";
import { format } from "date-fns";

interface CustomerData {
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  history: any[];
}

export default function CustomersPage() {
  const { orders } = useOrders();
  const [search, setSearch] = useState("");

  // Aggregate customer data from orders
  const customersMap = new Map<string, CustomerData>();

  orders.forEach(order => {
    if (!customersMap.has(order.customerPhone)) {
      customersMap.set(order.customerPhone, {
        name: order.customerName,
        phone: order.customerPhone,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: order.date,
        history: []
      });
    }
    
    const customer = customersMap.get(order.customerPhone);
    customer.totalOrders += 1;
    customer.totalSpent += order.totalAmount;
    if (new Date(order.date) > new Date(customer.lastOrderDate)) {
      customer.lastOrderDate = order.date;
    }
    customer.history.push(order);
  });

  const customers = Array.from(customersMap.values());

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Mijozlar</h1>
              <p className="text-slate-500">Doimiy mijozlar bazasi va xaridlar tarixi</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm mb-6">
            <div className="p-4 border-b">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Mijoz ismi yoki telefoni..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mijoz</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Jami Buyurtmalar</TableHead>
                  <TableHead>Jami Savdo</TableHead>
                  <TableHead>Oxirgi xarid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.phone}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                          <User className="h-4 w-4" />
                        </div>
                        {customer.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-3 w-3 text-slate-400" />
                        {customer.totalOrders} ta
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      {customer.totalSpent.toLocaleString()} so'm
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(customer.lastOrderDate), "dd MMM yyyy")}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
