import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  deleteDoc,
  where
} from '../lib/firebase';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { 
  Store as StoreIcon, 
  Plus, 
  MapPin, 
  Phone, 
  User, 
  X,
  MoreVertical,
  Trash2,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Branches() {
  const { user } = useAuth();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    manager: '',
    phone: ''
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'stores'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(data);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'stores'));

    return () => unsub();
  }, [user]);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'stores'), {
        ...formData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setFormData({ name: '', location: '', manager: '', phone: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'stores');
    }
  };

  const handleDeleteStore = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;
    try {
      await deleteDoc(doc(db, 'stores', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `stores/${id}`);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1 block">Network Infrastructure</span>
          <h1 className="text-4xl font-black text-blue-900 tracking-tight">Shop Branches</h1>
          <p className="text-gray-500 font-medium mt-1">Manage physical locations and retail nodes.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl font-bold hover:bg-black shadow-xl shadow-gray-200 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add Store
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <div key={store.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden group hover:border-blue-200 transition-all">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-100 text-white">
                  <StoreIcon className="w-6 h-6" />
                </div>
                <button 
                  onClick={() => handleDeleteStore(store.id)}
                  className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{store.name}</h3>
                <div className="flex items-center gap-2 text-gray-500 mt-2 font-medium">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">{store.location}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Store Manager</p>
                    <p className="text-sm font-bold text-gray-700">{store.manager}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <Phone className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact Phone</p>
                    <p className="text-sm font-bold text-gray-700">{store.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registered Since</p>
                    <p className="text-sm font-bold text-gray-700">
                      {store.createdAt?.toDate ? format(store.createdAt.toDate(), 'MMM dd, yyyy') : '...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {stores.length === 0 && !loading && (
          <div className="col-span-full py-20 bg-white rounded-[2rem] border border-dashed border-gray-200 flex flex-col items-center">
            <StoreIcon className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest">No branches registered</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-blue-600 font-bold hover:underline"
            >
              Add your first store
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight text-center">New Branch Outlet</h3>
                <p className="text-sm text-gray-500 font-medium">Define a new physical retail node.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-3 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddStore} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Shop Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Home Mobile - Branch 1" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Store Manager</label>
                <input 
                  required
                  type="text" 
                  placeholder="Manager Name" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                  value={formData.manager}
                  onChange={(e) => setFormData({...formData, manager: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Phone Contact</label>
                  <input 
                    required
                    type="tel" 
                    placeholder="+1 234 567 890" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">City / Mall Location</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Central Plaza" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
                >
                  Register Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
