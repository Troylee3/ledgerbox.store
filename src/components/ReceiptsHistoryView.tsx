import { useState, useMemo } from 'react';
import { DbState, Transaction } from '../types';
import { 
  FileText, Search, Printer, Calendar, User, UserCheck, AlertCircle, ShoppingCart, RefreshCw
} from 'lucide-react';
import { useLanguage } from '../lib/translations';

interface ReceiptsHistoryViewProps {
  state: DbState;
  onSelectTransaction: (tx: Transaction) => void;
}

export default function ReceiptsHistoryView({ state, onSelectTransaction }: ReceiptsHistoryViewProps) {
  const { language } = useLanguage();
  const { transactions, customers, settings } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');

  const formatCurrency = (val: number) => {
    return `${settings.currencySymbol} ${val.toLocaleString()}`;
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    return transactions.filter(tx => {
      const matchSearch = tx.receiptNumber.includes(searchQuery) ||
                          tx.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (tx.customerId && customers.find(c => c.id === tx.customerId)?.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchMethod = selectedMethodFilter === 'all' || tx.paymentMethod === selectedMethodFilter;

      let matchDate = true;
      const txDateStr = tx.timestamp.split('T')[0];
      const txDateObj = new Date(tx.timestamp);

      if (dateFilter === 'today') {
        matchDate = txDateStr === todayStr;
      } else if (dateFilter === 'yesterday') {
        matchDate = txDateStr === yesterdayStr;
      } else if (dateFilter === 'this_week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchDate = txDateObj >= weekAgo;
      } else if (dateFilter === 'this_month') {
        matchDate = txDateObj.getFullYear() === currentYear && txDateObj.getMonth() === currentMonth;
      } else if (dateFilter === 'custom' && customDate) {
        matchDate = txDateStr === customDate;
      }

      return matchSearch && matchMethod && matchDate;
    });
  }, [transactions, customers, searchQuery, selectedMethodFilter, dateFilter, customDate]);

  const totalFilteredSales = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
  }, [filteredTransactions]);

  const getMethodBadge = (m: string) => {
    switch (m) {
      case 'CASH':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'CREDIT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'CARD':
        return 'bg-blue-100 text-blue-805 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-805 border-emerald-200';
    }
  };

  const getMethodLabel = (m: string) => {
    switch (m) {
      case 'CASH': return language === 'SW' ? 'Taslimu' : 'Cash';
      case 'CREDIT': return language === 'SW' ? 'Mkopo / Deni' : 'Credit / Debt';
      case 'CARD': return language === 'SW' ? 'Kadi EFT' : 'Bank Card';
      case 'M_PESA': return 'M-Pesa';
      case 'TIGO_PESA': return 'Tigo Pesa';
      case 'AIRTEL_MONEY': return 'Airtel Money';
      case 'HALOPESA': return 'HaloPesa';
      default: return m;
    }
  };

  return (
    <div id="receipts-history-wrapper" className="p-4 lg:p-6 bg-slate-50 flex flex-col h-full overflow-hidden font-sans">
      
      {/* Page Title */}
      <div className="mb-6 shrink-0">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          {language === 'SW' ? 'Kumbukumbu ya Risiti (Sales & Ticket History)' : 'Sales & Receipt History'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {language === 'SW'
            ? 'Stakabadhi na miamala yote iliyotolewa na duka la LedgerBox. Gusa risiti ili kuchapa, kupakua, au kuifuta.'
            : 'All transaction vouchers and receipts issued by LedgerBox POS. Click any receipt to inspect, reprint, or void.'}
        </p>
      </div>

      {/* Filter Options Bar */}
      <div className="flex flex-col gap-2.5 mb-4 shrink-0 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Input barcode ticket cashiers */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={16} />
            <input
              id="receipt-search-input"
              type="text"
              placeholder={language === 'SW' ? "Tafuta namba ya risiti (Mfano: PM-XXXXXX), mteja, keshia au maelezo..." : "Search receipt number (e.g. PM-XXXXXX), customer, cashier or note..."}
              className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:bg-white focus:ring-slate-800"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Dropdown options cash card mobile money */}
          <select
            id="receipt-payment-method-select"
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-slate-800 h-8.5 font-medium"
            value={selectedMethodFilter}
            onChange={e => setSelectedMethodFilter(e.target.value)}
          >
            <option value="all">{language === 'SW' ? 'Njia zote za Malipo' : 'All Payment Methods'}</option>
            <option value="CASH">{language === 'SW' ? 'Pesa Taslimu (Cash)' : 'Cash'}</option>
            <option value="CARD">{language === 'SW' ? 'Kadi EFT' : 'Bank Card'}</option>
            <option value="M_PESA">Vodacom M-Pesa</option>
            <option value="TIGO_PESA">Tigo Pesa</option>
            <option value="AIRTEL_MONEY">Airtel Money</option>
            <option value="HALOPESA">HaloPesa</option>
            <option value="CREDIT">{language === 'SW' ? 'Mikopo ya Wateja' : 'Customer Debt'}</option>
          </select>
        </div>

        {/* Date Filter Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
              <Calendar size={12} className="inline mr-1" />
              {language === 'SW' ? 'Kichujio cha Tarehe:' : 'Date Filter:'}
            </span>
            {[
              { id: 'all', label: language === 'SW' ? 'Zote' : 'All' },
              { id: 'today', label: language === 'SW' ? 'Leo' : 'Today' },
              { id: 'yesterday', label: language === 'SW' ? 'Jana' : 'Yesterday' },
              { id: 'this_week', label: language === 'SW' ? 'Siku 7' : '7 Days' },
              { id: 'this_month', label: language === 'SW' ? 'Mwezi Huu' : 'This Month' },
              { id: 'custom', label: language === 'SW' ? 'Maalum...' : 'Custom...' },
            ].map(df => (
              <button
                key={df.id}
                type="button"
                onClick={() => setDateFilter(df.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                  dateFilter === df.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {df.label}
              </button>
            ))}

            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                className="px-2 py-0.5 bg-white border border-indigo-400 rounded-lg text-slate-800 text-xs font-bold focus:outline-none"
              />
            )}
          </div>

          {/* Quick Metrics Badge */}
          <div className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            <span>{filteredTransactions.length} {language === 'SW' ? 'Risiti' : 'Receipts'}</span>
            <span className="mx-1.5 text-slate-300">|</span>
            <span className="font-mono text-indigo-700 font-black">{formatCurrency(totalFilteredSales)}</span>
          </div>
        </div>
      </div>

      {/* Receipts list drawer container */}
      <div id="receipts-list-container" className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xs pr-1">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <FileText size={32} className="text-slate-300 mb-2" />
            <p className="text-xs font-semibold">{language === 'SW' ? 'Hakuna risiti yoyote inayolingana na kichujio hiki.' : 'No receipts match this filter.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => {
              const customerName = tx.customerId
                ? customers.find(c => c.id === tx.customerId)?.name || (language === 'SW' ? 'Hajulikani' : 'Unknown')
                : (language === 'SW' ? 'Walk-in Customer (Hakuna Jina)' : 'Walk-in Customer');

              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 cursor-pointer transition border-l-3 border-transparent hover:border-indigo-600"
                >
                  {/* Left block info */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{tx.receiptNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${getMethodBadge(tx.paymentMethod)}`}>
                        {getMethodLabel(tx.paymentMethod)}
                      </span>
                      {tx.isBackdated && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <Calendar size={10} />
                          <span>{language === 'SW' ? 'Mauzo ya Nyuma' : 'Backdated'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-slate-500 font-medium font-sans">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(tx.timestamp).toLocaleString(language === 'SW' ? 'sw-TZ' : 'en-US')}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck size={11} />
                        {language === 'SW' ? 'Keshia:' : 'Cashier:'} {tx.cashierName}
                      </span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-650">
                        {language === 'SW' ? 'Mteja:' : 'Customer:'} {customerName}
                      </span>
                      {tx.note && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] italic">
                          📝 {tx.note}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right block figures math details */}
                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="sm:text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        {language === 'SW' ? 'Kiasi cha Risiti' : 'Receipt Amount'}
                      </span>
                      <span className="font-mono font-black text-sm text-slate-950">
                        {formatCurrency(tx.total)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="p-2.5 rounded-xl bg-slate-50 text-slate-505 border border-slate-100 hover:bg-slate-800 hover:text-white transition hover:shadow-2xs"
                      title={language === 'SW' ? "Chunguza / Chapa risiti" : "Inspect / Print receipt"}
                    >
                      <Printer size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
