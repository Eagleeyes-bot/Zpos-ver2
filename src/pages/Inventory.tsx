import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  where
} from '../lib/firebase';
import { db, handleFirestoreError, OperationType, getBranchTitle } from '../lib/firebase';
import { useShop } from '../lib/ShopContext';
import { useAuth } from '../lib/AuthContext';
import { 
  Search, 
  Plus, 
  Scan, 
  Filter, 
  MoreVertical, 
  Smartphone, 
  AlertTriangle,
  ChevronDown,
  X,
  CalendarDays,
  Store as StoreIcon
} from 'lucide-react';
import { format } from 'date-fns';
import Scanner from '../components/Scanner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DeviceStatus = 'available' | 'sold' | 'missing' | 'returned';

export default function Inventory() {
  const { user } = useAuth();
  const { selectedBranch } = useShop();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [daySearch, setDaySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');
  const [showAllBranches, setShowAllBranches] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    imei: '',
    brand: '',
    model: '',
    costPrice: '',
    sellingPrice: '',
    supplierId: '',
    branchName: selectedBranch !== 'all' ? selectedBranch : '', 
    registeredBy: 'Manager',
    color: '',
    storage: '',
    batteryPercentage: '100',
    region: '',
    status: 'available' as DeviceStatus
  });

  useEffect(() => {
    if (selectedBranch !== 'all' && !showAllBranches) {
      setFormData(prev => ({ ...prev, branchName: selectedBranch }));
    }
  }, [selectedBranch, showAllBranches]);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const qDevices = query(collection(db, 'devices'), where('userId', '==', user.uid));
    const unsubDevices = onSnapshot(qDevices, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDevices(data);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'devices'));

    const qSuppliers = query(collection(db, 'suppliers'), where('userId', '==', user.uid));
    const unsubSuppliers = onSnapshot(qSuppliers, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSuppliers(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'suppliers'));

    const qStores = query(collection(db, 'stores'), where('userId', '==', user.uid));
    const unsubStores = onSnapshot(qStores, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'stores'));

    return () => {
      unsubDevices();
      unsubSuppliers();
      unsubStores();
    };
  }, [user]);

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'devices'), {
        ...formData,
        userId: user.uid,
        costPrice: Number(formData.costPrice),
        sellingPrice: formData.sellingPrice ? Number(formData.sellingPrice) : null,
        batteryPercentage: Number(formData.batteryPercentage),
        purchaseDate: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setFormData({
        imei: '',
        brand: '',
        model: '',
        costPrice: '',
        sellingPrice: '',
        supplierId: '',
        branchName: '',
        registeredBy: 'Manager',
        color: '',
        storage: '',
        batteryPercentage: '100',
        region: '',
        status: 'available'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'devices');
    }
  };

  const updateStatus = async (id: string, status: DeviceStatus) => {
    try {
      await updateDoc(doc(db, 'devices', id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `devices/${id}`);
    }
  };

  const filteredDevices = devices.filter(d => {
    const matchesSearch = d.imei.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.brand.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Day of Month Search
    let matchesDay = true;
    if (daySearch) {
      const date = d.createdAt?.toDate ? d.createdAt.toDate() : (d.purchaseDate ? new Date(d.purchaseDate) : null);
      if (date) {
        matchesDay = date.getDate().toString() === daySearch;
      } else {
        matchesDay = false;
      }
    }

    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    
    // Branch Filter
    const matchesBranch = showAllBranches || selectedBranch === 'all' || d.branchName === selectedBranch;

    return matchesSearch && matchesStatus && matchesBranch && matchesDay;
  });

  const stats = {
    total: devices.length,
    available: devices.filter(d => d.status === 'available').length,
    missing: devices.filter(d => d.status === 'missing').length,
    totalValue: devices.reduce((acc, d) => acc + (Number(d.costPrice) || 0), 0)
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1 block">Global Stock</span>
          <h1 className="text-4xl font-black text-blue-900 tracking-tight">Inventory Tracking</h1>
          <p className="text-gray-500 font-medium mt-1">Manage and audit your cellular assets.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 bg-white border border-gray-100 text-gray-900 px-5 py-3 rounded-2xl font-bold hover:shadow-lg transition-all active:scale-95"
          >
            <Scan className="w-5 h-5 text-blue-600" />
            Scan IMEI
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl font-bold hover:bg-black shadow-xl shadow-gray-200 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Unit
          </button>
        </div>
      </header>

      {/* Stats Mini Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Units', value: stats.total.toLocaleString(), color: 'blue' },
          { label: 'Total Value', value: `THB ${stats.totalValue.toLocaleString()}`, color: 'emerald' },
          { label: 'In Stock', value: stats.available.toLocaleString(), color: 'sky' },
          { label: 'Missing Assets', value: stats.missing.toLocaleString(), color: 'rose', alert: stats.missing > 0 },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 px-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
              <p className={cn("text-2xl font-black", s.alert ? "text-rose-600" : "text-gray-900")}>{s.value}</p>
            </div>
            {s.alert && <AlertTriangle className="w-6 h-6 text-rose-500 animate-bounce" />}
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-[2] relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by IMEI, Model, or Brand..." 
            className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-100/50 transition-all font-medium placeholder:text-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 relative group">
          <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="number" 
            placeholder="Search by Day (1-31)" 
            min="1"
            max="31"
            className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-100/50 transition-all font-medium placeholder:text-gray-400"
            value={daySearch}
            onChange={(e) => setDaySearch(e.target.value)}
          />
        </div>
        
        {selectedBranch !== 'all' && (
          <button 
            onClick={() => setShowAllBranches(!showAllBranches)}
            className={cn(
              "px-5 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all gap-2 flex items-center border",
              showAllBranches 
                ? "bg-blue-50 border-blue-200 text-blue-600" 
                : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
            )}
          >
            <Filter className="w-4 h-4" />
            {showAllBranches ? "Showing All" : `Filter: ${selectedBranch}`}
          </button>
        )}

        <div className="flex gap-2">
          {['all', 'available', 'missing', 'sold'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={cn(
                "px-5 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all",
                statusFilter === status 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                  : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b">Device Identification</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b">Branch Location</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b">Value & Pricing</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b">Asset Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDevices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 p-3 rounded-2xl group-hover:bg-blue-100 transition-colors">
                        <Smartphone className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 group-hover:text-blue-700 transition-colors">{device.model}</p>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{device.brand} • <span className="font-mono text-gray-400 tracking-tighter">{device.imei}</span></p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <StoreIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-bold text-gray-700">{device.branchName || 'Main Store'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-gray-900">
                      {device.sellingPrice ? `THB ${device.sellingPrice.toLocaleString()}` : "Not Set"}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cost: THB {device.costPrice.toLocaleString()}</p>
                    <p className="text-[10px] font-medium text-gray-400 mt-1">{device.storage} • {device.color}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest",
                      {
                        'bg-sky-100 text-sky-700': device.status === 'available',
                        'bg-rose-100 text-rose-700': device.status === 'missing',
                        'bg-gray-100 text-gray-600': device.status === 'sold',
                        'bg-amber-100 text-amber-700': device.status === 'returned'
                      }
                    )}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 shrink-0">
                      <button 
                        onClick={() => updateStatus(device.id, device.status === 'missing' ? 'available' : 'missing')}
                        className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                        title="Mark Missing/Available"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                      <button className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-200 transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDevices.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="bg-gray-50 p-6 rounded-full mb-4">
                        <Search className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-bold">No assets found matching your criteria.</p>
                      <button 
                        onClick={() => {setSearchTerm(''); setDaySearch(''); setStatusFilter('all');}}
                        className="mt-2 text-blue-600 font-bold hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Register New Asset</h3>
                <p className="text-sm text-gray-500 font-medium">Enter technical specifications and pricing.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-3 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddDevice} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Brand</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Apple, Samsung" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Model Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. iPhone 15 Pro Max" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Color</label>
                  <select 
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                  >
                    <option value="">Select Color</option>
                    {['Black', 'White', 'Silver', 'Gold', 'Graphite', 'Blue', 'Green', 'Red', 'Purple'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Storage (GB)</label>
                  <select 
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.storage}
                    onChange={(e) => setFormData({...formData, storage: e.target.value})}
                  >
                    <option value="">Select Storage</option>
                    {['64GB', '128GB', '256GB', '512GB', '1TB'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Battery %</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    max="100"
                    placeholder="100" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.batteryPercentage}
                    onChange={(e) => setFormData({...formData, batteryPercentage: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Region</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. USA, LL/A" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.region}
                    onChange={(e) => setFormData({...formData, region: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">IMEI / Serial Number</label>
                <div className="relative group">
                  <input 
                    required
                    type="text" 
                    placeholder="3567xxxxxxxxxxx" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-mono font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.imei}
                    onChange={(e) => setFormData({...formData, imei: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white rounded-xl shadow-sm text-blue-600 hover:scale-110 transition-transform"
                  >
                    <Scan className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Supplier</label>
                  <select 
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.supplierId}
                    onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Branch Name</label>
                  <select 
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.branchName || ''}
                    onChange={(e) => setFormData({...formData, branchName: e.target.value})}
                  >
                    <option value="">Choose Branch Name</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Who Registered</label>
                  <select 
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.registeredBy}
                    onChange={(e) => setFormData({...formData, registeredBy: e.target.value})}
                  >
                    <option value="Manager">Manager</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Cost Price (THB)</label>
                  <input 
                    required
                    type="number" 
                    placeholder="0.00" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Selling Price (THB) (Optional)</label>
                  <input 
                    type="number" 
                    placeholder="Leave empty to set later" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})}
                  />
                </div>
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
                  Commit to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScanner && (
        <Scanner 
          onScan={(imei) => {
            setFormData({...formData, imei});
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
