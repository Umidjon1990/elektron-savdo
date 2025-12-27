import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactions } from "@/lib/transaction-context";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ShoppingBag, CreditCard, DollarSign, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function History() {
  const { transactions, getStats } = useTransactions();
  const stats = getStats();

  // Mock data for the chart if no real data is enough
  const chartData = [
    { name: 'Mon', total: 400000 },
    { name: 'Tue', total: 300000 },
    { name: 'Wed', total: 200000 },
    { name: 'Thu', total: 278000 },
    { name: 'Fri', total: 189000 },
    { name: 'Sat', total: 239000 },
    { name: 'Sun', total: 349000 },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <SidebarNav />
      
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50 overflow-y-auto">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
          <h1 className="text-xl font-semibold">Moliya va Tarix</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bugungi Savdo</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayTotal.toLocaleString()} so'm</div>
                <p className="text-xs text-muted-foreground">+20.1% o'tgan kunga nisbatan</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cheklar Soni</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayCount} ta</div>
                <p className="text-xs text-muted-foreground">Jami muvaffaqiyatli</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sotilgan Kitoblar</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalItemsSold} dona</div>
                <p className="text-xs text-muted-foreground">Barcha vaqt davomida</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Oylik Daromad</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.monthTotal.toLocaleString()} so'm</div>
                <p className="text-xs text-muted-foreground">+12% o'tgan oyga nisbatan</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            {/* Chart */}
            <Card className="col-span-1 lg:col-span-4">
              <CardHeader>
                <CardTitle>Haftalik Statistika</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="name" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value / 1000}k`} 
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toLocaleString()} so'm`, 'Savdo']}
                        cursor={{fill: 'transparent'}}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="hsl(221 83% 53%)" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="col-span-1 lg:col-span-3 h-[400px] flex flex-col">
              <CardHeader>
                <CardTitle>So'nggi Cheklar</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-6">
                  <div className="space-y-6 pb-6">
                    {transactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Hozircha savdolar yo'q
                      </p>
                    ) : (
                      transactions.slice(0, 10).map((t) => (
                        <div key={t.id} className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {t.items.length} x Mahsulot
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(t.date).toLocaleTimeString()} • {t.paymentMethod === 'card' ? 'Karta' : 'Naqd'}
                            </p>
                          </div>
                          <div className="font-medium">
                            +{t.totalAmount.toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
