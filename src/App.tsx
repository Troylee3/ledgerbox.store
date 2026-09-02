import { useState } from 'react';
import { useStore } from './data/useStore';
import POSView from './components/POSView';
import InventoryView from './components/InventoryView';
import CustomersView from './components/CustomersView';
import ReportsView from './components/ReportsView';
import ReceiptsHistoryView from './components/ReceiptsHistoryView';
import SettingsView from './components/SettingsView';
import ExpensesView from './components/ExpensesView';
import AiAssistantView from './components/AiAssistantView';
import AiFloatingAssistantModal from './components/AiFloatingAssistantModal';
import SubscriptionLockModal from './components/SubscriptionLockModal';
import SubscriptionAlertBanner from './components/SubscriptionAlertBanner';
import OfflineSyncBanner from './components/OfflineSyncBanner';
import ReceiptModal from './components/ReceiptModal';
import OfflinePwaInstallModal from './components/OfflinePwaInstallModal';
import SystemDocumentationModal from './components/SystemDocumentationModal';
import PrivacyPolicyView from './components/PrivacyPolicyView';
import { Transaction } from './types';
import { 
  ShoppingCart, Package, FileText, Users, TrendingUp, TrendingDown, Settings, User, LogOut, Brain, Sparkles, Download, FileCheck, Shield
} from 'lucide-react';
import LoginView from './components/LoginView';
import { useLanguage } from './lib/translations';

type TabType = 'POS' | 'INVENTORY' | 'EXPENSES' | 'TICKETS' | 'CUSTOMERS' | 'REPORTS' | 'AI_ADVISOR' | 'SETTINGS';

export default function App() {
  const store = useStore();
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('POS');
  const [isAiFloatingOpen, setIsAiFloatingOpen] = useState<boolean>(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && (
        window.location.search.toLowerCase().includes('privacy') || 
        window.location.hash.toLowerCase().includes('privacy') ||
        window.location.pathname.toLowerCase().includes('privacy')
      );
    } catch {
      return false;
    }
  });
  
  // Simulated cashier name with customer state
  const [cashierName, setCashierName] = useState('Brayan');
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);

  if (isPrivacyModalOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col overflow-y-auto">
        <PrivacyPolicyView onClose={() => {
          setIsPrivacyModalOpen(false);
          try {
            if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
              const url = new URL(window.location.href);
              url.searchParams.delete('privacy');
              if (url.hash.includes('privacy')) url.hash = '';
              window.history.replaceState({}, document.title, url.pathname);
            }
          } catch (e) {
            console.warn('URL cleanup skipped:', e);
          }
        }} />
      </div>
    );
  }

  if (!store.isLoaded || !store.state) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-white rounded-full animate-spin mx-auto"></div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400">{t('loading')}</h2>
        </div>
      </div>
    );
  }

  const { state } = store;

  if (!state.currentUser) {
    return (
      <LoginView 
        state={state} 
        setCurrentUser={store.setCurrentUser}
        accounts={store.accounts}
        activeAccount={store.activeAccount}
        registerAccount={store.registerAccount}
        loginAccount={store.loginAccount}
        logoutAccount={store.logoutAccount}
        switchAccount={store.switchAccount}
      />
    );
  }

  const activeCashier = state.currentUser?.name || cashierName;

  // Active cashier label helper
  const handleSuccessTransaction = async (tx: Transaction) => {
    setSelectedReceipt(tx);

    // Auto-sync to Google Sheets in background if configured and token is present
    try {
      const savedConfig = localStorage.getItem('pm_google_sheets_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.spreadsheetId && config.autoSync) {
          const { getAccessToken } = await import('./lib/firebase');
          const token = await getAccessToken();
          if (token) {
            const { appendTransactionsToSheet } = await import('./lib/sheets');
            await appendTransactionsToSheet(token, config.spreadsheetId, [tx], state.settings);
            console.log('Successfully auto-synced transaction to Google Sheets:', tx.receiptNumber);
          }
        }
      }
    } catch (err) {
      console.warn('Google Sheets auto-sync skipped/failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 flex flex-col lg:flex-row h-screen overflow-hidden select-none font-sans">
      
      {/* LEFT NAVIGATION DOCKBAR (Desktop View) */}
      <nav className="bg-slate-950 text-white w-full lg:w-64 hidden lg:flex flex-col justify-between shrink-0 select-none z-40 border-r border-slate-800/80 shadow-xl">
        
        {/* Store Brand / Logo Title */}
        <div className="p-5 border-b border-slate-800/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={store.state.settings.logoUrl || '/logo.png'} 
                alt={store.state.settings.storeName} 
                className="w-10 h-10 rounded-xl object-cover shadow-md border border-slate-700/80 bg-slate-900" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                store.isSyncingCloud ? 'bg-amber-400 animate-ping' : store.isOnline ? 'bg-emerald-500' : 'bg-amber-500'
              }`} title={store.isSyncingCloud ? 'Inasawazisha na Wingu...' : store.isOnline ? 'Mtandao Upo (Online)' : 'Nje ya Mtandao (Offline)'}></div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-extrabold text-sm tracking-tight leading-tight uppercase text-white truncate">
                {store.state.settings.storeName || 'LedgerBox'}
              </h1>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-wide uppercase">{t('stockStore')}</p>
            </div>
          </div>
        </div>

        {/* Shop Switcher Dropdown (Only for Admin to monitor multiple shops) */}
        <div className="px-5 py-3 border-b border-slate-800/70">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex justify-between items-center">
            <span>Duka / Shop</span>
            {state.currentUser?.role === 'ADMIN' && (
              <span className="text-[9px] text-emerald-400 font-extrabold bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full shadow-2xs">
                Multi-Shop
              </span>
            )}
          </div>
          {state.currentUser?.role === 'ADMIN' ? (
            <select
              value={store.currentShopId}
              onChange={(e) => store.switchShop(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-xl py-2 px-3 text-xs font-bold outline-none cursor-pointer hover:border-slate-700 focus:border-indigo-500 transition-all duration-150"
            >
              {store.shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  🏪 {shop.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl py-2 px-3 text-xs font-bold text-slate-300 flex items-center gap-2">
              <span>🏪</span>
              <span className="truncate">{store.shops.find(s => s.id === store.currentShopId)?.name || 'Duka Kuu'}</span>
            </div>
          )}
        </div>

        {/* Language Selection Switcher & Offline PWA Button (Desktop exclusive) */}
        <div className="px-5 py-2.5 border-b border-slate-800/70 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lugha / Language</span>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800/80">
              <button
                onClick={() => setLanguage('SW')}
                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all duration-150 cursor-pointer ${language === 'SW' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
              >
                SW
              </button>
              <button
                onClick={() => setLanguage('EN')}
                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all duration-150 cursor-pointer ${language === 'EN' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
              >
                EN
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsPwaModalOpen(true)}
            className="w-full py-2 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 rounded-xl text-[11px] font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Download size={13} className="text-emerald-400" />
              <span>{language === 'SW' ? 'Sakinisha App (Offline)' : 'Install Standalone App'}</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          <button
            onClick={() => setIsDocModalOpen(true)}
            className="w-full py-2 px-3 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 rounded-xl text-[11px] font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FileCheck size={13} className="text-indigo-400" />
              <span>{language === 'SW' ? 'Mwongozo PDF' : 'PDF Feature Guide'}</span>
            </span>
            <span className="text-[9px] bg-indigo-500/30 px-1.5 py-0.5 rounded text-indigo-200">PDF</span>
          </button>

          <button
            onClick={() => setIsPrivacyModalOpen(true)}
            className="w-full py-2 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 rounded-xl text-[11px] font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Shield size={13} className="text-emerald-400" />
              <span>{language === 'SW' ? 'Sera ya Faragha' : 'Privacy & Terms'}</span>
            </span>
            <span className="text-[9px] bg-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-200">Legal</span>
          </button>
        </div>

        {/* Tab Buttons Container */}
        <div className="flex flex-col flex-1 p-2.5 gap-1.5 justify-start overflow-y-auto w-full">
          {[
            { id: 'POS', label: t('pos'), sub: 'POS Cashier', icon: ShoppingCart, permission: 'canSell' },
            { id: 'INVENTORY', label: t('inventory'), sub: 'Stock Store', icon: Package },
            { id: 'EXPENSES', label: t('expenses') || 'Matumizi', sub: 'Expenses & P&L', icon: TrendingDown, permission: 'canViewReports' },
            { id: 'TICKETS', label: t('receiptHistory'), sub: 'Invoice logs', icon: FileText },
            { id: 'CUSTOMERS', label: t('customers'), sub: 'Customer Book', icon: Users, permission: 'canManageCustomers' },
            { id: 'REPORTS', label: t('reports'), sub: 'Dashboard', icon: TrendingUp, permission: 'canViewReports' },
            { id: 'AI_ADVISOR', label: 'LedgerBox AI', sub: 'Q&A Assistant', icon: Brain },
            { id: 'SETTINGS', label: t('settings'), sub: 'Admin settings', icon: Settings },
          ].filter(tab => {
            if (!tab.permission) return true;
            const userPerms = state.currentUser?.permissions;
            if (!userPerms) return true;
            return userPerms[tab.permission as keyof typeof userPerms] !== false;
          }).map(tab => {
            const ActiveIcon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-start gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 cursor-pointer w-full text-left relative ${
                  active 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black shadow-md shadow-indigo-950/40' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/90'
                }`}
              >
                <ActiveIcon size={active ? 18 : 17} className={`shrink-0 mt-0.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                <div>
                  <span className="block text-xs font-bold whitespace-nowrap leading-tight">{tab.label}</span>
                  <span className={`block text-[9px] font-medium leading-none mt-1 ${active ? 'text-indigo-100' : 'text-slate-500'}`}>{tab.sub}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Small Cashier profile card at bottom (Desktop exclusive) */}
        <div className="p-4 border-t border-slate-800/70 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 border border-slate-800 text-indigo-400 rounded-xl flex items-center justify-center font-bold shadow-xs">
              <User size={14} />
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">{t('cashier')}</span>
              <span className="font-extrabold text-slate-200 block truncate max-w-[100px]">{activeCashier}</span>
            </div>
          </div>
          <button 
            title="Ondoka kwenye mfumo (Logout)"
            onClick={() => store.setCurrentUser(null)}
            className="p-2 bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-900/60 rounded-xl text-slate-400 hover:text-rose-400 transition-all duration-150 cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>

      </nav>

      {/* RIGHT WORKSPACE AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* OFFLINE-FIRST MODE & AUTO-SYNC NETWORK BANNER */}
        <OfflineSyncBanner
          isOnline={store.isOnline}
          isSyncing={store.isSyncingCloud}
          pendingSyncCount={store.pendingSyncCount}
          lastSyncTime={store.lastCloudSyncTime}
          onForceSync={store.forceCloudSync}
          language={language}
          shopName={store.state?.settings?.storeName}
        />

        {/* AUTOMATIC SUBSCRIPTION COUNTDOWN ALERT BANNER */}
        <SubscriptionAlertBanner 
          settings={state.settings}
          onUpdateSettings={store.updateSettings}
          language={language}
        />
        
        {/* COMPACT TOP BAR FOR MOBILE (Shows brand logo and shop name) */}
        <header className="lg:hidden bg-slate-950 text-white p-3 flex items-center justify-between shrink-0 font-sans border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img 
                src={store.state.settings.logoUrl || '/logo.png'} 
                alt={store.state.settings.storeName || 'LedgerBox'} 
                className="w-8 h-8 rounded-xl object-cover border border-slate-700/80 bg-slate-900" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                store.isSyncingCloud ? 'bg-amber-400 animate-ping' : store.isOnline ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></div>
            </div>
            <h1 className="font-extrabold text-xs uppercase tracking-wider text-white truncate max-w-[130px]">
              {store.state.settings.storeName || 'LedgerBox'}
            </h1>
          </div>
          
          {/* Compact Mobile Shop Selector */}
          <div className="flex-1 max-w-[120px] sm:max-w-[150px] mx-2">
            {state.currentUser?.role === 'ADMIN' ? (
              <select
                value={store.currentShopId}
                onChange={(e) => store.switchShop(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded py-1 px-1.5 text-[10px] sm:text-xs font-bold outline-none cursor-pointer"
              >
                {store.shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    🏪 {shop.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-slate-950 border border-slate-850 rounded py-1 px-2 text-[9px] sm:text-xs font-bold text-slate-400 truncate text-center">
                🏪 {store.shops.find(s => s.id === store.currentShopId)?.name || 'Duka'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded flex items-center gap-1 text-[9px] font-bold cursor-pointer"
              title="Sakinisha App Offline"
            >
              <Download size={11} className="text-emerald-400" />
              <span className="hidden sm:inline">Offline App</span>
            </button>
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded flex items-center gap-1 text-[9px] font-bold cursor-pointer"
              title="Pakua Mwongozo wa PDF"
            >
              <FileCheck size={11} className="text-indigo-400" />
              <span className="hidden sm:inline">Mwongozo PDF</span>
            </button>
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded flex items-center gap-1 text-[9px] font-bold cursor-pointer"
              title="Sera ya Faragha (Privacy Policy)"
            >
              <Shield size={11} className="text-emerald-400" />
              <span className="hidden sm:inline">Faragha</span>
            </button>
            <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800">
              <button
                onClick={() => setLanguage('SW')}
                className={`px-1 py-0.5 text-[8px] sm:text-[9px] font-black rounded-xs transition ${language === 'SW' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
              >
                SW
              </button>
              <button
                onClick={() => setLanguage('EN')}
                className={`px-1 py-0.5 text-[8px] sm:text-[9px] font-black rounded-xs transition ${language === 'EN' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
              >
                EN
              </button>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 max-w-[65px] sm:max-w-[95px]">
              <User size={10} className="shrink-0" />
              <span className="truncate">{activeCashier}</span>
            </div>
            <button
              onClick={() => store.setCurrentUser(null)}
              className="p-1 bg-slate-800 hover:bg-red-950/40 rounded text-slate-400 hover:text-red-400 transition cursor-pointer font-extrabold"
              title="Ondoka (Logout)"
            >
              <LogOut size={11} />
            </button>
          </div>
        </header>

        {/* INNER PAGE COMPONENT ROUTER */}
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50 relative pb-16 lg:pb-0">
          {activeTab === 'POS' && (
            <POSView 
              state={state} 
              createTransaction={store.createTransaction}
              onSuccessTransaction={handleSuccessTransaction} 
              cashierName={activeCashier}
              addCustomer={store.addCustomer}
            />
          )}
          {activeTab === 'INVENTORY' && (
            <InventoryView
              state={state}
              addProduct={store.addProduct}
              updateProduct={store.updateProduct}
              deleteProduct={store.deleteProduct}
              addCategory={store.addCategory}
              updateCategory={store.updateCategory}
              deleteCategory={store.deleteCategory}
              addSupplier={store.addSupplier}
              updateSupplier={store.updateSupplier}
              deleteSupplier={store.deleteSupplier}
            />
          )}
          {activeTab === 'EXPENSES' && (
            <ExpensesView
              state={state}
              addExpense={store.addExpense}
              updateExpense={store.updateExpense}
              deleteExpense={store.deleteExpense}
              updateSettings={store.updateSettings}
            />
          )}
          {activeTab === 'TICKETS' && (
            <ReceiptsHistoryView
              state={state}
              onSelectTransaction={(tx) => setSelectedReceipt(tx)}
            />
          )}
          {activeTab === 'CUSTOMERS' && (
            <CustomersView
              state={state}
              addCustomer={store.addCustomer}
              updateCustomer={store.updateCustomer}
              deleteCustomer={store.deleteCustomer}
              recordDebtLog={store.recordDebtLog}
            />
          )}
          {activeTab === 'REPORTS' && (
            <ReportsView 
              state={state}
              onNavigateToInventory={() => setActiveTab('INVENTORY')}
            />
          )}
          {activeTab === 'AI_ADVISOR' && (
            <AiAssistantView state={state} />
          )}
          {activeTab === 'SETTINGS' && (
            <SettingsView
              settings={state.settings}
              state={state}
              updateSettings={store.updateSettings}
              resetDatabase={store.resetDatabase}
              importDatabase={store.importDatabase}
              cashierName={cashierName}
              onChangeCashier={setCashierName}
              addUser={store.addUser}
              updateUser={store.updateUser}
              deleteUser={store.deleteUser}
              setCurrentUser={store.setCurrentUser}
              activeAccount={store.activeAccount}
              accounts={store.accounts}
              onSwitchAccount={store.switchAccount}
              onDeleteAccount={store.deleteAccount}
              onReloadAccounts={store.reloadAccounts}
              shops={store.shops}
              currentShopId={store.currentShopId}
              createShop={store.createShop}
              renameShop={store.renameShop}
              deleteShop={store.deleteShop}
              switchShop={store.switchShop}
            />
          )}
        </div>

        {/* KYTE POS-INSPIRED MOBILE BOTTOM NAVIGATION BAR */}
        <nav id="kyte-mobile-bottom-nav" className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 h-16 flex items-center justify-around px-1 shadow-2xl safe-area-pb">
          {[
            { id: 'POS', label: t('pos') || 'POS', icon: ShoppingCart, permission: 'canSell' },
            { id: 'INVENTORY', label: t('inventory') || 'Stock', icon: Package },
            { id: 'EXPENSES', label: language === 'SW' ? 'Matumizi' : 'Expenses', icon: TrendingDown, permission: 'canViewReports' },
            { id: 'TICKETS', label: t('receiptHistory') || 'Risiti', icon: FileText },
            { id: 'CUSTOMERS', label: t('customers') || 'Wateja', icon: Users, permission: 'canManageCustomers' },
            { id: 'REPORTS', label: t('reports') || 'Ripoti', icon: TrendingUp, permission: 'canViewReports' },
            { id: 'SETTINGS', label: t('settings') || 'Mipangilio', icon: Settings },
          ].filter(tab => {
            if (!tab.permission) return true;
            const userPerms = state.currentUser?.permissions;
            if (!userPerms) return true;
            return userPerms[tab.permission as keyof typeof userPerms] !== false;
          }).map(tab => {
            const ActiveIcon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[48px] cursor-pointer transition-all duration-150 relative ${
                  active 
                    ? 'text-indigo-400 font-extrabold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {active && (
                  <span className="absolute top-0 w-8 h-1 bg-indigo-500 rounded-b-full shadow-xs shadow-indigo-500"></span>
                )}
                <ActiveIcon size={20} className={active ? 'text-indigo-400 scale-110 transition-transform' : 'text-slate-400'} />
                <span className="text-[10px] tracking-tight font-bold mt-1 line-clamp-1 truncate max-w-[60px]">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* DYNAMIC RECEIPT MODAL OVERLAY TRIGGER */}
        {selectedReceipt && (
          <ReceiptModal
            transaction={selectedReceipt}
            settings={state.settings}
            customers={state.customers}
            onClose={() => setSelectedReceipt(null)}
            onCancelTransaction={store.cancelTransaction}
          />
        )}

        {/* FLOATING CIRCULAR LEDGERBOX AI BUTTON (Available on all screens) */}
        {activeTab !== 'AI_ADVISOR' && (
          <button
            type="button"
            onClick={() => setIsAiFloatingOpen(!isAiFloatingOpen)}
            title="Fungua LedgerBox AI Assistant"
            className="fixed bottom-20 lg:bottom-5 right-4 sm:right-5 z-40 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white p-3 sm:p-3.5 rounded-full shadow-2xl shadow-indigo-950/80 flex items-center justify-center group transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-indigo-400/50 cursor-pointer select-none"
          >
            <div className="relative flex items-center justify-center">
              <Brain size={22} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-ping"></span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900"></span>
            </div>
          </button>
        )}

        {/* FLOATING AI MODAL POPUP */}
        <AiFloatingAssistantModal
          state={state}
          isOpen={isAiFloatingOpen}
          onClose={() => setIsAiFloatingOpen(false)}
        />

        {/* SYSTEM SUBSCRIPTION LOCK OVERLAY */}
        <SubscriptionLockModal
          settings={state.settings}
          onUpdateSettings={store.updateSettings}
          accounts={store.accounts}
          activeAccount={store.activeAccount}
          onSwitchAccount={store.switchAccount}
          onDeleteAccount={store.deleteAccount}
          onReloadAccounts={store.reloadAccounts}
        />

        {/* OFFLINE PWA INSTALLATION GUIDANCE MODAL */}
        <OfflinePwaInstallModal
          isOpen={isPwaModalOpen}
          onClose={() => setIsPwaModalOpen(false)}
        />

        {/* SYSTEM DOCUMENTATION & PDF EXPORTER MODAL */}
        <SystemDocumentationModal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
        />

        {/* PRIVACY POLICY & DATA PROTECTION MODAL */}
        {isPrivacyModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col">
            <PrivacyPolicyView onClose={() => setIsPrivacyModalOpen(false)} />
          </div>
        )}

      </main>

    </div>
  );
}
