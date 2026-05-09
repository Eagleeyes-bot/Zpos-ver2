import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs } from '../lib/firebase';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useShop } from '../lib/ShopContext';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  Smartphone, 
  Users, 
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Download,
  X,
  Mail,
  Printer,
  Store as StoreIcon,
  ShoppingCart,
  Activity,
  HardDrive,
  ShieldCheck,
  ChevronRight,
  Clock,
  PlusCircle,
  History,
  Target,
  Scan,
  Loader2
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';
import InvoiceTemplate from '../components/InvoiceTemplate';
import { generateInvoicePDF, printInvoicePDF, generateBusinessReport, BusinessReportData } from '../lib/pdfManager';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, getAllUsers, getUserUsage } = useAuth();
  const { selectedBranch, setSelectedBranch } = useShop();
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCost: 0,
    totalProfit: 0,
    inventoryCount: 0,
    customerCount: 0,
    activeInstallments: 0,
    inventoryValue: 0
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [branchTotals, setBranchTotals] = useState<any[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<any[]>([]);
  const [chartTimeRange, setChartTimeRange] = useState<'7d' | '30d' | '6mo'>('6mo');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Admin state
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      setAllUsers(getAllUsers());
    }
  }, [isAdmin, getAllUsers]);

  useEffect(() => {
    if (!user || isAdmin) return;

    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('userId', '==', user.uid)), (snap) => {
      const salesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      // Calculate totals by branch and month
      const branchMap: Record<string, { revenue: number, cost: number, profit: number }> = {};
      const monthMap: Record<string, { name: string, sales: number, cost: number, profit: number, sortKey: string }> = {};

      salesData.forEach(sale => {
        const branch = sale.branchName || 'Unassigned';
        const saleDate = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date();
        const monthYear = format(saleDate, 'MMM yyyy');
        const sortKey = format(saleDate, 'yyyy-MM');

        // Branch stats
        if (!branchMap[branch]) {
          branchMap[branch] = { revenue: 0, cost: 0, profit: 0 };
        }
        
        const saleRevenue = Number(sale.finalAmount || sale.totalAmount || sale.amount || 0);
        const saleCost = (Number(sale.totalCost) > 0) ? Number(sale.totalCost) : (sale.items?.reduce((acc: number, item: any) => {
          const itemCost = Number(item.costPrice || item.cost || item.buyingPrice || 0);
          const itemQty = Number(item.quantity || 1);
          return acc + (itemCost * itemQty);
        }, 0) || 0);
        
        branchMap[branch].revenue += saleRevenue;
        branchMap[branch].cost += saleCost;
        branchMap[branch].profit += (saleRevenue - saleCost);

        // Monthly stats
        if (!monthMap[sortKey]) {
          monthMap[sortKey] = { name: monthYear, sales: 0, cost: 0, profit: 0, sortKey };
        }
        monthMap[sortKey].sales += saleRevenue;
        monthMap[sortKey].cost += saleCost;
        monthMap[sortKey].profit += (saleRevenue - saleCost);
      });

      // Transform and Sort
      const totalsArray = Object.entries(branchMap).map(([name, data]) => ({ 
        name, 
        revenue: data.revenue, 
        cost: data.cost,
        profit: data.profit 
      }));
      
      const sortedTotals = totalsArray.sort((a, b) => b.revenue - a.revenue);
      
      if (sortedTotals.length > 1) {
        const global = sortedTotals.reduce((acc, curr) => ({
          name: 'ALL Branch',
          revenue: acc.revenue + curr.revenue,
          cost: acc.cost + curr.cost,
          profit: acc.profit + curr.profit
        }), { name: 'ALL Branch', revenue: 0, cost: 0, profit: 0 });
        setBranchTotals([global, ...sortedTotals]);
      } else {
        setBranchTotals(sortedTotals);
      }

      // Filter Monthly totals by selected range for the chart if needed
      // Actually setMonthlyTotals can hold all, UI filters what to show
      const monthlyArray = Object.values(monthMap)
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      setMonthlyTotals(monthlyArray);

      // Current view stats (Filtered by branch if needed)
      const filteredByBranch = selectedBranch === 'all' 
        ? salesData 
        : salesData.filter(s => s.branchName === selectedBranch);

      let revenueTotal = 0;
      let costTotal = 0;
      filteredByBranch.forEach(s => {
        const saleRevenue = Number(s.finalAmount || s.totalAmount || s.total || 0);
        const saleCost = (Number(s.totalCost) > 0) ? Number(s.totalCost) : (s.items?.reduce((acc: number, item: any) => {
          const itemCost = Number(item.costPrice || item.cost || item.buyingPrice || 0);
          const itemQty = Number(item.quantity || 1);
          return acc + (itemCost * itemQty);
        }, 0) || 0);
        
        revenueTotal += saleRevenue;
        costTotal += saleCost;
      });

      setStats(prev => ({ 
        ...prev, 
        totalSales: revenueTotal,
        totalCost: costTotal,
        totalProfit: revenueTotal - costTotal
      }));
      
      setRecentSales(filteredByBranch.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sales'));

    const unsubDevices = onSnapshot(query(collection(db, 'devices'), where('userId', '==', user.uid)), (snap) => {
      const devices = snap.docs.map(doc => doc.data() as any);
      const filteredDevices = selectedBranch === 'all' 
        ? devices 
        : devices.filter(d => d.branchName === selectedBranch);
        
      const totalStockValue = filteredDevices.reduce((acc, d) => acc + (Number(d.costPrice) || 0), 0);
      
      setStats(prev => ({ 
        ...prev, 
        inventoryCount: filteredDevices.length,
        inventoryValue: totalStockValue
      }));
    });

    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), where('userId', '==', user.uid)), (snap) => {
      setStats(prev => ({ ...prev, customerCount: snap.size }));
    });

    const unsubInstallments = onSnapshot(query(collection(db, 'installments'), where('userId', '==', user.uid)), (snap) => {
      const active = snap.docs.filter(doc => doc.data().status === 'active').length;
      setStats(prev => ({ ...prev, activeInstallments: active }));
    });

    return () => {
      unsubSales();
      unsubDevices();
      unsubCustomers();
      unsubInstallments();
    };
  }, [selectedBranch, user, isAdmin]);

  const handleDownloadInvoice = async (printOnly = false) => {
    if (!selectedSale) return;
    if (printOnly) setIsPrinting(true);
    else setIsGeneratingPDF(true);

    try {
      if (printOnly) {
        await printInvoicePDF('invoice-capture-dash');
      } else {
        const filename = `Invoice-${selectedSale.branchName?.replace(/\s+/g, '_') || 'General'}-${selectedSale.id.slice(-8)}`;
        await generateInvoicePDF('invoice-capture-dash', filename);
      }
    } finally {
      if (printOnly) setIsPrinting(false);
      else setIsGeneratingPDF(false);
    }
  };

  const handleGenerateFullReport = async () => {
    if (!user) return;
    setIsGeneratingReport(true);

    try {
      // We already have some data in state, but let's fetch fresh or use current snapshot data
      // For consistency, let's fetch fresh to ensure we get everything if snapshots were limited
      const salesQuery = query(collection(db, 'sales'), where('userId', '==', user.uid));
      const salesSnap = await getDocs(salesQuery);
      const salesData = salesSnap.docs.map(doc => doc.data());

      const installmentsQuery = query(collection(db, 'installments'), where('userId', '==', user.uid));
      const installmentsSnap = await getDocs(installmentsQuery);
      const installmentsData = installmentsSnap.docs.map(doc => doc.data());

      const customersQuery = query(collection(db, 'customers'), where('userId', '==', user.uid));
      const customersSnap = await getDocs(customersQuery);
      const customersMap = Object.fromEntries(customersSnap.docs.map(doc => [doc.id, doc.data().name]));

      const salesMap = Object.fromEntries(salesSnap.docs.map(doc => [doc.id, doc.data()]));

      let totalSales = 0;
      let totalCost = 0;
      const brandSales: Record<string, number> = {};
      const monthlyData: Record<string, number> = {};

      salesData.forEach(sale => {
        const amount = Number(sale.finalAmount || sale.totalAmount || sale.total || 0);
        const cost = (Number(sale.totalCost) > 0) ? Number(sale.totalCost) : (sale as any).items?.reduce((acc: number, item: any) => {
          const itemCost = Number(item.costPrice || item.cost || item.buyingPrice || 0);
          const itemQty = Number(item.quantity || 1);
          return acc + (itemCost * itemQty);
        }, 0) || 0;
        
        totalSales += amount;
        totalCost += cost;

        const brand = sale.brand || (sale as any).items?.[0]?.brand || 'Other';
        brandSales[brand] = (brandSales[brand] || 0) + amount;

        if (sale.createdAt?.toDate) {
          const month = format(sale.createdAt.toDate(), 'MMM yyyy');
          monthlyData[month] = (monthlyData[month] || 0) + amount;
        }
      });

      const topBrands = Object.entries(brandSales)
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      const monthlySales = Object.entries(monthlyData)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      const activeInstallmentsCount = installmentsData
        .filter(i => i.status === 'active')
        .map(i => {
          let deviceName = i.deviceName;
          if (!deviceName && i.saleId && salesMap[i.saleId]) {
            const sale = salesMap[i.saleId];
            if (sale.items && Array.isArray(sale.items)) {
              deviceName = sale.items.map((item: any) => `${item.brand} ${item.model}`).join(', ');
            }
          }
          
          return {
            customer: customersMap[i.customerId] || 'Unknown Customer',
            device: deviceName || 'Mobile Unit',
            remaining: (i.totalAmount || 0) - (i.paidAmount || 0),
            nextDueDate: i.nextDueDate || 'TBD'
          };
        });

      const reportData: BusinessReportData = {
        totalSales,
        totalCost,
        totalProfit: totalSales - totalCost,
        topBrands,
        monthlySales,
        activeInstallments: activeInstallmentsCount,
        userEmail: user.email!
      };

      await generateBusinessReport(reportData);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const branchDisplay = selectedBranch === 'all' ? 'Across ALL Branch' : `${selectedBranch} Performance`;

  if (isAdmin) {
    const totalData = allUsers.reduce((acc, u) => acc + parseFloat(getUserUsage(u.uid)), 0).toFixed(2);
    const activeToday = allUsers.filter(u => u.lastLogin && new Date(u.lastLogin).toDateString() === new Date().toDateString()).length;

    return (
      <div className="space-y-10 pb-20 animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-[10px] font-black text-sky-600 uppercase tracking-[0.2em]">Global Monitor</span>
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              Admin <span className="text-sky-600">Dashboard</span>
            </h2>
            <p className="text-gray-500 font-medium mt-2">Real-time system-wide analytics and resource monitoring.</p>
          </div>
          <div className="bg-sky-50 px-6 py-3 rounded-2xl border border-sky-100 flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest leading-none">Security Status</p>
              <p className="text-sm font-black text-sky-900 mt-1">OPTIMAL</p>
            </div>
            <div className="w-px h-8 bg-sky-100" />
            <ShieldCheck className="w-6 h-6 text-sky-600" />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-2 group hover:border-sky-100 transition-all">
            <div className="bg-sky-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-sky-600" />
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Users</p>
            <p className="text-3xl font-black text-gray-900">{allUsers.length}</p>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-2 group hover:border-emerald-100 transition-all">
            <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Active Today</p>
            <p className="text-3xl font-black text-gray-900">{activeToday}</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-2 group hover:border-purple-100 transition-all">
            <div className="bg-purple-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Storage Used</p>
            <p className="text-3xl font-black text-gray-900">{totalData} MB</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-2 group hover:border-amber-100 transition-all">
            <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Server Uptime</p>
            <p className="text-lg font-black text-gray-900 mt-1">99.9% Uptime</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-gray-900">User Data Allocation</h3>
                <p className="text-sm text-gray-500 font-medium">Top resource-consuming accounts</p>
              </div>
              <div className="bg-gray-50 p-2 rounded-xl">
                <BarChart className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allUsers.slice(0, 7).map(u => ({ name: u.displayName || u.email.split('@')[0], usage: parseFloat(getUserUsage(u.uid)) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '16px' }}
                    itemStyle={{ fontWeight: 800, color: '#0ea5e9' }}
                  />
                  <Bar dataKey="usage" fill="#0ea5e9" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900">System Logs</h3>
              <div className="bg-sky-50 px-3 py-1 rounded-full text-[9px] font-black text-sky-600 uppercase tracking-widest">
                Real-time
              </div>
            </div>
            <div className="space-y-4">
              {allUsers.filter(u => u.lastLogin).slice(0, 5).map((u, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-sky-100 transition-all group">
                  <div className="mt-1">
                    <Activity className="w-4 h-4 text-sky-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-900 leading-tight">
                      {u.displayName || u.email} <span className="text-gray-400 font-bold">accessed the system</span>
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                      {format(new Date(u.lastLogin), 'HH:mm • MMM dd')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-4 bg-gray-50 text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100">
              View Detailed System Logs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">{branchDisplay}</span>
          </div>
          <h1 className="text-4xl font-black text-sky-900 tracking-tight text-balance">{t('dashboard')}</h1>
          <p className="text-sky-500 font-medium mt-1 italic tracking-widest opacity-80">အရဟံ • ZPOS Analytics</p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="bg-sky-50/30 border border-sky-100 rounded-2xl p-3 px-4 shadow-sm flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest leading-none">{t('system_time')}</p>
              <p className="text-sm font-mono font-bold text-sky-900">{format(new Date(), 'HH:mm:ss')}</p>
            </div>
            <div className="w-px h-8 bg-sky-100" />
            <div className="text-right">
              <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest leading-none">{t('date')}</p>
              <p className="text-sm font-mono font-bold text-sky-900">{format(new Date(), 'MMM dd, yyyy')}</p>
            </div>
          </div>
          
          <button 
            onClick={handleGenerateFullReport}
            disabled={isGeneratingReport}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
          >
            {isGeneratingReport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Life Cycle Report
              </>
            )}
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: t('total_sales'), value: `฿${stats.totalSales.toLocaleString()}`, icon: TrendingUp, trend: '+12.5%', color: 'blue' },
          { label: 'COGS (Paid)', value: `฿${stats.totalCost.toLocaleString()}`, icon: ShoppingCart, trend: '+8.2%', color: 'rose' },
          { label: t('net_profit'), value: `฿${stats.totalProfit.toLocaleString()}`, icon: ArrowUpRight, trend: '+15.8%', color: 'emerald' },
          { label: 'Stock Value', value: `฿${stats.inventoryValue.toLocaleString()}`, icon: Smartphone, trend: `${Math.round((stats.inventoryValue / (stats.totalSales || 1)) * 10)}% Inv`, color: 'slate' },
          { label: t('active_customers'), value: stats.customerCount.toLocaleString(), icon: Users, trend: '+5 new', color: 'indigo' },
          { label: t('orders'), value: stats.activeInstallments.toLocaleString(), icon: CreditCard, trend: `${stats.activeInstallments} active`, color: 'orange' },
        ].map((stat, i) => (
          <div key={i} className="group relative bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className={`absolute top-5 right-5 p-2 rounded-xl scale-90 ${
              stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
              stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              stat.color === 'rose' ? 'bg-rose-50 text-rose-600' :
              stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
              stat.color === 'orange' ? 'bg-orange-50 text-orange-600' :
              'bg-slate-50 text-slate-600'
            } group-hover:scale-100 transition-transform`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-xl font-black text-gray-900 mt-1 tracking-tight leading-none truncate pr-8">{stat.value}</h3>
            <div className="flex items-center gap-1.5 mt-3">
              <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-tighter ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                {stat.trend.startsWith('+') ? <ArrowUpRight className="w-2 h-2" /> : <Activity className="w-2 h-2" />}
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Branch Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Quick Actions */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            <h3 className="text-xl font-black text-gray-900 tracking-tight italic">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'New Transaction', icon: PlusCircle, path: '/sales', color: 'blue' },
              { label: 'Add Inventory', icon: Smartphone, path: '/inventory', color: 'emerald' },
              { label: 'New Customer', icon: Users, path: '/customers', color: 'purple' },
              { label: 'Stock Scan', icon: Scan, path: '/stock-checker', color: 'amber' },
              { label: 'Sales History', icon: History, path: '/sales', color: 'slate' }
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 hover:bg-white hover:shadow-lg transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl transition-all group-hover:scale-110",
                    action.color === 'blue' ? "bg-blue-100 text-blue-600" :
                    action.color === 'emerald' ? "bg-emerald-100 text-emerald-600" :
                    action.color === 'purple' ? "bg-purple-100 text-purple-600" :
                    action.color === 'amber' ? "bg-amber-100 text-amber-600" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{action.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-900" />
              </button>
            ))}
          </div>
        </div>
      
        {/* Branch Breakdown Section */}
        <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <StoreIcon className="w-6 h-6 text-blue-600" />
                {t('performance_by_branch')}
              </h3>
              <p className="text-sm text-gray-500 font-medium">Click a branch to filter dashboard data</p>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-2xl flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedBranch === 'all' ? 'Filtering: All' : `Target: ${selectedBranch}`}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {branchTotals.map((branch, i) => (
              <button 
                key={i} 
                onClick={() => setSelectedBranch(branch.name === 'ALL Branch' ? 'all' : branch.name)}
                className={cn(
                  "p-6 rounded-[2rem] border transition-all flex flex-col justify-between text-left group hover:scale-[1.02] active:scale-95",
                  (selectedBranch === (branch.name === 'ALL Branch' ? 'all' : branch.name))
                    ? "bg-blue-600 border-blue-600 shadow-2xl shadow-blue-200" 
                    : "bg-gray-50 border-transparent hover:border-blue-100 hover:bg-white"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-widest leading-none",
                      (selectedBranch === (branch.name === 'ALL Branch' ? 'all' : branch.name)) ? 'text-blue-100' : 'text-gray-400'
                    )}>
                      {branch.name}
                    </p>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      (selectedBranch === (branch.name === 'ALL Branch' ? 'all' : branch.name)) ? 'bg-white animate-pulse' : 'bg-gray-200'
                    )} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className={cn("text-[8px] font-black", (selectedBranch === (branch.name === 'ALL Branch' ? 'all' : branch.name)) ? 'text-blue-100/60' : 'text-gray-400')}>REVENUE</span>
                      <span className={cn("text-lg font-black tracking-tight", (selectedBranch === (branch.name === 'ALL Branch' ? 'all' : branch.name)) ? 'text-white' : 'text-gray-900')}>
                        ฿{branch.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-black/5">
                      <div className="flex flex-col">
                        <span className={cn("text-[8px] font-black", (selectedBranch === (branch.name === 'ALL Branch' ? 'all' : branch.name)) ? 'text-blue-200/60' : 'text-sky-600')}>PROFIT</span>
                        <span className={cn("text-xs font-black", (selectedBranch === (branch.name === 'ALL Branch' ? 'all' : branch.name)) ? 'text-white' : 'text-sky-600')}>
                          ฿{branch.profit.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className={cn("text-[8px] font-black", (selectedBranch === (branch.name === 'ALL Branch' ? 'all' : branch.name)) ? 'text-white/40' : 'text-gray-400')}>PCT</span>
                        <span className={cn("text-[10px] font-black", (selectedBranch === (branch.name === 'ALL Branch' ? 'all' : branch.name)) ? 'text-white' : 'text-gray-500')}>
                          {Math.round((branch.profit / (branch.revenue || 1)) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {branchTotals.length === 0 && (
              <div className="col-span-full py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                <StoreIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No branch data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 italic">
                <Target className="w-6 h-6 text-indigo-600" />
                Monthly Analytics
              </h3>
              <p className="text-sm text-gray-500 font-medium italic">Combined Revenue & Profit trends</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
                {[
                  { id: '7d', label: '7D' },
                  { id: '30d', label: '30D' },
                  { id: '6mo', label: '6M' }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setChartTimeRange(r.id as any)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all",
                      chartTimeRange === r.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-lg text-[9px] font-black text-blue-600 uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Revenue
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-lg text-[9px] font-black text-emerald-600 uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 text-[8px]" /> Profit
                </div>
              </div>
            </div>
          </div>
          <div className="w-full h-80 min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTotals.slice(chartTimeRange === '7d' ? -1 : (chartTimeRange === '30d' ? -2 : -6))}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                  itemStyle={{ fontWeight: 700, fontSize: '10px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-sky-600 rounded-full" />
              <h3 className="text-xl font-black text-gray-900 tracking-tight italic">{t('recent_sales_title')}</h3>
            </div>
            <button 
              onClick={() => navigate('/sales')}
              className="p-2 hover:bg-sky-50 rounded-xl transition-all group"
            >
              <History className="w-5 h-5 text-gray-300 group-hover:text-sky-600" />
            </button>
          </div>
          <div className="space-y-6">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center gap-4 group cursor-pointer">
                <div className="bg-gray-50 p-3 rounded-2xl group-hover:bg-blue-50 transition-colors">
                  <ShoppingCart className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                </div>
                <div className="flex-1 min-w-0" onClick={() => { setSelectedSale(sale); setShowInvoiceModal(true); }}>
                  <p className="text-sm font-bold text-gray-900 truncate">Sale #{sale.id.slice(-6).toUpperCase()}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {sale.createdAt?.toDate ? format(sale.createdAt.toDate(), 'HH:mm • MMM dd') : '...'}
                  </p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900 tracking-tight">฿{sale.finalAmount.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{sale.paymentMethod}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedSale(sale);
                      setShowInvoiceModal(true);
                    }}
                    className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <div className="text-center py-12 flex flex-col items-center opacity-30">
                <ShoppingCart className="w-12 h-12 mb-4 text-gray-300" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('no_orders')}</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/sales')}
            className="w-full mt-8 py-4 bg-gray-50 text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 shadow-sm shadow-gray-50"
          >
            View All Transactions
          </button>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && selectedSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-[2.5rem] p-10 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">Invoice Viewer</h3>
            <p className="text-gray-500 font-medium mt-2 leading-relaxed">
              #{selectedSale.id.slice(-8).toUpperCase()} • THB {selectedSale.finalAmount.toLocaleString()}
            </p>
            
            <div className="grid grid-cols-1 gap-3 mt-8">
              <button 
                onClick={handleDownloadInvoice}
                disabled={isGeneratingPDF}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
              >
                {isGeneratingPDF ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download PDF
              </button>
              
              <button 
                onClick={() => handleDownloadInvoice(true)}
                disabled={isPrinting}
                className="w-full py-4 bg-gray-50 text-gray-700 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 disabled:opacity-50"
              >
                {isPrinting ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Print Now
              </button>

              <div className="pt-4">
                <button 
                  onClick={() => setShowInvoiceModal(false)}
                  className="w-full py-4 text-gray-400 font-bold text-sm hover:text-gray-900 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Invoice for Capture */}
      <div className="fixed -left-[10000px] top-0 pointer-events-none">
        {selectedSale && (
          <InvoiceTemplate 
            id="invoice-capture-dash"
            invoiceId={selectedSale.id}
            date={selectedSale.createdAt?.toDate ? selectedSale.createdAt.toDate() : new Date()}
            branchName={selectedSale.branchName}
            customer={{
              name: selectedSale.customerName || 'Walk-in Customer',
              phone: selectedSale.customerPhone || 'N/A',
              email: selectedSale.customerEmail,
              address: selectedSale.customerAddress
            }}
            items={selectedSale.items || []}
            subtotal={selectedSale.totalAmount}
            discount={selectedSale.discount}
            finalTotal={selectedSale.finalAmount}
            paymentMethod={selectedSale.paymentMethod}
          />
        )}
      </div>
    </div>
  );
}
