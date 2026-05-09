import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy,
  where
} from '../lib/firebase';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  MoreVertical,
  ChevronRight,
  UserPlus,
  Smartphone,
  X
} from 'lucide-react';
import { format } from 'date-fns';

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'customers'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'customers'));

    return () => unsub();
  }, [user]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'customers'), {
        ...formData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setFormData({ name: '', phone: '', email: '', address: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'customers');
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1 block">Customer Relations</span>
          <h1 className="text-4xl font-black text-blue-900 tracking-tight">Client Directory</h1>
          <p className="text-gray-500 font-medium mt-1">Manage your professional network and wholesale buyers.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl font-bold hover:bg-black shadow-xl shadow-gray-200 transition-all active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          Add Client
        </button>
      </header>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
        <input 
          type="text" 
          placeholder="Search by name or phone number..." 
          className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-100/50 transition-all font-medium placeholder:text-gray-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((customer) => (
          <div key={customer.id} className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:bg-blue-600/10 transition-colors" />
            
            <div className="relative space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                  <span className="text-xl font-black">{customer.name.charAt(0)}</span>
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1">{customer.name}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Joined {customer.createdAt ? format(customer.createdAt.toDate(), 'MMMM yyyy') : 'Recently'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                  <Phone className="w-4 h-4 text-blue-500" />
                  {customer.phone}
                </div>
                {customer.email && (
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-400">
                    <Mail className="w-4 h-4 text-gray-300" />
                    {customer.email}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-3 text-sm font-bold text-gray-400 leading-tight">
                    <MapPin className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                    {customer.address}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Partner</span>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline group-hover:translate-x-1 transition-transform">
                  View Profile <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Onboard New Client</h3>
                <p className="text-sm text-gray-500 font-medium">Verify identification and contact details.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-3 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Full Legal Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Johnathan Doe" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Mobile Number</label>
                  <input 
                    required
                    type="tel" 
                    placeholder="+1 (xxx) xxx xxxx" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Email (Optional)</label>
                  <input 
                    type="email" 
                    placeholder="john@example.com" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Business Address</label>
                <textarea 
                  rows={3}
                  placeholder="Street, District, City, Country" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all resize-none"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Dismiss
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
                >
                  Authenticate & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
