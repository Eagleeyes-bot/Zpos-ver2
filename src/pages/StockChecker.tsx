import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from '../lib/firebase';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useShop } from '../lib/ShopContext';
import { useAuth } from '../lib/AuthContext';
import { 
  Scan, 
  Search, 
  Trash2, 
  PackageCheck, 
  AlertCircle, 
  CheckCircle2, 
  Store as StoreIcon,
  Smartphone,
  ChevronRight,
  Camera,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function StockChecker() {
  const { user } = useAuth();
  const { selectedBranch } = useShop();
  const [inventory, setInventory] = useState<any[]>([]);
  const [scannedImeis, setScannedImeis] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!user) return;
    // Fetch only available items for comparison
    const q = query(
      collection(db, 'devices'), 
      where('userId', '==', user.uid),
      where('status', '==', 'available')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter by selected branch if not 'all'
      const filtered = selectedBranch === 'all' 
        ? data 
        : data.filter((d: any) => d.branchName === selectedBranch);
      setInventory(filtered);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'devices'));

    return () => unsub();
  }, [selectedBranch, user]);

  useEffect(() => {
    if (isCameraOpen) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scannerRef.current.render(onScanSuccess, onScanFailure);
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner: ", error);
        });
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner in cleanup: ", error);
        });
      }
    };
  }, [isCameraOpen]);

  const onScanSuccess = (decodedText: string) => {
    if (decodedText && !scannedImeis.includes(decodedText)) {
      setScannedImeis(prev => [...prev, decodedText]);
      // Optional: audio feedback could be added here
    }
  };

  const onScanFailure = (error: any) => {
    // Just ignore failures
  };

  const handleAddImei = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const imei = currentInput.trim();
    if (imei && !scannedImeis.includes(imei)) {
      setScannedImeis([...scannedImeis, imei]);
    }
    setCurrentInput('');
    inputRef.current?.focus();
  };

  const removeScanned = (imei: string) => {
    setScannedImeis(scannedImeis.filter(i => i !== imei));
  };

  const clearAll = () => {
    if (confirm('Clear all scanned items?')) {
      setScannedImeis([]);
    }
  };

  // Logic to find matches and missing items
  const foundDevices = inventory.filter(d => scannedImeis.includes(d.imei));
  const missingDevices = inventory.filter(d => !scannedImeis.includes(d.imei));
  const unknownScans = scannedImeis.filter(imei => !inventory.some(d => d.imei === imei));

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">Inventory Audit</span>
          </div>
          <h1 className="text-4xl font-black text-blue-900 tracking-tight">Stock Checker</h1>
          <p className="text-gray-500 font-medium mt-1">
            {selectedBranch === 'all' ? 'Auditing all branches' : `Auditing: ${selectedBranch}`}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input & Scanned List */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col gap-6">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Scan className="w-5 h-5 text-blue-600" />
              Scanning Area
            </h2>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 pl-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                  Live Scan Mode
                </div>
                <button 
                  onClick={() => setIsCameraOpen(!isCameraOpen)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all",
                    isCameraOpen ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                  )}
                >
                  {isCameraOpen ? <X className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                  <span className="text-[9px] uppercase font-bold tracking-widest">
                    {isCameraOpen ? "Close Camera" : "Open Camera"}
                  </span>
                </button>
              </label>

              {isCameraOpen && (
                <div className="bg-gray-100 rounded-3xl overflow-hidden mb-4 border-4 border-gray-900 shadow-2xl relative">
                   <div id="reader"></div>
                </div>
              )}

              <form onSubmit={handleAddImei} className="relative">
                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  placeholder="SCAN IMEI NOW..."
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  className="w-full bg-gray-900 border-none rounded-2xl py-6 px-6 font-mono font-bold focus:ring-4 focus:ring-blue-500/20 transition-all text-sm text-green-400 placeholder:text-gray-700 shadow-inner"
                />
                <button 
                  type="submit"
                  className="absolute right-4 top-4 bottom-4 aspect-square bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Scanned ({scannedImeis.length})</span>
                {scannedImeis.length > 0 && (
                  <button onClick={clearAll} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:rose-600">Clear All</button>
                )}
              </div>
              
              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {scannedImeis.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center opacity-50">
                    <Smartphone className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Items Scanned</p>
                  </div>
                ) : (
                  scannedImeis.map((imei, idx) => {
                    const isFound = inventory.some(d => d.imei === imei);
                    return (
                      <div key={idx} className={cn(
                        "flex items-center justify-between p-4 rounded-2xl transition-all group",
                        isFound ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                      )}>
                        <div>
                          <p className="font-mono font-bold text-sm">{imei}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
                            {isFound ? "Matched" : "Unknown in Inventory"}
                          </p>
                        </div>
                        <button onClick={() => removeScanned(imei)} className="p-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Comparison */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Expected Items</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <p className="text-3xl font-black text-gray-900">{inventory.length}</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-2">Found Correctly</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-3xl font-black text-green-600">{foundDevices.length}</p>
              </div>
            </div>

            <div className="bg-rose-50 p-6 rounded-[2.5rem] border border-rose-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">Missing Items</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-3xl font-black text-rose-600">{missingDevices.length}</p>
              </div>
            </div>
          </div>

          {/* Missing List */}
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-8 border-b bg-rose-50/30 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-rose-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Missing Devices
                </h2>
                <p className="text-sm text-rose-600 font-medium tracking-tight">Devices that should be in stock but weren't scanned.</p>
              </div>
              <div className="bg-rose-100 px-4 py-2 rounded-2xl text-rose-700 font-black text-xs uppercase tracking-widest">
                Action Required
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[600px] custom-scrollbar">
              {missingDevices.length === 0 ? (
                <div className="py-20 flex flex-col items-center text-center">
                  <div className="bg-green-100 p-6 rounded-full mb-4">
                    <PackageCheck className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Stock is 100% Balanced</h3>
                  <p className="text-gray-500 max-w-[300px]">All available expected inventory for this branch has been found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {missingDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-5 rounded-3xl bg-gray-50/50 border border-transparent hover:border-gray-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm">
                          <Smartphone className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{device.model}</p>
                          <p className="text-xs text-gray-500 font-bold font-mono tracking-tight uppercase">{device.brand} • {device.imei}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-flex items-center gap-1">
                          <StoreIcon className="w-3 h-3" />
                          {device.branchName}
                        </p>
                        <p className="text-xs font-bold text-gray-400 mt-2">
                          Added {device.createdAt?.toDate ? device.createdAt.toDate().toLocaleDateString() : '...'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
