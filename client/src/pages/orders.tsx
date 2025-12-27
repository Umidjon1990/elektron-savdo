import { useState } from "react";
import { useOrders, type Order } from "@/lib/order-context";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Filter, Eye, Truck, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const statusMap = {
  new: { label: "Yangi", color: "bg-blue-100 text-blue-700", icon: Clock },
  paid: { label: "To'langan", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  shipped: { label: "Yuborilgan", color: "bg-purple-100 text-purple-700", icon: Truck },
  cancelled: { label: "Bekor qilingan", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function OrdersPage() {
  const { orders, updateOrderStatus } = useOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.customerPhone.includes(search);
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Buyurtmalar</h1>
              <p className="text-slate-500">Mijozlardan tushgan barcha buyurtmalar ro'yxati</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
              <Button>Excel yuklash</Button>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm mb-6">
            <div className="p-4 flex items-center gap-4 border-b">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="ID, ism yoki telefon orqali qidirish..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {["all", "new", "paid", "shipped", "cancelled"].map(status => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className="capitalize"
                  >
                    {status === "all" ? "Barchasi" : statusMap[status as keyof typeof statusMap]?.label}
                  </Button>
                ))}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Mijoz</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead>To'lov</TableHead>
                  <TableHead>Yetkazib berish</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const StatusIcon = statusMap[order.status].icon;
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-xs text-slate-500">{order.customerPhone}</div>
                      </TableCell>
                      <TableCell>{format(new Date(order.date), "dd MMM, HH:mm")}</TableCell>
                      <TableCell className="capitalize">{order.paymentMethod}</TableCell>
                      <TableCell>
                        {order.deliveryType === 'delivery' ? 'Kuryer' : 'Olib ketish'}
                      </TableCell>
                      <TableCell className="font-bold">
                        {order.totalAmount.toLocaleString()} so'm
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusMap[order.status].color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusMap[order.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "paid")}>
                              To'langan deb belgilash
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "shipped")}>
                              Yuborilgan deb belgilash
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "cancelled")} className="text-red-600">
                              Bekor qilish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
