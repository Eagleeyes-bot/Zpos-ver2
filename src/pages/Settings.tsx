import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Palette, Database, AlertTriangle, Trash2, Loader2, CheckCircle2, Lock, Key, Users, Calendar, UserMinus, RotateCcw, Send, HardDrive, Clock, X, FileText, TrendingUp } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch, query, where, orderBy, limit } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import { generateBusinessReport, BusinessReportData } from '../lib/pdfManager';

export default function Settings() {
  const { user, isAdmin, updateUserPassword, getAllUsers, deleteUserAccount, resetUserData, getUserUsage, sendMessageToUser } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Admin state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedUserForMessage, setSelectedUserForMessage] = useState<any>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const refreshUsers = () => {
    if (isAdmin) {
      setIsRefreshing(true);
      try {
        const users = getAllUsers();
        setAllUsers(users);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  useEffect(() => {
    refreshUsers();
  }, [isAdmin]);

  const handleDeleteUser = async (email: string) => {
    if (window.confirm(`Are you sure you want to delete user ${email}? This will also clear all their data.`)) {
      await deleteUserAccount(email);
      refreshUsers();
    }
  };

  const handleResetUserData = async (u: any) => {
    if (window.confirm(`Are you sure you want to reset all data for user ${u.email}? This action is irreversible.`)) {
      setIsResetting(true);
      try {
        await resetUserData(u.uid);
        alert(`Data for ${u.email} has been reset.`);
      } catch (error) {
        console.error(error);
        alert('Failed to reset user data.');
      } finally {
        setIsResetting(false);
        refreshUsers();
      }
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedUserForMessage) return;
    setIsSendingMessage(true);
    try {
      await sendMessageToUser(selectedUserForMessage.uid, messageText);
      alert('Message sent successfully!');
      setMessageText('');
      setSelectedUserForMessage(null);
    } catch (error) {
      console.error(error);
      alert('Failed to send message.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleGenerateFullReport = async () => {
    if (!user) return;
    setIsGeneratingReport(true);

    try {
      // 1. Fetch Sales
      const salesQuery = query(collection(db, 'sales'), where('userId', '==', user.uid));
      const salesSnap = await getDocs(salesQuery);
      const salesData = salesSnap.docs.map(doc => doc.data());

      // 2. Fetch Installments
      const installmentsQuery = query(collection(db, 'installments'), where('userId', '==', user.uid));
      const installmentsSnap = await getDocs(installmentsQuery);
      const installmentsData = installmentsSnap.docs.map(doc => doc.data());

      // 3. Fetch Customers for mapping
      const customersQuery = query(collection(db, 'customers'), where('userId', '==', user.uid));
      const customersSnap = await getDocs(customersQuery);
      const customersMap = Object.fromEntries(customersSnap.docs.map(doc => [doc.id, doc.data().name]));

      const salesMap = Object.fromEntries(salesSnap.docs.map(doc => [doc.id, doc.data()]));

      // Calculations
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

        // Brand list
        const brand = sale.brand || (sale as any).items?.[0]?.brand || 'Other';
        brandSales[brand] = (brandSales[brand] || 0) + amount;

        // Monthly
        if (sale.date) {
          const month = new Date(sale.date).toLocaleString('default', { month: 'short', year: 'numeric' });
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

      const activeInstallments = installmentsData
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
        activeInstallments,
        userEmail: user.email!
      };

      await generateBusinessReport(reportData);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate business report.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (error: any) {
      console.error('Password update error:', error);
      setPasswordError(error.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleBackupData = async () => {
    try {
      const collections = ['sales', 'devices', 'customers', 'installments', 'suppliers', 'stores', 'inventory'];
      const backup: any = {};
      
      for (const collectionName of collections) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        backup[collectionName] = data;
      }
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zpos-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Database exported successfully as JSON.');
    } catch (error) {
      console.error('Error backing up data:', error);
      alert('Failed to export database.');
    }
  };

  const handleResetData = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
      // List of all user-specific collections
      const collectionsList = ['sales', 'devices', 'customers', 'installments', 'suppliers', 'stores', 'messages'];
      
      for (const collectionName of collectionsList) {
        const q = query(collection(db, collectionName), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const docs = querySnapshot.docs;
        const totalDocs = docs.length;
        
        if (totalDocs === 0) continue;

        // Firestore batches are limited to 500 operations
        // We chunk the array of documents into pieces of 400 (safer)
        const CHUNK_SIZE = 400;
        for (let i = 0; i < totalDocs; i += CHUNK_SIZE) {
          const chunk = docs.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((document) => {
            batch.delete(doc(db, collectionName, document.id));
          });
          await batch.commit();
        }
      }
      
      alert('Your data has been successfully reset.');
      setShowConfirm(false);
      window.location.reload();
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('Failed to reset data. Check console for details.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header>
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1 block">System Configuration</span>
        <h1 className="text-4xl font-black text-blue-900 tracking-tight">Settings</h1>
        <p className="text-gray-500 font-medium mt-1">Manage your application preferences and system defaults.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* User Settings - Hide General for Admin as they only control accounts */}
        {!isAdmin && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="bg-blue-50 p-3 rounded-2xl">
                  <SettingsIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-gray-900">General Preferences</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all">
                  <div>
                    <p className="font-bold text-gray-900">Default Currency</p>
                    <p className="text-xs text-gray-500">Set the display currency for all prices</p>
                  </div>
                  <span className="bg-white px-4 py-1 rounded-full text-xs font-black text-blue-600 border border-blue-50">THB</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all">
                  <div>
                    <p className="font-bold text-gray-900">Tax Registration</p>
                    <p className="text-xs text-gray-500">Enable automatic tax calculation</p>
                  </div>
                  <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Business Intelligence Report */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] text-white shadow-xl space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Business Analytics</h3>
                  <p className="text-indigo-100 text-sm font-medium">Generate comprehensive performance reports</p>
                </div>
              </div>
              
              <div className="bg-white/10 p-6 rounded-3xl border border-white/10 space-y-4">
                <p className="text-sm text-indigo-50 leading-relaxed font-medium">
                  Get a deep-dive PDF report including:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Total Sales & Profit',
                    'Top 5 Brand Sales',
                    'Monthly Growth',
                    'Active Installments'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      {item}
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={handleGenerateFullReport}
                  disabled={isGeneratingReport}
                  className="w-full mt-4 bg-white text-indigo-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isGeneratingReport ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Generate Life Cycle Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Management / Security */}
        <div className={cn("bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6", isAdmin && "md:col-span-2")}>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-emerald-50 p-3 rounded-2xl">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900">Security & Access</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-gray-50 rounded-3xl border border-transparent hover:border-gray-200 transition-all space-y-4 col-span-1">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-gray-900">Change Password</span>
              </div>
              
              <form onSubmit={handleUpdatePassword} className="space-y-3">
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl py-3 pl-11 pr-4 font-bold text-sm outline-none transition-all"
                    required
                  />
                </div>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl py-3 pl-11 pr-4 font-bold text-sm outline-none transition-all"
                    required
                  />
                </div>
                
                {passwordError && (
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest pl-2">
                    {passwordError}
                  </p>
                )}
                
                {passwordSuccess && (
                  <div className="flex items-center gap-2 pl-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                      Password updated successfully!
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                </button>
              </form>
            </div>

            <div className="space-y-4 col-span-1">
              {!isAdmin && (
                <>
                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-400" />
                      <span className="font-bold text-gray-900">Notifications</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Manage</span>
                  </button>

                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <Palette className="w-5 h-5 text-gray-400" />
                      <span className="font-bold text-gray-900">Appearance</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Update</span>
                  </button>
                </>
              )}

              {isAdmin && (
                <button 
                  onClick={handleBackupData}
                  className="w-full flex items-center justify-between p-8 bg-sky-50 rounded-[2rem] border border-sky-100 hover:border-sky-300 transition-all text-left h-full group"
                >
                  <div className="space-y-4">
                    <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Database className="w-6 h-6 text-sky-600" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-gray-900">Master Database Export</p>
                      <p className="text-xs text-gray-500 font-medium">Download full system backup as JSON</p>
                    </div>
                    <span className="inline-block py-2 px-4 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Backup Now</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone - Also allow admin to reset their own data if they wish */}
        <div className="bg-rose-50/50 p-8 rounded-[2.5rem] border border-rose-100 shadow-sm space-y-6 md:col-span-2">
            <div className="flex items-center gap-4">
              <div className="bg-rose-100 p-3 rounded-2xl text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Danger Zone</h3>
                <p className="text-sm text-gray-500 font-medium">Irreversible personal data actions</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-rose-100 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-gray-900 text-lg">Reset My Personal Data</p>
                  <p className="text-xs text-gray-400">This will delete all your sales, inventory, and customers forever.</p>
                </div>
                
                {!showConfirm ? (
                  <button 
                    onClick={() => setShowConfirm(true)}
                    className="bg-rose-600 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg active:scale-95"
                  >
                    Reset My Data
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button 
                      disabled={isResetting}
                      onClick={() => setShowConfirm(false)}
                      className="bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={isResetting}
                      onClick={handleResetData}
                      className="bg-rose-600 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                    >
                      {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Confirm Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Admin Dashboard */}
        {isAdmin && (
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6 md:col-span-2 mt-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-sky-50 p-3 rounded-2xl">
                  <Shield className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Admin Console</h3>
                  <p className="text-sm text-gray-500 font-medium">Full control over user accounts and system data</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">System Health</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-gray-900">OPTIMAL</span>
                  </div>
                </div>
                <button 
                  onClick={refreshUsers}
                  disabled={isRefreshing}
                  className="p-3 hover:bg-sky-50 rounded-2xl text-sky-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  <RotateCcw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {allUsers.length === 0 ? (
                <div className="p-12 text-center bg-gray-50 rounded-3xl border border-gray-100">
                  <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No users found</p>
                </div>
              ) : (
                allUsers.map((u: any) => {
                  const usage = getUserUsage(u.uid);
                  const isUsageHigh = parseFloat(usage) > 10;

                  return (
                    <div key={u.uid} className="bg-gray-50 p-6 rounded-[2rem] border border-transparent flex flex-col md:flex-row md:items-center justify-between group hover:border-sky-200 transition-all gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center text-sky-600 font-black text-xl">
                          {u.displayName?.charAt(0) || u.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{u.displayName || 'System User'}</p>
                          <p className="text-[10px] font-bold text-gray-500">{u.email}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              <Clock className="w-3 h-3" />
                              {u.lastLogin ? `Last Active: ${new Date(u.lastLogin).toLocaleDateString()}` : 'No activity'}
                            </div>
                            <div className={cn(
                              "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                              isUsageHigh ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            )}>
                              <HardDrive className="w-3 h-3" />
                              {usage} MB
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedUserForMessage(u)}
                          className="p-3 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-all"
                          title="Message User"
                        >
                          <Send className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => handleResetUserData(u)}
                          disabled={isResetting}
                          className="p-3 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-all disabled:opacity-50"
                          title="Reset User Data"
                        >
                          {isResetting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-5 h-5" />
                          )}
                        </button>

                        {u.email !== user?.email && (
                          <button
                            onClick={() => handleDeleteUser(u.email)}
                            className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete User"
                          >
                            <UserMinus className="w-5 h-5" />
                          </button>
                        )}
                        
                        {u.email === user?.email && (
                          <span className="px-3 py-1 bg-sky-100 text-sky-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                            Admin Account
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Modal */}
            {selectedUserForMessage && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <div className="bg-white max-w-lg w-full rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-black text-gray-900">Message to User</h4>
                      <p className="text-xs text-gray-500 font-medium">{selectedUserForMessage.email}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedUserForMessage(null)}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>

                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full h-40 bg-gray-50 border-2 border-transparent focus:border-sky-500 rounded-2xl p-4 outline-none transition-all resize-none font-medium"
                  />

                  <button
                    onClick={handleSendMessage}
                    disabled={isSendingMessage || !messageText.trim()}
                    className="w-full py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-sky-700 transition-all disabled:opacity-50"
                  >
                    {isSendingMessage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Broadcast
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
