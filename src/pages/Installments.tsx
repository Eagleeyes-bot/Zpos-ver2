import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot,
  doc, 
  updateDoc,
  arrayUnion,
  Timestamp,
  where
} from '../lib/firebase';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { 
  ReceiptIndianRupee, 
  Search, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  ArrowUpRight,
  Plus,
  Smartphone,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

export default function Installments() {
  const { user } = useAuth();
  const [installments, setInstallments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsubI = onSnapshot(query(collection(db, 'installments'), where('userId', '==', user.uid)), (snap) => {
      setInstallments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubC = onSnapshot(query(collection(db, 'customers'), where('userId', '==', user.uid)), (snap) => {
      const cMap: Record<string, any> = {};
      snap.docs.forEach(doc => cMap[doc.id] = doc.data());
      setCustomers(cMap);
    });

    return () => { unsubI(); unsubC(); };
  }, [user]);

  const handleMakePayment = async () => {
    if (!selectedPlan || !paymentAmount) return;
    
    try {
      const amount = Number(paymentAmount);
      const newRemaining = selectedPlan.remainingAmount - amount;
      const newStatus = newRemaining <= 0 ? 'completed' : selectedPlan.status;

      await updateDoc(doc(db, 'installments', selectedPlan.id), {
        remainingAmount: newRemaining,
        status: newStatus,
        payments: arrayUnion({
          amount,
          date: Timestamp.now(),
          note: `Regular installment payment`
        })
      });

      setSelectedPlan(null);
      setPaymentAmount('');
      alert("Payment processed successfully!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `installments/${selectedPlan.id}`);
    }
  };

  const filtered = installments.filter(i => {
    const customer = customers[i.customerId]?.name?.toLowerCase() || '';
    return customer.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1 block">Account Receivables</span>
          <h1 className="text-4xl font-black text-blue-900 tracking-tight">Payment Plans</h1>
          <p className="text-gray-500 font-medium mt-1">Track installment health and process collections.</p>
        </div>
      </header>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Plans', value: installments.filter(i => i.status === 'active').length, icon: Clock, color: 'blue' },
          { label: 'Outstanding Balance', value: `THB ${installments.reduce((acc, i) => acc + i.remainingAmount, 0).toLocaleString()}`, icon: ReceiptIndianRupee, color: 'orange' },
          { label: 'Collection Rate', value: '94.2%', icon: TrendingUp, color: 'emerald' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-4 rounded-2xl bg-${s.color}-50 text-${s.color}-600`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
        <input 
          type="text" 
          placeholder="Search by customer name..." 
          className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-100/50 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
        {filtered.map((item) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedPlan(item)}
            className="group bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-gray-900 text-lg tracking-tight">{customers[item.customerId]?.name || 'Unknown Customer'}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan #{item.id.slice(-6)}</span>
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{item.numberOfMonths} Months</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-12 text-right">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                <span className={clsx(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                  {
                    'bg-emerald-100 text-emerald-700': item.status === 'completed',
                    'bg-blue-100 text-blue-700': item.status === 'active',
                    'bg-rose-100 text-rose-700': item.status === 'overdue'
                  }
                )}>
                  {item.status}
                </span>
              </div>
              <div className="w-32">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Progress</p>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full" 
                    style={{ width: `${((item.totalAmount - item.remainingAmount) / item.totalAmount) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
                  {Math.round(((item.totalAmount - item.remainingAmount) / item.totalAmount) * 100)}% Paid
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Balance</p>
                <p className="font-black text-gray-900 text-xl tracking-tight">THB {item.remainingAmount.toLocaleString()}</p>
              </div>
              <button className="p-3 bg-gray-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-gray-900 p-8 text-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Record Payment</h3>
                  <p className="text-gray-400 text-sm mt-1">Collection for {customers[selectedPlan.customerId]?.name}</p>
                </div>
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ArrowUpRight className="rotate-45 w-6 h-6" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Total Loan</p>
                  <p className="text-2xl font-black">THB {selectedPlan.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Remaining</p>
                  <p className="text-2xl font-black">THB {selectedPlan.remainingAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Amount (THB)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  className="w-full bg-gray-50 border-none rounded-2xl p-5 text-2xl font-black focus:ring-4 focus:ring-blue-100 transition-all"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleMakePayment}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Apply Payment
                </button>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Payment History</h4>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {Array.isArray(selectedPlan.payments) && selectedPlan.payments.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm font-bold">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-gray-900">THB {p.amount.toLocaleString()}</span>
                    </div>
                    <span className="text-gray-400">
                      {p.date?.toDate ? format(p.date.toDate(), 'MMM dd, yyyy') : '...'}
                    </span>
                  </div>
                ))}
                {(!selectedPlan.payments || selectedPlan.payments.length === 0) && (
                  <p className="text-xs font-medium text-gray-400 italic text-center py-4">No payments recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TrendingUp = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);
