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
  Truck, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  Smartphone,
  CheckCircle2,
  Package,
  X
} from 'lucide-react';

export default function Suppliers() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
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
    const q = query(collection(db, 'suppliers'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setSuppliers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'suppliers'));

    return () => unsub();
  }, [user]);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'suppliers'), {
        ...formData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setFormData({ name: '', phone: '', email: '', address: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'suppliers');
    }
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1 block">Logistics Supply Chain</span>
          <h1 className="text-4xl font-black text-blue-900 tracking-tight">Suppliers Register</h1>
          <p className="text-gray-500 font-medium mt-1">Directory of global and regional mobile device distributors.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl font-bold hover:bg-black shadow-xl shadow-gray-200 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add Supplier
        </button>
      </header>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
        <input 
          type="text" 
          placeholder="Search by supplier name or phone..." 
          className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-100/50 transition-all font-medium placeholder:text-gray-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b">Supplier Identity</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b">Contact Metadata</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b">Supply Metrics</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((supplier) => (
              <tr key={supplier.id} className="group hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white border p-3 rounded-2xl group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all shadow-sm">
                      <Truck className="w-6 h-6 text-gray-400 group-hover:text-white" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 tracking-tight group-hover:text-blue-700 transition-colors">{supplier.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: {supplier.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-blue-500" />
                      {supplier.phone}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {supplier.email || 'N/A'}
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Stock Vol.</p>
                      <p className="font-black text-gray-900 tracking-tighter text-lg">1,240</p>
                    </div>
                    <div className="w-px h-8 bg-gray-100" />
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 className="w-3 h-3" /> Preferred
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Supply Logs <Plus className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Register Supplier</h3>
                <p className="text-sm text-gray-500 font-medium">Add to the logistics network.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-3 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddSupplier} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Supplier / Entity Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Global Tech Distribution" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Contact Phone</label>
                  <input 
                    required
                    type="tel" 
                    placeholder="+1 xxx xxx xxxx" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Business Email</label>
                  <input 
                    type="email" 
                    placeholder="sales@supplier.com" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Warehouse Address</label>
                <textarea 
                  rows={3}
                  placeholder="Street, City, State" 
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
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
                >
                  Register Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
