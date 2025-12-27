import { useState } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactions } from "@/lib/transaction-context";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, ShoppingBag, CreditCard, DollarSign, Calendar, ArrowUp, ArrowDown, Wallet, Receipt, Clock, Filter, ChevronDown, Banknote, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function History() {
  const { transactions, getStats } = useTransactions();
  const stats = getStats();
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");

  const weekDays = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];
  const chartData = weekDays.map((name, i) => ({
    name,
    total: Math.floor(Math.random() * 500000) + 100000,
    orders: Math.floor(Math.random() * 20) + 5,
  }));

  const hourlyData = Array.from({ length: 12 }, (_, i) => ({
    hour: `${9 + i}:00`,
    sales: Math.floor(Math.random() * 300000) + 50000,
  }));

  const monthlyData = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun'].map(name => ({
    name,
    total: Math.floor(Math.random() * 5000000) + 1000000,
  }));

  const categoryData = [
    { name: "Biznes", value: 35, color: "#3b82f6" },
    { name: "Bolalar", value: 25, color: "#8b5cf6" },
    { name: "O'zbek", value: 20, color: "#10b981" },
    { name: "Jahon", value: 15, color: "#f59e0b" },
    { name: "Til", value: 5, color: "#06b6d4" },
  ];

  const topProducts = [
    { name: "Atomic Habits", sold: 45, revenue: 8325000 },
    { name: "Zero to One", sold: 32, revenue: 4800000 },
    { name: "Rich Dad Poor Dad", sold: 28, revenue: 3920000 },
    { name: "O'tkan kunlar", sold: 25, revenue: 1625000 },
    { name: "1984", sold: 22, revenue: 2090000 },
  ];

  const avgOrderValue = stats.todayCount > 0 ? Math.round(stats.todayTotal / stats.todayCount) : 0;
  const prevDayTotal = stats.todayTotal * 0.85;
  const growthPercent = prevDayTotal > 0 ? ((stats.todayTotal - prevDayTotal) / prevDayTotal * 100).toFixed(1) : 0;
  const isGrowth = Number(growthPercent) >= 0;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <SidebarNav />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 md:pb-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-10 shadow-sm">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800">Moliya va Hisobotlar</h1>
            <p className="text-xs text-slate-500 hidden md:block">Savdo tahlili va statistika</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {period === "today" ? "Bugun" : period === "week" ? "Hafta" : "Oy"}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPeriod("today")}>Bugun</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod("week")}>Bu hafta</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPeriod("month")}>Bu oy</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto w-full">
          {/* Main KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isGrowth ? 'bg-white/20' : 'bg-red-500/30'}`}>
                    {isGrowth ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {growthPercent}%
                  </div>
                </div>
                <p className="text-xs opacity-80 mb-0.5">Bugungi savdo</p>
                <p className="text-xl md:text-2xl font-bold">{stats.todayTotal.toLocaleString()}</p>
                <p className="text-[10px] opacity-60 mt-1">so'm</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                    <ArrowUp className="w-3 h-3" />
                    12%
                  </div>
                </div>
                <p className="text-xs opacity-80 mb-0.5">Cheklar soni</p>
                <p className="text-xl md:text-2xl font-bold">{stats.todayCount}</p>
                <p className="text-[10px] opacity-60 mt-1">ta bugun</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-xs opacity-80 mb-0.5">O'rtacha chek</p>
                <p className="text-xl md:text-2xl font-bold">{avgOrderValue.toLocaleString()}</p>
                <p className="text-[10px] opacity-60 mt-1">so'm</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500 to-amber-600 text-white">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                    <ArrowUp className="w-3 h-3" />
                    8%
                  </div>
                </div>
                <p className="text-xs opacity-80 mb-0.5">Sotilgan kitob</p>
                <p className="text-xl md:text-2xl font-bold">{stats.totalItemsSold}</p>
                <p className="text-[10px] opacity-60 mt-1">dona jami</p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-slate-500">Naqd to'lov</p>
                  <p className="text-sm md:text-base font-bold text-slate-800">72%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-slate-500">Karta to'lov</p>
                  <p className="text-sm md:text-base font-bold text-slate-800">28%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-slate-500">Mijozlar</p>
                  <p className="text-sm md:text-base font-bold text-slate-800">156</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <Tabs defaultValue="weekly" className="w-full">
            <TabsList className="bg-white border shadow-sm mb-4">
              <TabsTrigger value="hourly" className="text-xs md:text-sm">Soatlik</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs md:text-sm">Haftalik</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs md:text-sm">Oylik</TabsTrigger>
            </TabsList>

            <TabsContent value="hourly">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    Bugungi soatlik savdo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] md:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyData}>
                        <defs>
                          <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toLocaleString()} so'm`, 'Savdo']}
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={2} fill="url(#hourlyGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weekly">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Haftalik savdo statistikasi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] md:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            name === 'total' ? `${value.toLocaleString()} so'm` : `${value} ta`,
                            name === 'total' ? 'Savdo' : 'Buyurtmalar'
                          ]}
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        />
                        <Bar dataKey="total" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Oylik savdo trendi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] md:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000000}M`} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toLocaleString()} so'm`, 'Savdo']}
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        />
                        <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Bottom Section: Categories + Top Products + Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Category Distribution */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800">Kategoriya bo'yicha</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {categoryData.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-600">{cat.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{cat.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Selling Products */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800">Eng ko'p sotilgan</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {topProducts.map((product, i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.sold} dona</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-green-600">{(product.revenue / 1000000).toFixed(1)}M</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="border-0 shadow-sm h-[380px] flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800">So'nggi cheklar</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-6">
                  <div className="space-y-3 pb-4">
                    {transactions.length === 0 ? (
                      <div className="text-center py-12">
                        <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Hozircha savdolar yo'q</p>
                      </div>
                    ) : (
                      transactions.slice(0, 10).map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.paymentMethod === 'card' ? 'bg-blue-100' : 'bg-green-100'}`}>
                              {t.paymentMethod === 'card' ? (
                                <CreditCard className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Banknote className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {t.items.length} x Mahsulot
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(t.date).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-green-600 text-sm">
                            +{t.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Summary Card */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-800 to-slate-900 text-white">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm opacity-70 mb-1">Oylik jami daromad</p>
                  <p className="text-3xl md:text-4xl font-bold">{stats.monthTotal.toLocaleString()} so'm</p>
                  <p className="text-sm opacity-70 mt-2">Oxirgi 30 kun davomida</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.totalItemsSold}</p>
                    <p className="text-xs opacity-70">Kitoblar</p>
                  </div>
                  <div className="w-px h-12 bg-white/20" />
                  <div className="text-center">
                    <p className="text-2xl font-bold">{transactions.length}</p>
                    <p className="text-xs opacity-70">Tranzaksiyalar</p>
                  </div>
                  <div className="w-px h-12 bg-white/20" />
                  <div className="text-center">
                    <div className="flex items-center gap-1 justify-center text-green-400">
                      <TrendingUp className="w-5 h-5" />
                      <span className="text-2xl font-bold">15%</span>
                    </div>
                    <p className="text-xs opacity-70">O'sish</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
