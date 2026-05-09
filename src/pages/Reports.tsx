import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  Timestamp 
} from '../lib/firebase';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { generateInvoicePDF } from '../lib/pdfManager';
import { 
  FileBarChart, 
  ArrowDownToLine, 
  AlertTriangle, 
  Smartphone, 
  TrendingUp,
  Package,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function Reports() {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState<any[]>([]);
  const [missingDevices, setMissingDevices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Current Month Sales
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const salesQ = query(
      collection(db, 'sales'),
      where('userId', '==', user.uid),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );
    
    const unsubSales = onSnapshot(salesQ, (snap) => {
      setSalesData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sales'));

    // Missing Devices
    const unsubMissing = onSnapshot(query(
      collection(db, 'devices'),
      where('userId', '==', user.uid),
      where('status', '==', 'missing')
    ), (snap) => {
      setMissingDevices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Suppliers & Stock
    const unsubSuppliers = onSnapshot(query(
      collection(db, 'suppliers'),
      where('userId', '==', user.uid)
    ), (snap) => {
      setSuppliers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubStock = onSnapshot(query(
      collection(db, 'devices'),
      where('userId', '==', user.uid)
    ), (snap) => {
      const brands: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const brand = doc.data().brand;
        brands[brand] = (brands[brand] || 0) + 1;
      });
      setStockSummary(Object.entries(brands).map(([name, value]) => ({ name, value })));
    });

    return () => {
      unsubSales();
      unsubMissing();
      unsubSuppliers();
      unsubStock();
    };

  }, [user]);

  const totals = salesData.reduce((acc, curr) => {
    const revenue = Number(curr.finalAmount || curr.totalAmount || curr.total || 0);
    const cost = Number(curr.totalCost || 0) || (curr as any).items?.reduce((iAcc: number, item: any) => {
      const itemCost = Number(item.costPrice || item.cost || item.buyingPrice || 0);
      const itemQty = Number(item.quantity || 1);
      return iAcc + (itemCost * itemQty);
    }, 0) || 0;
    
    return {
      revenue: acc.revenue + revenue,
      cost: acc.cost + cost,
      profit: acc.profit + (revenue - cost)
    };
  }, { revenue: 0, cost: 0, profit: 0 });

  const totalSalesThisMonth = totals.revenue;
  const totalCostThisMonth = totals.cost;
  const totalProfitThisMonth = totals.profit;

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleExportPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const filename = `Business-Report-${format(new Date(), 'yyyy-MM-dd')}`;
      await generateInvoicePDF('report-content', filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div id="report-content" className="space-y-8 pb-12 bg-gray-50 p-4 rounded-[2.5rem]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1 block">Analytics Engine</span>
          <h1 className="text-4xl font-black text-blue-900 tracking-tight">Business Intelligence</h1>
          <p className="text-gray-500 font-medium mt-1">Granular insights into inventory and revenue performance.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Overview Card */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-gray-900">Monthly Sales Summary</h3>
              <p className="text-sm text-gray-500 font-medium">Performance for {format(new Date(), 'MMMM yyyy')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Mtd Revenue</p>
              <p className="text-3xl font-black text-gray-900">THB {totalSalesThisMonth.toLocaleString()}</p>
              <div className="flex items-center justify-end gap-4 mt-2">
                <div className="text-right">
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">COGS</p>
                  <p className="text-xs font-black text-gray-700">THB {totalCostThisMonth.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Net Profit</p>
                  <p className="text-xs font-black text-emerald-600">THB {totalProfitThisMonth.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-80 min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockSummary}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Missing Devices Alert Panel */}
        <div className="bg-rose-50 rounded-[2.5rem] border border-rose-100 shadow-xl p-8 flex flex-col">
          <div className="flex items-center gap-3 text-rose-600 mb-6 font-black uppercase tracking-widest text-xs">
            <AlertTriangle className="w-5 h-5" />
            Stock At Risk (Missing)
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 max-h-[400px] pr-2">
            {missingDevices.map((device) => (
              <div key={device.id} className="bg-white p-4 rounded-2xl border border-rose-100 flex items-center justify-between group cursor-pointer hover:bg-white transition-all">
                <div>
                  <p className="text-sm font-black text-gray-900 tracking-tight">{device.model}</p>
                  <p className="text-[10px] font-mono font-bold text-gray-400 mt-0.5">{device.imei}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-rose-600">THB {device.sellingPrice?.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {missingDevices.length === 0 && (
              <div className="text-center py-20 opacity-50">
                <Package className="w-10 h-10 text-rose-200 mx-auto mb-2" />
                <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">No Missing Assets</p>
              </div>
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-rose-200">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Est. Loss Value</p>
                <p className="text-2xl font-black text-rose-600 tracking-tighter">
                  THB {missingDevices.reduce((acc, d) => acc + d.costPrice, 0).toLocaleString()}
                </p>
              </div>
              <button className="text-xs font-black text-rose-600 flex items-center gap-1 hover:underline">
                Audit Log <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Supplier Summary Table */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8">
          <h3 className="text-xl font-black text-gray-900 mb-6">Supplier Strategic Report</h3>
          <div className="space-y-4">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="flex items-center justify-between p-4 bg-gray-100 rounded-2xl border border-transparent hover:border-gray-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{supplier.name}</p>
                    <p className="text-xs text-gray-500 font-medium">{supplier.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Units Provided</span>
                  <p className="font-black text-gray-900">42</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Breakdown */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8">
          <h3 className="text-xl font-black text-gray-900 mb-6">Inventory Composition</h3>
          <div className="w-full h-80 min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockSummary}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stockSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={10} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {stockSummary.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
