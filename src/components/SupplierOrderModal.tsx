import React, { useState, useEffect } from 'react';
import { 
  X, Truck, Plus, Trash2, Send, Phone, Copy, Check, MessageSquare, Loader2, AlertCircle, ShoppingBag, ArrowRight
} from 'lucide-react';
import { Product } from '../types';

export interface SupplierOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface SupplierOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: {
    id?: string;
    name: string;
    companyName?: string;
    phone: string;
    notes?: string;
  } | null;
  products?: Product[];
  language?: 'SW' | 'EN';
  shopName?: string;
  triggerAlert?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SupplierOrderModal: React.FC<SupplierOrderModalProps> = ({
  isOpen,
  onClose,
  supplier,
  products = [],
  language = 'SW',
  shopName = 'SANDU ELECTRONICS',
  triggerAlert
}) => {
  const [items, setItems] = useState<SupplierOrderItem[]>([
    { id: '1', name: '', quantity: 1, unitPrice: 0 }
  ]);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('Tafadhali tuandalie mzigo huu haraka iwezekanavyo na utututumie invoice.');
  const [sendingApi, setSendingApi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusLog, setStatusLog] = useState('');

  useEffect(() => {
    if (supplier) {
      setPhone(supplier.phone || '');
      setSendStatus('idle');
      setStatusLog('');
      
      // If products exist, check for low stock items to pre-fill as suggestion
      const lowStock = products.filter(p => p.stock <= (p.minStock || 5));
      if (lowStock.length > 0 && items.length === 1 && !items[0].name) {
        setItems(lowStock.slice(0, 3).map((p, idx) => ({
          id: `item-low-${idx}`,
          name: p.name,
          quantity: Math.max(1, (p.minStock || 5) * 2 - p.stock),
          unitPrice: p.costPrice || 0
        })));
      }
    }
  }, [supplier, products]);

  if (!isOpen || !supplier) return null;

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: `item-${Date.now()}-${Math.random()}`, name: '', quantity: 1, unitPrice: 0 }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      setItems([{ id: '1', name: '', quantity: 1, unitPrice: 0 }]);
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof SupplierOrderItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSelectProduct = (id: string, prodId: string) => {
    const found = products.find(p => p.id === prodId);
    if (found) {
      setItems(prev => prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            name: found.name,
            unitPrice: found.costPrice || 0
          };
        }
        return item;
      }));
    }
  };

  const grandTotal = items.reduce((acc, item) => acc + (item.quantity * (item.unitPrice || 0)), 0);

  // Clean phone number
  let cleanedPhone = phone.replace(/[^\d]/g, '');
  if (cleanedPhone.startsWith('0')) cleanedPhone = '255' + cleanedPhone.substring(1);

  // Generate WhatsApp Order formatted string
  const generateOrderText = () => {
    const dateStr = new Date().toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
    const formattedItems = items
      .filter(i => i.name.trim().length > 0)
      .map((i, index) => {
        const itemTotal = i.quantity * (i.unitPrice || 0);
        const priceText = i.unitPrice > 0 ? ` @ TSh ${i.unitPrice.toLocaleString()}` : '';
        const totalText = itemTotal > 0 ? ` = *TSh ${itemTotal.toLocaleString()}*` : '';
        return `${index + 1}. *${i.name.trim()}*\n   • Idadi (Qty): *${i.quantity}*${priceText}${totalText}`;
      }).join('\n\n');

    return `📦 *AGIZO LA BIDHAA / PURCHASE ORDER*
----------------------------------------
*Kutoka:* ${shopName}
*Kwenda:* ${supplier.companyName || supplier.name}
*Tarehe:* ${dateStr}
----------------------------------------

*ORODHA YA BIDHAA ZINAZOHITAJIKA:*

${formattedItems || '1. Bidhaa za jumla'}

----------------------------------------
💰 *JUMLA KUU (GRAND TOTAL):* *TSh ${grandTotal.toLocaleString()}*
----------------------------------------

📝 *Maelezo ya Ziada:*
${notes.trim() || 'Tafadhali tuandalie mzigo huu haraka.'}

----------------------------------------
_Ujumbe huu umetumwa kiotomatiki kupitia Mfumo wa LedgerBox POS_`;
  };

  const orderText = generateOrderText();
  const directWaLink = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(orderText)}`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(orderText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (triggerAlert) {
      triggerAlert(language === 'SW' ? 'Ujumbe umenakiliwa kwenye clipboard!' : 'Order text copied to clipboard!', 'info');
    }
  };

  const handleOpenDirectWhatsApp = () => {
    if (!cleanedPhone) {
      if (triggerAlert) triggerAlert(language === 'SW' ? 'Weka namba ya simu ya msambazaji!' : 'Enter supplier phone number!', 'error');
      return;
    }
    window.open(directWaLink, '_blank');
    if (triggerAlert) {
      triggerAlert(language === 'SW' ? `WhatsApp inafunguka kwenda kwa ${supplier.name}...` : `Opening WhatsApp for ${supplier.name}...`, 'success');
    }
  };

  const handleSendViaApi = async () => {
    if (!cleanedPhone) {
      if (triggerAlert) triggerAlert(language === 'SW' ? 'Weka namba ya simu ya msambazaji!' : 'Enter supplier phone number!', 'error');
      return;
    }

    setSendingApi(true);
    setSendStatus('idle');
    setStatusLog('');

    try {
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanedPhone,
          message: orderText
        })
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = {};
        }
      }
      setSendingApi(false);

      if (data.delivered === true) {
        setSendStatus('success');
        setStatusLog(data.message || `Agizo limetumwa kikamilifu kwa Meta Cloud API kwenda +${cleanedPhone}!`);
        if (triggerAlert) triggerAlert(language === 'SW' ? 'Agizo la bidhaa limetumwa kwa WhatsApp!' : 'Order sent via WhatsApp!', 'success');
      } else {
        setSendStatus('success');
        setStatusLog(data.message || 'Mfumo unafungua WhatsApp kutuma agizo...');
        window.open(data.waLink || directWaLink, '_blank');
        if (triggerAlert) triggerAlert(language === 'SW' ? 'Kufungua WhatsApp kutuma agizo...' : 'Opening WhatsApp to send order...', 'success');
      }
    } catch (err: any) {
      setSendingApi(false);
      setSendStatus('error');
      setStatusLog('Imebadilishwa kwenda Direct WhatsApp...');
      window.open(directWaLink, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Truck size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                {language === 'SW' ? 'Tuma Agizo la Bidhaa kwa Msambazaji' : 'Send Order Requisition to Supplier'}
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {supplier.companyName || supplier.name} • <span className="font-mono text-emerald-400">{supplier.phone}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Supplier Phone Field */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <label className="text-[10.5px] font-extrabold text-emerald-950 uppercase tracking-wider block">
                Namba ya WhatsApp ya Msambazaji:
              </label>
              <p className="text-[11px] text-emerald-800">
                Ujumbe na orodha ya bidhaa zitatumwa kwenye namba hii.
              </p>
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Phone size={14} className="text-emerald-700 shrink-0" />
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0712345678"
                className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-44"
              />
            </div>
          </div>

          {/* Quick Select Low Stock Products Notice */}
          {products.filter(p => p.stock <= (p.minStock || 5)).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-amber-600 shrink-0" />
                <span>
                  <strong>{products.filter(p => p.stock <= (p.minStock || 5)).length}</strong> bidhaa ziko chini ya kiwango cha stoo (Low Stock).
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const lowStock = products.filter(p => p.stock <= (p.minStock || 5));
                  setItems(lowStock.map((p, idx) => ({
                    id: `low-${idx}-${Date.now()}`,
                    name: p.name,
                    quantity: Math.max(1, (p.minStock || 5) * 2 - p.stock),
                    unitPrice: p.costPrice || 0
                  })));
                }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10.5px] rounded-lg transition shrink-0 cursor-pointer"
              >
                Jaza Zenye Low Stock
              </button>
            </div>
          )}

          {/* Items Table / Form */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Orodha ya Vitu / Bidhaa Zinazohitajika
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <Plus size={13} />
                <span>Ongeza Bidhaa</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 hover:border-slate-350 transition"
                >
                  <div className="font-extrabold text-slate-400 text-xs w-5 shrink-0 hidden sm:block">
                    {index + 1}.
                  </div>

                  {/* Name Input with quick dropdown if products exist */}
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => handleUpdateItem(item.id, 'name', e.target.value)}
                      placeholder="Jina la Bidhaa (mfano: Mbolea ya DAP 50Kg)..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />

                    {products.length > 0 && (
                      <select
                        onChange={e => {
                          if (e.target.value) handleSelectProduct(item.id, e.target.value);
                        }}
                        defaultValue=""
                        className="w-full text-[10px] text-slate-500 bg-transparent border-none p-0 focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled>-- Chagua kutoka kwenye stoo yako --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stoo: {p.stock}, Bei Mtaji: TSh {p.costPrice.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="w-24 shrink-0">
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase sm:hidden">
                      Idadi (Qty):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Qty"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-center"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="w-32 shrink-0">
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase sm:hidden">
                      Bei ya Moja (TSh):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice || ''}
                      onChange={e => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="Bei kwa 1"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-right"
                    />
                  </div>

                  {/* Row Total */}
                  <div className="w-28 text-right font-mono font-extrabold text-xs text-slate-900 shrink-0 self-center">
                    TSh {(item.quantity * (item.unitPrice || 0)).toLocaleString()}
                  </div>

                  {/* Delete Row Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition self-center shrink-0 cursor-pointer"
                    title="Odoa"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {/* Grand Total Bar */}
            <div className="bg-slate-900 text-white rounded-xl p-3.5 flex items-center justify-between font-mono mt-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                JUMLA KUU (GRAND TOTAL):
              </span>
              <span className="text-base font-black text-emerald-400">
                TSh {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Notes / Maelezo */}
          <div className="space-y-1">
            <label className="text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider block">
              Maelezo ya Ziada (Notes / Instructions):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Mfano: Tafadhali tuandalie mzigo huu haraka iwezekanavyo..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Live Formatted WhatsApp Preview Box */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={13} className="text-emerald-600" />
                Onyesho la Ujumbe wa WhatsApp (Live WhatsApp Preview)
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10.5px] flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copied ? 'Umenakiliwa!' : 'Nakili Text'}</span>
              </button>
            </div>

            <div className="bg-emerald-950 text-emerald-100 p-3.5 rounded-xl font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-emerald-800 shadow-inner">
              {orderText}
            </div>
          </div>

          {/* Status logs */}
          {statusLog && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              sendStatus === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}>
              <AlertCircle size={15} className="shrink-0" />
              <span>{statusLog}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            Funga
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Direct WhatsApp Open */}
            <button
              type="button"
              onClick={handleOpenDirectWhatsApp}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <MessageSquare size={14} className="text-emerald-400" />
              <span>Fungua WA Moja Kwa Moja</span>
            </button>

            {/* Send via API */}
            <button
              type="button"
              disabled={sendingApi}
              onClick={handleSendViaApi}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md cursor-pointer"
            >
              {sendingApi ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Inatuma...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Tuma kwa WhatsApp API</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
