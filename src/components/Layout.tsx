import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { 
  LayoutDashboard, 
  Smartphone, 
  ShoppingCart, 
  Users, 
  ReceiptIndianRupee, 
  FileBarChart, 
  Truck,
  Menu,
  X,
  Plus,
  Settings,
  Store as StoreIcon,
  Scan,
  LogOut,
  Bird,
  Bell,
  MessageSquare
} from 'lucide-react';
import { collection, query, onSnapshot, where } from '../lib/firebase';
import { db, handleFirestoreError, OperationType, getBranchTitle } from '../lib/firebase';
import { useShop } from '../lib/ShopContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

const navItems = [
  { key: 'dashboard', path: '/', icon: LayoutDashboard },
  { key: 'inventory', path: '/inventory', icon: Smartphone },
  { key: 'stock-checker', path: '/stock-checker', icon: Scan },
  { key: 'sales', path: '/sales', icon: ShoppingCart },
  { key: 'installments', path: '/installments', icon: ReceiptIndianRupee },
  { key: 'customers', path: '/customers', icon: Users },
  { key: 'suppliers', path: '/suppliers', icon: Truck },
  { key: 'reports', path: '/reports', icon: FileBarChart },
  { key: 'branches', path: '/branches', icon: StoreIcon },
  { key: 'settings', path: '/settings', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { selectedBranch, setSelectedBranch } = useShop();
  const { user, logout, isAdmin } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [stores, setStores] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const branchTitle = getBranchTitle();

  const currentNavItems = navItems.filter(item => {
    if (isAdmin) {
      return item.key === 'dashboard' || item.key === 'settings';
    }
    return true;
  });

  useEffect(() => {
    if (!user) return;
    const qStores = query(collection(db, 'stores'), where('userId', '==', user.uid));
    const unsubStores = onSnapshot(qStores, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'stores'));
    return () => unsubStores();
  }, [user]);

  useEffect(() => {
    if (!user || isAdmin) return;
    const qMessages = query(collection(db, 'messages'), where('userId', '==', user.uid));
    const unsubMessages = onSnapshot(qMessages, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setUnreadCount(data.filter(m => !m.read).length);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'messages'));
    return () => unsubMessages();
  }, [user, isAdmin]);

  const markMessagesRead = () => {
    if (messages.length === 0) return;
    messages.forEach(m => {
      if (!m.read) {
        // In mock mode we just update localStorage directly or via some helper
        const allMsgs = JSON.parse(localStorage.getItem('mock_db_messages') || '[]');
        const idx = allMsgs.findIndex((msg: any) => msg.id === m.id);
        if (idx > -1) {
          allMsgs[idx].read = true;
          localStorage.setItem('mock_db_messages', JSON.stringify(allMsgs));
        }
      }
    });
    setUnreadCount(0);
    // Trigger a refresh of the snapshot if needed, though mockDb usually handles it via notify
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Top Nav */}
      <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-slate-800 w-8 h-8 rounded-full shadow-inner ring-1 ring-slate-700 flex items-center justify-center overflow-hidden">
            <span className="text-sky-400 font-black text-xs select-none">Z</span>
          </div>
          <span className="font-bold text-lg tracking-tight">ZPOS</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky md:top-0 h-screen w-64 bg-white border-r z-40 transition-transform duration-300 transform md:transform-none flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 hidden md:flex items-center gap-2 border-b">
          <motion.div 
            animate={{ 
              y: [0, -3, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="bg-slate-800 w-10 h-10 rounded-full shadow-lg shadow-slate-950/30 ring-1 ring-slate-700 flex items-center justify-center overflow-hidden shrink-0"
          >
            <span className="text-sky-400 font-black text-xl select-none leading-none pt-1">Z</span>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
          </motion.div>
          <div>
            <h1 className="font-black text-xl leading-none tracking-tight bg-gradient-to-br from-blue-900 to-blue-700 bg-clip-text text-transparent">
              ZPOS
            </h1>
            <p className="text-[7px] text-sky-600 font-black tracking-widest uppercase mt-1">ZPOS • Premium Mobile Solutions • 0942933569</p>
          </div>
        </div>

        <div className="p-4 border-b">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 mb-2 block">{t('language_label')}</label>
          <div className="flex gap-2">
            {[
              { id: 'en', label: 'EN', flag: '🇺🇸' },
              { id: 'my', label: 'MY', flag: '🇲🇲' },
              { id: 'th', label: 'TH', flag: '🇹🇭' }
            ].map(lang => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id as any)}
                className={cn(
                  "flex-1 py-2 px-1 rounded-xl text-[10px] font-black transition-all border",
                  language === lang.id 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-105" 
                    : "bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100"
                )}
              >
                <span className="block text-base mb-0.5">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {!isAdmin && (
          <div className="p-4 border-b">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 mb-2 block">{t('current_branch')}</label>
            <select 
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold text-sm focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
            >
              <option value="all">{t('all_branches')}</option>
              {stores.map(store => (
                <option key={store.id} value={store.name}>{store.name}</option>
              ))}
            </select>
          </div>
        )}

        <nav className="p-4 space-y-1 mt-4 flex-1 overflow-y-auto">
          {currentNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-50 text-blue-700 shadow-sm shadow-blue-100" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5",
                  isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                )} />
                {item.key === 'dashboard' && isAdmin ? 'Admin Dashboard' : t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-rose-600 hover:bg-rose-50 transition-all text-sm uppercase tracking-widest"
          >
            <LogOut className="w-5 h-5" />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md z-30 border-b px-8 py-3 hidden md:flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100/50">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest">{t('system_operational')}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isAdmin && (
              <button 
                onClick={() => {
                  setShowMessageModal(true);
                  markMessagesRead();
                }}
                className="relative p-2 hover:bg-gray-100 rounded-xl transition-all group"
              >
                <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 group-hover:bg-blue-50 transition-colors">
                  <Bell className="w-5 h-5 text-gray-500 group-hover:text-blue-600" />
                </div>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none">{user?.displayName || 'User'}</p>
              <p className="text-[9px] font-bold text-gray-400 mt-1">{user?.email}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-black text-blue-600 shadow-sm">
              {user?.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>

        {/* User Messages Modal */}
        {showMessageModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-end p-4">
            <motion.div 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white w-full max-w-md h-full md:h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b flex items-center justify-between bg-gradient-to-br from-blue-50 to-white">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Notifications</h3>
                  <p className="text-xs text-gray-500 font-medium">Messages from System Admin</p>
                </div>
                <button 
                  onClick={() => setShowMessageModal(false)}
                  className="p-3 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="p-12 text-center opacity-50">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No new messages</p>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div 
                      key={m.id} 
                      className={cn(
                        "p-6 rounded-3xl border transition-all",
                        m.read ? "bg-gray-50 border-transparent" : "bg-white border-blue-100 shadow-lg shadow-blue-50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Administrator</span>
                        <span className="ml-auto text-[9px] font-bold text-gray-400">
                          {new Date(m.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 leading-relaxed">
                        {m.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-6 border-t bg-gray-50">
                <button 
                  onClick={() => setShowMessageModal(false)}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200"
                >
                  Close Tray
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
