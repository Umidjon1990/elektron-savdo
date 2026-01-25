import { useState } from "react";
import { useOrders } from "@/lib/order-context";
import type { Order } from "@/lib/order-context";
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
import { Search, MoreVertical, Filter, Truck, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Package } from "lucide-react";
import { format } from "date-fns";

const statusMap = {
  new: { label: "Yangi", color: "bg-blue-100 text-blue-700", icon: Clock },
  paid: { label: "To'langan", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  shipped: { label: "Yuborilgan", color: "bg-purple-100 text-purple-700", icon: Truck },
  cancelled: { label: "Bekor qilingan", color: "bg-red-100 text-red-700", icon: XCircle },
};

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

function OrderDetailsRow({ order, isExpanded, onToggle }: { order: Order; isExpanded: boolean; onToggle: () => void }) {
  const StatusIcon = statusMap[order.status as keyof typeof statusMap]?.icon || Clock;
  const items = (order.items as OrderItem[]) || [];
  
  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-slate-50"
        onClick={onToggle}
        data-testid={`order-row-${order.id}`}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
            #{order.id.slice(0, 8)}...
          </div>
        </TableCell>
        <TableCell>
          <div className="font-medium">{order.customerName}</div>
          <div className="text-xs text-slate-500">{order.customerPhone}</div>
        </TableCell>
        <TableCell>{format(new Date(order.createdAt), "dd MMM, HH:mm")}</TableCell>
        <TableCell className="capitalize">{order.paymentMethod}</TableCell>
        <TableCell>
          {order.deliveryType === 'delivery' ? 'Kuryer' : 'Olib ketish'}
        </TableCell>
        <TableCell className="font-bold">
          {order.totalAmount.toLocaleString()} so'm
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className={statusMap[order.status as keyof typeof statusMap]?.color}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {statusMap[order.status as keyof typeof statusMap]?.label}
          </Badge>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <OrderActionsMenu order={order} />
        </TableCell>
      </TableRow>
      
      {isExpanded && (
        <TableRow className="bg-slate-50">
          <TableCell colSpan={8} className="p-0">
            <div className="p-4 border-t border-slate-200">
              <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Buyurtma tafsilotlari ({items.length} ta mahsulot)
              </h4>
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-slate-600">Mahsulot nomi</th>
                      <th className="text-center p-3 text-sm font-medium text-slate-600">Soni</th>
                      <th className="text-right p-3 text-sm font-medium text-slate-600">Narxi</th>
                      <th className="text-right p-3 text-sm font-medium text-slate-600">Jami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t border-slate-100">
                        <td className="p-3 font-medium">{item.productName}</td>
                        <td className="p-3 text-center">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            {item.quantity} dona
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {item.price.toLocaleString()} so'm
                        </td>
                        <td className="p-3 text-right font-bold">
                          {(item.price * item.quantity).toLocaleString()} so'm
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={3} className="p-3 text-right font-semibold">Jami summa:</td>
                      <td className="p-3 text-right font-bold text-lg text-green-600">
                        {order.totalAmount.toLocaleString()} so'm
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function OrderActionsMenu({ order }: { order: Order }) {
  const { updateOrderStatus } = useOrders();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid={`order-actions-${order.id}`}>
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
  );
}

export default function OrdersPage() {
  const { orders } = useOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.customerPhone.includes(search);
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

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
                  data-testid="order-search-input"
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
                    data-testid={`filter-${status}`}
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
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Buyurtmalar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <OrderDetailsRow 
                      key={order.id}
                      order={order}
                      isExpanded={expandedOrders.has(order.id)}
                      onToggle={() => toggleOrder(order.id)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
