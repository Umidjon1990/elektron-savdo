import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck, Package, CheckCircle2, Clock, MapPin, Phone, User, AlertCircle, Loader2
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

type DeliveryOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  totalAmount: number;
  items: Array<{ name: string; price: number; quantity: number }>;
  paymentMethod: string;
};

type DeliveryItem = {
  id: string;
  orderId: string;
  address: string;
  courier: string;
  courierId: string | null;
  status: string;
  note: string;
  createdAt: string;
  completedAt: string | null;
  order: DeliveryOrder | null;
};

type CourierData = {
  courier: { name: string; phone: string };
  storeName: string;
  active: DeliveryItem[];
  completed: DeliveryItem[];
};

export default function CourierDeliveriesPage() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<CourierData>({
    queryKey: ["courier-deliveries", token],
    queryFn: async () => {
      const res = await fetch(`/api/courier/deliveries/${token}`);
      if (!res.ok) throw new Error("Kuriyer topilmadi");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  const markDelivered = useMutation({
    mutationFn: async (deliveryId: string) => {
      const res = await fetch(`/api/courier/deliveries/${token}/${deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });
      if (!res.ok) throw new Error("Xatolik");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-deliveries", token] });
      setConfirmId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
          <p className="mt-2 text-gray-500">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-sm mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-400" />
            <h2 className="text-lg font-bold text-red-600">Kuriyer topilmadi</h2>
            <p className="text-sm text-gray-500 mt-2">Bu havola yaroqsiz yoki muddati tugagan</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: "Kutilmoqda",
    out_for_delivery: "Yo'lda",
    delivered: "Yetkazildi",
    confirmed: "Tasdiqlangan",
  };
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    out_for_delivery: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
    confirmed: "bg-emerald-100 text-emerald-700",
  };

  const confirmDelivery = data.active.find(d => d.id === confirmId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-purple-600 text-white px-4 py-4 shadow-lg">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{data.storeName}</h1>
              <p className="text-purple-200 text-sm">{data.courier.name} — Kuriyer paneli</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold text-yellow-600" data-testid="text-courier-active">{data.active.length}</p>
              <p className="text-xs text-gray-500">Faol yetkazishlar</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold text-green-600" data-testid="text-courier-done">{data.completed.length}</p>
              <p className="text-xs text-gray-500">Yetkazilgan</p>
            </CardContent>
          </Card>
        </div>

        {data.active.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-yellow-500" />
              Faol yetkazishlar
            </h2>
            {data.active.map(delivery => (
              <Card key={delivery.id} className="border-l-4 border-l-yellow-400" data-testid={`card-active-delivery-${delivery.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <User className="h-4 w-4 text-gray-400" />
                        {delivery.order?.customerName || "—"}
                      </div>
                      {delivery.order?.customerPhone && (
                        <a href={`tel:${delivery.order.customerPhone}`} className="flex items-center gap-2 text-sm text-blue-600 mt-1">
                          <Phone className="h-3.5 w-3.5" />
                          {delivery.order.customerPhone}
                        </a>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${statusColors[delivery.status] || ""}`}>
                      {statusLabels[delivery.status] || delivery.status}
                    </Badge>
                  </div>

                  {delivery.address && (
                    <div className="flex items-start gap-2 text-sm bg-gray-50 p-2 rounded-lg">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <span>{delivery.address}</span>
                    </div>
                  )}

                  {delivery.order?.items && delivery.order.items.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-2 space-y-1">
                      <p className="text-xs font-medium text-gray-600">Tovarlar:</p>
                      {delivery.order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{item.name} × {item.quantity}</span>
                          <span className="font-medium">{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold pt-1 border-t">
                        <span>Jami:</span>
                        <span>{(delivery.order?.totalAmount || 0).toLocaleString()} so'm</span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-green-500 hover:bg-green-600"
                    onClick={() => setConfirmId(delivery.id)}
                    data-testid={`button-mark-delivered-${delivery.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Yetkazib berildi
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {data.active.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-300" />
              <p className="font-medium">Hozircha faol yetkazish yo'q</p>
              <p className="text-sm mt-1">Yangi buyurtmalar kelganda bu yerda ko'rinadi</p>
            </CardContent>
          </Card>
        )}

        {data.completed.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Yetkazilganlar
            </h2>
            {data.completed.map(delivery => (
              <Card key={delivery.id} className="border-l-4 border-l-green-400 opacity-75" data-testid={`card-completed-delivery-${delivery.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{delivery.order?.customerName || "—"}</p>
                      <p className="text-xs text-gray-500">{delivery.address}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={`text-[10px] ${statusColors[delivery.status] || ""}`}>
                        {statusLabels[delivery.status] || delivery.status}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        {delivery.completedAt ? new Date(delivery.completedAt).toLocaleDateString("uz-UZ") : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Yetkazib berilganini tasdiqlash
            </DialogTitle>
          </DialogHeader>
          {confirmDelivery && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-medium">{confirmDelivery.order?.customerName}</p>
                <p className="text-xs text-gray-500">{confirmDelivery.address}</p>
                <p className="text-sm font-bold text-green-700 mt-1">{(confirmDelivery.order?.totalAmount || 0).toLocaleString()} so'm</p>
              </div>
              <p className="text-sm text-gray-600">Bu buyurtma yetkazib berilganini tasdiqlaysizmi? Admin buni ko'rib chiqadi.</p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmId(null)}>Bekor qilish</Button>
            <Button
              className="bg-green-500 hover:bg-green-600"
              onClick={() => { if (confirmId) markDelivered.mutate(confirmId); }}
              disabled={markDelivered.isPending}
              data-testid="button-confirm-delivered"
            >
              {markDelivered.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Ha, yetkazildi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
