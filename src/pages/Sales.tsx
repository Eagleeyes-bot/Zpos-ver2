import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  Timestamp, 
  doc, 
  updateDoc,
  onSnapshot
} from '../lib/firebase';
import { db, handleFirestoreError, OperationType, getBranchTitle } from '../lib/firebase';
import { useShop } from '../lib/ShopContext';
import { useAuth } from '../lib/AuthContext';
import { 
  ShoppingCart, 
  UserPlus, 
  Search, 
  Scan, 
  Plus, 
  Trash2, 
  X,
  CreditCard,
  Banknote,
  CalendarDays,
  Printer,
  ChevronRight,
  Smartphone,
  Download,
  Mail,
  History,
  FileText,
  Store as StoreIcon
} from 'lucide-react';
import { format } from 'date-fns';
import Scanner from '../components/Scanner';
import InvoiceTemplate from '../components/InvoiceTemplate';
import { generateInvoicePDF, printInvoicePDF, generateInvoiceBlob } from '../lib/pdfManager';

export default function Sales() {
  const { user } = useAuth();
  const { selectedBranch } = useShop();
  const [cart, setCart] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'installment'>('cash');
  const [installmentMonths, setInstallmentMonths] = useState(3);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositPercentage, setDepositPercentage] = useState(0);
  const [interestRate, setInterestRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Form states
  const [imeiInput, setImeiInput] = useState('');
  const [isSearchingDevice, setIsSearchingDevice] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    if (!user) return;

    const qCustomers = query(collection(db, 'customers'), where('userId', '==', user.uid));
    const unsubCustomers = onSnapshot(qCustomers, (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const salesQ = query(
      collection(db, 'sales'), 
      where('userId', '==', user.uid)
    );
    const unsubSales = onSnapshot(salesQ, (snap) => {
      const sortedSales = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(sale => selectedBranch === 'all' || sale.branchName === selectedBranch)
        .sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        })
        .slice(0, 10);
      setRecentSales(sortedSales);
    });

    return () => {
      unsubCustomers();
      unsubSales();
    };
  }, [user]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'customers'), {
        ...newCustomer,
        userId: user.uid,
        createdAt: Timestamp.now()
      });
      setSelectedCustomerId(docRef.id);
      setShowAddCustomerModal(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'customers');
    }
  };

  const searchAndAddDevice = async (imei: string) => {
    if (!user) return;
    setIsSearchingDevice(true);
    try {
      const q = query(
        collection(db, 'devices'), 
        where('userId', '==', user.uid),
        where('imei', '==', imei), 
        where('status', '==', 'available')
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const deviceData = snap.docs[0].data();
        const device = { 
          id: snap.docs[0].id, 
          ...deviceData,
          customPrice: deviceData.sellingPrice || deviceData.costPrice || 0 // Default to selling price or cost
        };
        if (!cart.find(item => item.id === device.id)) {
          setCart([...cart, device]);
        }
        setImeiInput('');
      } else {
        alert("Device not found or not available in stock.");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'devices');
    } finally {
      setIsSearchingDevice(false);
    }
  };

  const updateCartItemPrice = (id: string, newPrice: number) => {
    setCart(cart.map(item => item.id === id ? { ...item, customPrice: newPrice } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const totalAmount = cart.reduce((subtotal, item) => subtotal + Number(item.customPrice || 0), 0);
  const finalAmount = totalAmount - discount;

  // Installment Calculator Logic
  const balanceDue = finalAmount - depositAmount;
  const interestAmountPerMonth = balanceDue * (interestRate / 100);
  const monthlyPayment = installmentMonths > 0 ? Math.ceil((balanceDue / installmentMonths) + interestAmountPerMonth) : 0;

  // Total amount to be collected (including interest for installments)
  const collectionTotal = paymentMethod === 'installment' 
    ? (monthlyPayment * installmentMonths) + depositAmount 
    : finalAmount;

  const handleDepositPercentageChange = (percent: number) => {
    setDepositPercentage(percent);
    setDepositAmount(Math.round(finalAmount * (percent / 100)));
  };

  const handleCheckout = async () => {
    if (!selectedCustomerId) return alert("Select a customer first");
    if (cart.length === 0) return alert("Cart is empty");

    const customer = customers.find(c => c.id === selectedCustomerId);

    try {
      const branchName = selectedBranch !== 'all' ? selectedBranch : getBranchTitle();
      const totalCost = cart.reduce((acc, item) => acc + Number(item.costPrice || 0), 0);
      const salePayload = {
        userId: user.uid,
        customerId: selectedCustomerId,
        customerName: customer?.name,
        customerEmail: customer?.email,
        customerPhone: customer?.phone,
        customerAddress: customer?.address,
        deviceIds: cart.map(d => d.id),
        items: cart.map(d => ({
          deviceId: d.id,
          brand: d.brand,
          model: d.model,
          imei: d.imei,
          costPrice: Number(d.costPrice || 0),
          soldPrice: Number(d.customPrice)
        })),
        totalAmount: collectionTotal, // Store the collection total which includes interest if installment
        totalCost,
        discount,
        finalAmount: collectionTotal, // Also use collection total for final amount
        paymentMethod,
        branchName,
        createdAt: Timestamp.now()
      };

      const saleRef = await addDoc(collection(db, 'sales'), salePayload);

      // Update devices status
      for (const device of cart) {
        await updateDoc(doc(db, 'devices', device.id), {
          status: 'sold',
          saleId: saleRef.id
        });
      }

      // If installment, create installment record
      if (paymentMethod === 'installment') {
        const remaining = collectionTotal - depositAmount;
        const deviceName = cart.map(item => `${item.brand} ${item.model}`).join(', ');
        
        await addDoc(collection(db, 'installments'), {
          userId: user.uid,
          saleId: saleRef.id,
          customerId: selectedCustomerId,
          deviceName, // Added this
          totalAmount: collectionTotal,
          downPayment: depositAmount,
          interestRate: interestRate,
          monthlyInterest: interestAmountPerMonth,
          monthlyPayment: monthlyPayment,
          remainingAmount: remaining > 0 ? remaining : 0,
          numberOfMonths: installmentMonths,
          status: remaining > 0 ? 'active' : 'completed',
          payments: depositAmount > 0 ? [{
            amount: depositAmount,
            date: Timestamp.now(),
            note: 'Initial Deposit'
          }] : [],
          createdAt: Timestamp.now()
        });
      }

      setLastSaleData({ ...salePayload, id: saleRef.id, customer });
      setShowSuccess(true);
      setCart([]);
      setSelectedCustomerId('');
      setDiscount(0);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sales');
    }
  };

  const handleDownloadInvoice = async (printOnly = false) => {
    if (!lastSaleData) return;
    if (printOnly) setIsPrinting(true);
    else setIsGeneratingPDF(true);
    
    try {
      if (printOnly) {
        await printInvoicePDF('invoice-capture');
      } else {
        const filename = `Invoice-${lastSaleData.branchName?.replace(/\s+/g, '_') || 'General'}-${lastSaleData.id.slice(-8)}`;
        await generateInvoicePDF('invoice-capture', filename);
      }
    } finally {
      if (printOnly) setIsPrinting(false);
      else setIsGeneratingPDF(false);
    }
  };

  const handleEmailInvoice = () => {
    if (!lastSaleData || !lastSaleData.customer?.email) {
      alert("No customer email found.");
      return;
    }
    const subject = encodeURIComponent(`Tax Invoice - ${lastSaleData.id.slice(-8).toUpperCase()}`);
    const body = encodeURIComponent(
      `Hello ${lastSaleData.customer.name},\n\nPlease find the details of your recent transaction with DeviceFlow attached.\n\nTotal Amount: THB ${lastSaleData.finalAmount.toLocaleString()}\nPayment Method: ${lastSaleData.paymentMethod}\n\nThank you for choosing DeviceFlow.`
    );
    window.location.href = `mailto:${lastSaleData.customer.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-500">
      <header>
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1 block">Point of Sale</span>
        <h1 className="text-4xl font-black text-blue-900 tracking-tight">Checkout Terminal</h1>
        <p className="text-gray-500 font-medium mt-1">Complete customer transactions and generate invoices.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Cart & Device Entry */}
        <div className="lg:col-span-2 space-y-6">
          {/* Device Entry */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50">
            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Add Items to Cart
            </h3>
            <div className="flex gap-4">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Enter IMEI manually..." 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-mono font-bold focus:ring-4 focus:ring-blue-100/50 transition-all placeholder:font-sans placeholder:font-medium"
                  value={imeiInput}
                  onChange={(e) => setImeiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchAndAddDevice(imeiInput)}
                />
              </div>
              <button 
                onClick={() => setShowScanner(true)}
                className="bg-gray-100 px-6 rounded-2xl flex items-center gap-2 font-bold hover:bg-gray-200 transition-colors active:scale-95"
              >
                <Scan className="w-5 h-5 text-blue-600" />
                Scan
              </button>
              <button 
                disabled={isSearchingDevice}
                onClick={() => searchAndAddDevice(imeiInput)}
                className="bg-blue-600 text-white px-8 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden min-h-[400px]">
            <div className="px-8 py-6 border-b flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900">Current Cart</h3>
              <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">{cart.length} Units</span>
            </div>
            <div className="p-4">
              {cart.length > 0 ? (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-white border border-gray-50 rounded-2xl hover:border-blue-100 transition-all group">
                      <div className="bg-gray-100 p-3 rounded-xl group-hover:bg-blue-50 transition-colors">
                        <Smartphone className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{item.model}</p>
                        <p className="text-xs text-gray-500 font-bold font-mono tracking-tight uppercase">{item.brand} • {item.imei}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mt-1 flex items-center gap-1">
                          <StoreIcon className="w-3 h-3" />
                          {item.branchName || 'Main Store'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block text-right">Sale Price</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold">THB</span>
                            <input 
                              type="number"
                              className="w-32 bg-gray-50 border-none rounded-xl py-2 pl-9 pr-2 text-right font-black text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                              value={item.customPrice}
                              onChange={(e) => updateCartItemPrice(item.id, Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Remove from cart"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 select-none">
                  <ShoppingCart className="w-16 h-16 mb-4 text-gray-300" />
                  <p className="font-black text-xl uppercase tracking-tighter text-gray-400">Terminal Idle</p>
                  <p className="text-sm font-medium mt-1">Add devices to start checkout process</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Summary */}
        <div className="space-y-6">
          <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200 space-y-8 sticky top-8">
            <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
              Summary
              <span className="h-px flex-1 bg-white/10" />
            </h3>

            {/* Customer Select */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</label>
                <button 
                  onClick={() => setShowAddCustomerModal(true)}
                  className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1 hover:text-blue-300"
                >
                  <UserPlus className="w-3 h-3" /> New
                </button>
              </div>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                <option value="" className="text-black">Select Customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id} className="text-black">{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Option</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', icon: Banknote, label: 'Cash' },
                  { id: 'card', icon: CreditCard, label: 'Card' },
                  { id: 'installment', icon: CalendarDays, label: 'Plan' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                      paymentMethod === m.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900' 
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <m.icon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Installment Options */}
            {paymentMethod === 'installment' && (
              <div className="p-5 bg-blue-500/10 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border border-blue-500/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Deposit (%)</label>
                    <input 
                      type="number"
                      className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/50 outline-none"
                      value={depositPercentage}
                      onChange={(e) => handleDepositPercentageChange(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Interest (%)</label>
                    <input 
                      type="number"
                      className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/50 outline-none"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Duration</label>
                    <span className="text-sm font-black text-blue-300">{installmentMonths} Mo.</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {[1,2,3,4,5,6].map(m => (
                      <button
                        key={m}
                        onClick={() => setInstallmentMonths(m)}
                        className={`py-2 rounded-xl text-xs font-black transition-all ${
                          installmentMonths === m 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Deposit Amount (THB)</label>
                  <input 
                    type="number" 
                    placeholder="Enter deposit amount..." 
                    className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/50 outline-none"
                    value={depositAmount}
                    onChange={(e) => {
                      setDepositAmount(Number(e.target.value));
                      setDepositPercentage(Math.round((Number(e.target.value) / finalAmount) * 100) || 0);
                    }}
                  />
                </div>

                {/* Calculation Summary */}
                <div className="p-4 bg-white/5 rounded-xl space-y-2 border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Monthly Payment</span>
                    <span className="text-sm font-black text-sky-400">THB {monthlyPayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-gray-500">Starts On</span>
                    <span className="text-gray-300">{format(new Date(new Date().setMonth(new Date().getMonth() + 1)), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Summary */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-sm font-bold text-gray-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-white">THB {collectionTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-400 uppercase tracking-widest items-center">
                <span>Discount</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-rose-400 font-black">THB</span>
                  <input 
                    type="number" 
                    className="bg-transparent text-right w-20 border-b border-white/10 focus:border-blue-400 outline-none text-rose-400"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Final Total</span>
                  <p className="text-3xl font-black tracking-tighter leading-none mt-1">THB {collectionTotal.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || !selectedCustomerId}
              className="w-full py-5 bg-blue-600 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 disabled:opacity-30 active:scale-95 group"
            >
              Process Transaction
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {showScanner && (
        <Scanner 
          onScan={(imei) => {
            searchAndAddDevice(imei);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">New Customer</h3>
                <p className="text-sm font-medium text-gray-500">Quick register for transaction</p>
              </div>
              <button 
                onClick={() => setShowAddCustomerModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Full Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="John Doe" 
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Phone Number</label>
                  <input 
                    required
                    type="tel" 
                    placeholder="+1 234 567 890" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Email (Optional)</label>
                  <input 
                    type="email" 
                    placeholder="john@example.com" 
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Address</label>
                <textarea 
                  placeholder="Street address, City, Country" 
                  rows={3}
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-4 focus:ring-blue-100/50 transition-all text-sm resize-none"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-200"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-[2.5rem] p-10 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">Sale Approved</h3>
            <p className="text-gray-500 font-medium mt-2 leading-relaxed">
              The transaction has been finalized and recorded. Select an action for the invoice.
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
                Download PDF Invoice
              </button>
              
              <button 
                onClick={handleEmailInvoice}
                className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-blue-100 transition-all"
              >
                <Mail className="w-4 h-4" />
                Email to Customer
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
                Direct Print
              </button>

              <div className="pt-4">
                <button 
                  onClick={() => setShowSuccess(false)}
                  className="w-full py-4 text-gray-400 font-bold text-sm hover:text-gray-900 transition-colors"
                >
                  Return to Terminal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Invoice for Capture */}
      <div className="fixed -left-[10000px] top-0 pointer-events-none">
        {lastSaleData && (
          <InvoiceTemplate 
            id="invoice-capture"
            invoiceId={lastSaleData.id}
            date={lastSaleData.createdAt?.toDate ? lastSaleData.createdAt.toDate() : new Date()}
            branchName={lastSaleData.branchName}
            customer={{
              name: lastSaleData.customerName || 'Walk-in Customer',
              phone: lastSaleData.customerPhone || 'N/A',
              email: lastSaleData.customerEmail,
              address: lastSaleData.customerAddress
            }}
            items={lastSaleData.items}
            subtotal={lastSaleData.totalAmount}
            discount={lastSaleData.discount}
            finalTotal={lastSaleData.finalAmount}
            paymentMethod={lastSaleData.paymentMethod}
          />
        )}
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden mt-12 animate-in slide-in-from-bottom-4 duration-700 delay-300">
        <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <History className="w-6 h-6 text-blue-600" />
              Recent Transactions
            </h3>
            <p className="text-sm font-medium text-gray-500 mt-1">Real-time sale history & record management</p>
          </div>
          <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-full uppercase tracking-widest border border-blue-100">Live Update</span>
        </div>
        
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{format(sale.createdAt?.toDate() || new Date(), 'MMM dd, yyyy')}</span>
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-tight">#{sale.id.slice(-8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-bold text-gray-700">{sale.customerName || 'Walk-in Customer'}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${
                        sale.paymentMethod === 'installment' 
                          ? 'bg-orange-50 text-orange-600 border border-orange-100' 
                          : 'bg-sky-50 text-sky-600 border border-sky-100'
                      }`}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="font-black text-gray-900">THB {sale.finalAmount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => {
                          setLastSaleData(sale);
                          setShowSuccess(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="View / Print Invoice"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recentSales.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No sales recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
