import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactions } from "@/lib/transaction-context";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, ShoppingBag, CreditCard, DollarSign, Calendar, ArrowUp, ArrowDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function History() {
  const { transactions, getStats } = useTransactions();
  const stats = getStats();

  const chartData = [
    { name: 'Dush', total: 400000 },
    { name: 'Sesh', total: 300000 },
    { name: 'Chor', total: 200000 },
    { name: 'Pay', total: 278000 },
    { name: 'Jum', total: 189000 },
    { name: 'Shan', total: 239000 },
    { name: 'Yak', total: 349000 },
  ];

  const hourlyData = [
    { hour: '09', sales: 120000 },
    { hour: '10', sales: 180000 },
    { hour: '11', sales: 250000 },
    { hour: '12', sales: 320000 },
    { hour: '13', sales: 280000 },
    { hour: '14', sales: 200000 },
    { hour: '15', sales: 350000 },
    { hour: '16', sales: 420000 },
    { hour: '17', sales: 380000 },
    { hour: '18', sales: 290000 },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <SidebarNav />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 md:pb-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-10 shadow-sm">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800">Moliya va Tarix</h1>
            <p className="text-xs text-slate-500 hidden md:block">Savdo statistikasi va tahlili</p>
          </div>
          <div className="flex items-center gap-2 text-sm bg-slate-100 px-3 py-1.5 rounded-full">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-slate-700 font-medium">{new Date().toLocaleDateString('uz-UZ')}</span>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded-full">
                  <ArrowUp className="w-3 h-3" />
                  20.1%
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-1">Bugungi Savdo</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800">{stats.todayTotal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-1">so'm</p>
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-blue-600 text-xs font-semibold bg-blue-50 px-2 py-1 rounded-full">
                  <ArrowUp className="w-3 h-3" />
                  12%
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-1">Cheklar Soni</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800">{stats.todayCount}</p>
              <p className="text-[10px] text-slate-400 mt-1">ta bugun</p>
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-purple-600 text-xs font-semibold bg-purple-50 px-2 py-1 rounded-full">
                  <ArrowUp className="w-3 h-3" />
                  8%
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-1">Sotilgan Kitoblar</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800">{stats.totalItemsSold}</p>
              <p className="text-[10px] text-slate-400 mt-1">dona jami</p>
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-orange-600 text-xs font-semibold bg-orange-50 px-2 py-1 rounded-full">
                  <ArrowUp className="w-3 h-3" />
                  15%
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-1">Oylik Daromad</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800">{stats.monthTotal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-1">so'm</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 md:gap-6">
            {/* Chart */}
            <Card className="col-span-1 lg:col-span-4 border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800">Haftalik Statistika</CardTitle>
                <p className="text-xs text-slate-500">Oxirgi 7 kunlik savdo</p>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[280px] md:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value / 1000}k`} 
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toLocaleString()} so'm`, 'Savdo']}
                        cursor={{fill: 'rgba(59, 130, 246, 0.1)'}}
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="url(#colorGradient)" 
                        radius={[6, 6, 0, 0]} 
                      />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity={1}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="col-span-1 lg:col-span-3 h-[380px] md:h-[420px] flex flex-col border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800">So'nggi Cheklar</CardTitle>
                <p className="text-xs text-slate-500">Oxirgi 10 ta tranzaksiya</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-6">
                  <div className="space-y-4 pb-6">
                    {transactions.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Hozircha savdolar yo'q</p>
                      </div>
                    ) : (
                      transactions.slice(0, 10).map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <DollarSign className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {t.items.length} x Mahsulot
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(t.date).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} • {t.paymentMethod === 'card' ? 'Karta' : 'Naqd'}
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

          {/* Hourly Sales Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800">Soatlik Savdo</CardTitle>
              <p className="text-xs text-slate-500">Bugungi kun bo'yicha savdo dinamikasi</p>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] md:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <XAxis 
                      dataKey="hour" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(v) => `${v}:00`}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${value / 1000}k`} 
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toLocaleString()} so'm`, 'Savdo']}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                    />
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      fill="url(#areaGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
