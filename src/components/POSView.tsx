import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Category, Customer, CartItem, PaymentMethod, DbState } from '../types';
import { 
  ShoppingCart, Search, Plus, Minus, Trash2, Tag, UserPlus, Check, ChevronRight, User, AlertTriangle, Play, Camera, Volume2, VolumeX, X, Calendar, WifiOff, CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../lib/translations';
import { BrowserMultiFormatReader } from '@zxing/library';

interface POSViewProps {
  state: DbState;
  createTransaction: (
    items: CartItem[], 
    discount: number, 
    paymentMethod: PaymentMethod, 
    customerId: string | undefined, 
    receivedAmount: number,
    cashierName: string,
    customTimestamp?: string,
    saleNote?: string
  ) => any;
  onSuccessTransaction: (tx: any) => void;
  cashierName: string;
  addCustomer?: (
    c: Omit<Customer, 'id' | 'createdAt' | 'debt'>,
    initialDebt?: number,
    initialDebtNote?: string,
    initialDueDate?: string
  ) => Customer | undefined;
}

export default function POSView({ state, createTransaction, onSuccessTransaction, cashierName, addCustomer }: POSViewProps) {
  const { language, t } = useLanguage();
  const { products, categories, customers, settings } = state;

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Backdated / Custom Sale Date States
  const [saleDateMode, setSaleDateMode] = useState<'TODAY' | 'YESTERDAY' | 'TWO_DAYS_AGO' | 'CUSTOM'>('TODAY');
  const [customSaleDate, setCustomSaleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [customSaleTime, setCustomSaleTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [saleNote, setSaleNote] = useState<string>('');
  
  // Quick Register Customer Modal (For offline / online credit borrower registration)
  const [showQuickCustModal, setShowQuickCustModal] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustDueDate, setQuickCustDueDate] = useState('');
  const [quickCustNotes, setQuickCustNotes] = useState('');
  const [quickCustMsg, setQuickCustMsg] = useState('');

  // Checkout flow state
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Custom quick item form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Camera Barcode Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scanStatusMsg, setScanStatusMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [isMuted, setIsMuted] = useState(false);

  // Play a beautiful beep sound on scan using offline Web Audio API
  const playBeep = () => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz frequency
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // gentle volume
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12); // play for 120ms
    } catch (e) {
      console.warn('Audio Context beep failed:', e);
    }
  };

  const handleBarcodeScanned = (barcodeText: string) => {
    if (!barcodeText) return;

    // Avoid double scanning the exact same barcode in rapid succession (within 1.5 seconds)
    if (lastScannedBarcode === barcodeText) {
      return;
    }

    setLastScannedBarcode(barcodeText);
    setTimeout(() => {
      setLastScannedBarcode(null);
    }, 1500);

    const foundProd = products.find(
      p => p.barcode && p.barcode.toLowerCase() === barcodeText.trim().toLowerCase()
    );

    if (foundProd) {
      playBeep();
      addToCart(foundProd);
      setScanStatusMsg({
        text: language === 'SW'
          ? `Imepatikana: ${foundProd.name} (+1 Kwenye Kikapu!)`
          : `Found: ${foundProd.name} (+1 added to cart!)`,
        type: 'success'
      });
    } else {
      setScanStatusMsg({
        text: language === 'SW'
          ? `Barcode "${barcodeText}" haitambuliki katika stoo!`
          : `Barcode "${barcodeText}" not found in inventory!`,
        type: 'error'
      });
    }

    // Reset status message after 3.5 seconds
    const timer = setTimeout(() => {
      setScanStatusMsg({ text: '', type: '' });
    }, 3500);
    return () => clearTimeout(timer);
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isScanning || !videoRef.current) return;

    let isMounted = true;
    const codeReader = new BrowserMultiFormatReader();

    codeReader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (!isMounted) return;
          if (result) {
            const barcodeText = result.getText();
            if (barcodeText) {
              handleBarcodeScanned(barcodeText);
            }
          }
        }
      )
      .catch(err => {
        console.warn('Barcode camera access error:', err);
      });

    return () => {
      isMounted = false;
      codeReader.reset();
    };
  }, [isScanning]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.includes(searchQuery);
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Selected customer object
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Cart math
  const cartSubtotal = cart.reduce((sum, item) => {
    const price = item.customPrice ?? item.product.sellingPrice;
    return sum + (price * item.quantity);
  }, 0);

  const cartTotal = Math.max(cartSubtotal - discount, 0);

  // Quick cash buttons for fast change calculation
  const quickCashOptions = useMemo(() => {
    const totalRounded = Math.ceil(cartTotal / 1000) * 1000;
    return [
      cartTotal,
      totalRounded,
      totalRounded + 1000,
      totalRounded + 5000,
      totalRounded + 10000,
      Math.ceil(cartTotal / 5000) * 5000,
      Math.ceil(cartTotal / 10000) * 10000,
    ].filter((v, i, self) => v >= cartTotal && self.indexOf(v) === i).slice(0, 5);
  }, [cartTotal]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        // Soft-warn for stock but allow
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, val: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + val;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim() || !quickCustPhone.trim()) {
      setQuickCustMsg(language === 'SW' ? 'Tafadhali jaza Jina na Namba ya Simu' : 'Please provide Name and Phone');
      return;
    }

    if (addCustomer) {
      const created = addCustomer({
        name: quickCustName.trim(),
        phone: quickCustPhone.trim(),
        email: '',
        notes: quickCustNotes.trim() || (language === 'SW' ? 'Alisajiliwa wakati wa mauzo ya mkopo' : 'Quick registered during credit sale'),
        dueDate: quickCustDueDate || undefined
      });

      if (created) {
        setSelectedCustomerId(created.id);
      }
      setQuickCustMsg('');
      setShowQuickCustModal(false);
      setQuickCustName('');
      setQuickCustPhone('');
      setQuickCustDueDate('');
      setQuickCustNotes('');
    }
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customPrice.trim()) return;

    const price = parseFloat(customPrice);
    if (isNaN(price) || price <= 0) return;

    // Create a virtual product
    const customProduct: Product = {
      id: `custom-prod-${Date.now()}`,
      name: `${customName} (Maalum)`,
      barcode: 'CUSTOM',
      category: 'cat-5',
      costPrice: price * 0.75, // approximate cost price
      sellingPrice: price,
      stock: 9999,
      minStock: 0,
      imageUrl: '',
      createdAt: new Date().toISOString()
    };

    setCart(prev => [...prev, { product: customProduct, quantity: 1 }]);
    setCustomName('');
    setCustomPrice('');
    setShowCustomForm(false);
  };

  // Date Presets Helpers
  const getPresetDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const handleSelectDateMode = (mode: 'TODAY' | 'YESTERDAY' | 'TWO_DAYS_AGO' | 'CUSTOM') => {
    setSaleDateMode(mode);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setCustomSaleTime(timeStr);

    if (mode === 'TODAY') {
      setCustomSaleDate(getPresetDate(0));
    } else if (mode === 'YESTERDAY') {
      setCustomSaleDate(getPresetDate(1));
    } else if (mode === 'TWO_DAYS_AGO') {
      setCustomSaleDate(getPresetDate(2));
    }
  };

  const isBackdatedSale = useMemo(() => {
    const todayStr = getPresetDate(0);
    return customSaleDate !== todayStr || saleDateMode !== 'TODAY';
  }, [customSaleDate, saleDateMode]);

  const handleCheckoutSubmit = () => {
    if (cart.length === 0) return;
    
    // Validate custom cash received
    let received = parseFloat(cashReceived) || cartTotal;
    if (paymentMethod === 'CASH' && received < cartTotal) {
      alert(language === 'SW' ? 'Kiasi kilichopokelewa ni kidogo kuliko thamani ya bidhaa!' : 'The amount received is less than the total cart amount!');
      return;
    }

    if (paymentMethod === 'CREDIT' && !selectedCustomerId) {
      alert(language === 'SW' ? 'Tafadhali chagua mteja ili kusajili mkopo/deni hili!' : 'Please select a customer to register this credit/debt!');
      return;
    }

    // Build custom timestamp if backdated or specific date chosen
    let customTimestamp: string | undefined = undefined;
    if (isBackdatedSale || saleDateMode !== 'TODAY') {
      const dtString = `${customSaleDate}T${customSaleTime || '12:00'}:00`;
      const parsed = new Date(dtString);
      if (!isNaN(parsed.getTime())) {
        customTimestamp = parsed.toISOString();
      }
    }

    const tx = createTransaction(
      cart,
      discount,
      paymentMethod,
      selectedCustomerId || undefined,
      paymentMethod === 'CASH' ? received : (paymentMethod === 'CREDIT' ? 0 : cartTotal),
      cashierName,
      customTimestamp,
      saleNote.trim() || undefined
    );

    if (tx) {
      // Clear forms
      setCart([]);
      setDiscount(0);
      setSelectedCustomerId('');
      setCashReceived('');
      setSaleDateMode('TODAY');
      setCustomSaleDate(getPresetDate(0));
      setSaleNote('');
      setIsCheckingOut(false);
      onSuccessTransaction(tx);
    }
  };

  return (
    <div id="pos-wrapper" className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden font-sans w-full max-w-full">
      
      {/* Products Selection Panel (Left Side on Desktop) */}
      <div id="pos-products-panel" className="flex-1 flex flex-col min-w-0 bg-slate-50/70 p-3 sm:p-4 lg:p-6 overflow-hidden shrink-0 lg:shrink w-full max-w-full">
        
        {/* Search & Custom Quick Add */}
        <div className="flex gap-2 sm:gap-2.5 mb-3 sm:mb-4 shrink-0 w-full max-w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-3 text-slate-400" size={17} />
            <input
              id="product-search-input"
              type="text"
              placeholder={language === 'SW' ? 'Tafuta Bidhaa kwa jina au barcode...' : 'Search product by name or barcode...'}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs sm:text-sm transition-all shadow-xs"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Barcode Camera Scanner Trigger Button */}
          <button
            id="toggle-camera-scanner-btn"
            type="button"
            onClick={() => {
              setIsScanning(!isScanning);
              if (!isScanning) {
                setScanStatusMsg({ text: '', type: '' });
                setLastScannedBarcode(null);
              }
            }}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border transition-all duration-150 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer font-extrabold shrink-0 ${
              isScanning
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-indigo-600/20'
            }`}
          >
            <Camera size={17} />
            <span className="hidden xs:inline">
              {isScanning 
                ? (language === 'SW' ? 'Zima' : 'Stop') 
                : (language === 'SW' ? 'Skena' : 'Scan')}
            </span>
          </button>

          <button
            id="toggle-custom-item-btn"
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200/90 hover:border-indigo-400 hover:text-indigo-600 transition-all text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer shrink-0"
          >
            <Plus size={17} />
            <span className="hidden xs:inline">{language === 'SW' ? 'Maalum' : 'Custom'}</span>
          </button>
        </div>

        {/* Custom Item Quick Form Overlay */}
        {showCustomForm && (
          <form id="custom-item-quick-form" onSubmit={handleAddCustomItem} className="mb-4 shrink-0 p-4 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row gap-3 items-end animate-fade-in">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                {language === 'SW' ? 'Jina la Bidhaa:' : 'Product Name:'}
              </label>
              <input
                id="custom-name-field"
                type="text"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="Mfano: Mboga za Majani / Mifuko"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                {language === 'SW' ? `Bei ya Kuuza (${settings.currencySymbol}):` : `Selling Price (${settings.currencySymbol}):`}
              </label>
              <input
                id="custom-price-field"
                type="number"
                required
                min="0"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="1000"
                value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                id="cancel-custom-quick-btn"
                type="button"
                className="px-4 py-2.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition cursor-pointer"
                onClick={() => setShowCustomForm(false)}
              >
                {t('cancel')}
              </button>
              <button
                id="add-custom-quick-btn"
                type="submit"
                className="px-5 py-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                {language === 'SW' ? 'Weka Kwenye Kikapu' : 'Add to Cart'}
              </button>
            </div>
          </form>
        )}

        {/* Camera Barcode Scanner Viewport Panel */}
        {isScanning && (
          <div className="mb-4 shrink-0 bg-slate-950 text-white rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl relative max-w-md mx-auto w-full transition-all animate-fade-in">
            {/* Header of scanner */}
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-2 font-mono">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                {language === 'SW' ? 'KAMERA YA POS INAHAKIKI...' : 'CAM SCANNER ACTIVE...'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white cursor-pointer flex items-center justify-center"
                  title={language === 'SW' ? 'Sauti' : 'Sound'}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsScanning(false)}
                  className="px-3 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-900/80 rounded-lg transition text-[10px] uppercase font-black tracking-wider cursor-pointer"
                >
                  {t('close') || 'Funga'}
                </button>
              </div>
            </div>

            {/* Video Feed Window */}
            <div className="relative h-56 sm:h-64 bg-black flex items-center justify-center overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" />

              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-rose-500 opacity-85 shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse"></div>

              <div className="absolute inset-0 p-8 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-32 sm:w-56 sm:h-40 border-2 border-dashed border-white/40 rounded-xl relative flex items-center justify-center">
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-indigo-500 rounded-tl-sm"></div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-indigo-500 rounded-tr-sm"></div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-indigo-500 rounded-bl-sm"></div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-indigo-500 rounded-br-sm"></div>
                  
                  <span className="text-[9px] text-white/70 uppercase tracking-widest font-black font-mono">
                    {language === 'SW' ? 'WEKA BARCODE HAPA' : 'ALIGN BARCODE HERE'}
                  </span>
                </div>
              </div>

              {scanStatusMsg.text && (
                <div className={`absolute bottom-3 inset-x-3 px-4 py-2.5 rounded-xl text-xs font-bold text-center border shadow-lg animate-bounce ${
                  scanStatusMsg.type === 'success'
                    ? 'bg-emerald-950/95 text-emerald-300 border-emerald-800'
                    : 'bg-rose-950/95 text-rose-300 border-rose-900'
                }`}>
                  {scanStatusMsg.text}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 text-center text-[10px] text-slate-400 font-medium">
              {language === 'SW'
                ? 'Sogeza barcode ya bidhaa karibu na kamera ili kuiongeza kwenye kikapu moja kwa moja.'
                : 'Bring the product barcode tag close to the camera to instantly append it to the active cart.'}
            </div>
          </div>
        )}

        {/* Categories Horizontal Banner */}
        <div id="pos-categories-carousel" className="flex gap-2 overflow-x-auto pb-3 shrink-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-600/30'
                : 'bg-white text-slate-600 border-slate-200/90 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {language === 'SW' ? 'Bidhaa Zote' : 'All Products'}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-600/30'
                  : 'bg-white text-slate-600 border-slate-200/90 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div id="pos-products-grid" className="flex-1 overflow-y-auto min-h-0 pr-1">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white/60 border border-dashed border-slate-200 rounded-3xl p-6 text-center">
              <p className="text-slate-500 font-medium text-sm">
                {language === 'SW' ? 'Hakuna bidhaa inayolingana na utafutaji wako.' : 'No products match your search.'}
              </p>
              <button
                id="reset-pos-search-btn"
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="mt-3 text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                {language === 'SW' ? 'Onyesha bidhaa zote' : 'Show all products'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map(p => {
                const isLowStock = p.stock <= p.minStock;
                const isOutOfStock = p.stock === 0;

                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="relative bg-white border border-slate-200/80 hover:border-indigo-500/80 modern-card rounded-2xl p-4 flex flex-col justify-between h-42 group cursor-pointer shadow-xs hover:shadow-md"
                  >
                    {/* Stock status indicator badge */}
                    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9px] font-extrabold rounded-full">
                          {language === 'SW' ? 'Hakuna stoo' : 'Out of Stock'}
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 text-[9px] font-extrabold rounded-full">
                          {language === 'SW' ? `Saliwa: ${p.stock}` : `Rem: ${p.stock}`}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100/80 text-slate-600 border border-slate-200/50 text-[9px] font-bold rounded-full group-hover:border-indigo-200 transition">
                          {language === 'SW' ? `Stoo: ${p.stock}` : `Stock: ${p.stock}`}
                        </span>
                      )}
                    </div>

                    <div className="pr-16 text-slate-400 text-[10px] font-extrabold tracking-wider uppercase">
                      {categories.find(c => c.id === p.category)?.name || 'Bidhaa'}
                    </div>

                    <div className="my-1.5 flex-grow">
                      <h4 className="text-slate-900 font-bold text-sm line-clamp-2 tracking-tight leading-snug group-hover:text-indigo-600 transition">
                        {p.name}
                      </h4>
                      {p.barcode && p.barcode !== 'CUSTOM' && (
                        <p className="text-slate-400 text-[10px] uppercase font-mono mt-0.5">
                          #{p.barcode.substring(p.barcode.length - 6)}
                        </p>
                      )}
                    </div>

                    <div className="text-slate-900 font-extrabold text-sm border-t border-slate-100 pt-2 flex items-center justify-between w-full">
                      <span className="font-mono text-[13px]">{settings.currencySymbol} {p.sellingPrice.toLocaleString()}</span>
                      <span className="w-6 h-6 bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white rounded-xl flex items-center justify-center text-slate-600 text-xs font-black transition-all">
                        +
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KYTE POS STICKY MOBILE CHECKOUT BAR (Visible on Mobile when Cart has items) */}
      {cart.length > 0 && !isMobileCartOpen && !isCheckingOut && (
        <div id="kyte-mobile-sticky-checkout-bar" className="lg:hidden fixed bottom-16 inset-x-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 shadow-2xl flex items-center justify-between text-white animate-in slide-in-from-bottom duration-200">
          <button 
            onClick={() => setIsMobileCartOpen(true)}
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-extrabold text-sm text-white shadow-md">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <div>
              <span className="block text-[10px] uppercase font-extrabold text-indigo-300 tracking-wider">
                {language === 'SW' ? 'Kikapu cha Mauzo' : 'Sales Cart'}
              </span>
              <span className="block text-base font-black text-white font-mono leading-tight">
                {settings.currencySymbol} {cartTotal.toLocaleString()}
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              setIsMobileCartOpen(true);
              setIsCheckingOut(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg min-h-[48px] flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>{language === 'SW' ? 'LIPIA SASA' : 'CHECKOUT'}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* POS Cart Sidebar / Mobile Slide-Up Drawer */}
      <div 
        id="pos-cart-sidebar" 
        className={`${
          isMobileCartOpen || isCheckingOut ? 'fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end lg:relative lg:inset-auto lg:z-auto lg:bg-transparent' : 'hidden lg:flex'
        } w-full lg:w-[380px] bg-white border-t lg:border-t-0 flex-col h-full lg:h-full shadow-2xl lg:shadow-lg shrink-0`}
      >
        <div className="bg-white rounded-t-3xl lg:rounded-none h-[90vh] lg:h-full flex flex-col overflow-hidden max-w-2xl mx-auto lg:max-w-none w-full">
        
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt={settings.storeName} 
                className="w-6 h-6 rounded-lg object-cover border border-slate-200 bg-white" 
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            ) : (
              <ShoppingCart size={18} className="text-slate-700" />
            )}
            <h3 className="font-bold text-slate-800 font-sans text-sm">
              {language === 'SW' ? 'Kikapu cha Mauzo' : 'Sales Cart'}
            </h3>
            <span className="bg-indigo-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                id="clear-cart-btn"
                onClick={() => setCart([])}
                className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer px-2 py-1"
              >
                {language === 'SW' ? 'Futa Zote' : 'Clear All'}
              </button>
            )}
            
            {/* Close Mobile Drawer button */}
            <button
              onClick={() => {
                setIsMobileCartOpen(false);
                setIsCheckingOut(false);
              }}
              className="lg:hidden p-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-700 font-bold text-xs cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Checkout Modal Form Overlay */}
        {isCheckingOut ? (
          <div id="checkout-drawer-form" className="flex-1 flex flex-col overflow-hidden bg-slate-50 font-sans">
            
            {/* Form list scrollable items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Heading */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {language === 'SW' ? 'Thibitisha Maelezo ya Malipo' : 'Confirm Payment Details'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">LedgerBox Offline Register</p>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-900 text-white p-4.5 rounded-xl shadow-inner text-center">
                <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">
                  {language === 'SW' ? 'Kiasi Unachodai' : 'Amount Due'}
                </span>
                <h1 className="text-2xl font-black mt-1 leading-none">
                  {settings.currencySymbol} {cartTotal.toLocaleString()}
                </h1>
                {discount > 0 && (
                  <p className="text-[11px] text-emerald-400 font-medium mt-1.5">
                    {language === 'SW' 
                      ? `(Umeokoa ${settings.currencySymbol} ${discount.toLocaleString()} Punguzo)`
                      : `(Saved ${settings.currencySymbol} ${discount.toLocaleString()} Discount)`}
                  </p>
                )}
              </div>

              {/* SALE DATE SELECTOR (Allows recording sales for past/backdated dates) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar size={14} className={isBackdatedSale ? "text-amber-600" : "text-indigo-600"} />
                    <span>{language === 'SW' ? 'Tarehe ya Mauzo:' : 'Sale Date & Time:'}</span>
                  </label>
                  {isBackdatedSale && (
                    <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <span>⚠️ {language === 'SW' ? 'Mauzo ya Nyuma' : 'Backdated'}</span>
                    </span>
                  )}
                </div>

                {/* Quick Date Presets */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectDateMode('TODAY')}
                    className={`py-1.5 px-1 sm:px-2 rounded-lg text-[11px] font-bold transition cursor-pointer border text-center ${
                      saleDateMode === 'TODAY' && !isBackdatedSale
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'SW' ? 'Leo (Sasa)' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDateMode('YESTERDAY')}
                    className={`py-1.5 px-1 sm:px-2 rounded-lg text-[11px] font-bold transition cursor-pointer border text-center ${
                      saleDateMode === 'YESTERDAY'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'SW' ? 'Jana' : 'Yesterday'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDateMode('TWO_DAYS_AGO')}
                    className={`py-1.5 px-1 sm:px-2 rounded-lg text-[11px] font-bold transition cursor-pointer border text-center ${
                      saleDateMode === 'TWO_DAYS_AGO'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'SW' ? 'Juzi' : '2 Days Ago'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDateMode('CUSTOM')}
                    className={`py-1.5 px-1 sm:px-2 rounded-lg text-[11px] font-bold transition cursor-pointer border text-center ${
                      saleDateMode === 'CUSTOM'
                        ? 'bg-indigo-700 text-white border-indigo-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'SW' ? 'Chagua...' : 'Custom...'}
                  </button>
                </div>

                {/* Custom Date & Time Inputs & Note */}
                {(isBackdatedSale || saleDateMode === 'CUSTOM') && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {language === 'SW' ? 'Tarehe Maalum:' : 'Selected Date:'}
                        </label>
                        <input
                          type="date"
                          max={getPresetDate(0)}
                          value={customSaleDate}
                          onChange={e => {
                            setCustomSaleDate(e.target.value);
                            setSaleDateMode('CUSTOM');
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {language === 'SW' ? 'Saa ya Mauzo:' : 'Sale Time:'}
                        </label>
                        <input
                          type="time"
                          value={customSaleTime}
                          onChange={e => {
                            setCustomSaleTime(e.target.value);
                            setSaleDateMode('CUSTOM');
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Optional Ledger Note */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {language === 'SW' ? 'Maelezo / Kumbukumbu ya Daftari (Hiari):' : 'Ledger Reference Note (Optional):'}
                      </label>
                      <input
                        type="text"
                        placeholder={language === 'SW' ? "Mfano: Mauzo ya jioni / Rekodi ya daftari..." : "e.g. Backdated ledger sale..."}
                        value={saleNote}
                        onChange={e => setSaleNote(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
                      />
                    </div>

                    {/* Backdated Notice */}
                    <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-2.5 text-xs text-amber-900 flex items-start gap-2">
                      <Calendar size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        {language === 'SW' 
                          ? `Mauzo haya yatahesabiwa kwenye ripoti na mahesabu rasmi ya tarehe ${new Date(customSaleDate).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' })} saa ${customSaleTime || '12:00'}.` 
                          : `This transaction will be recorded for ${new Date(customSaleDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} at ${customSaleTime || '12:00'} across all statements.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer connection drop-down & Quick Register */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {language === 'SW' ? 'Teua Mteja (Anayekopa/Hiari):' : 'Select Customer (Debtor/Optional):'}
                  </label>
                  <button
                    type="button"
                    id="open-quick-register-customer-btn"
                    onClick={() => setShowQuickCustModal(true)}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus size={13} />
                    <span>{language === 'SW' ? '+ Msajili Mteja' : '+ New Customer'}</span>
                  </button>
                </div>

                <div className="relative">
                  <select
                    id="checkout-customer-select"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-800 focus:bg-white appearance-none h-9 font-medium"
                    value={selectedCustomerId}
                    onChange={e => {
                      setSelectedCustomerId(e.target.value);
                    }}
                  >
                    <option value="">
                      {language === 'SW' ? '-- Mteja Asiyejulikana (Walk-in Customer) --' : '-- Walk-in Customer --'}
                    </option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) {c.debt > 0 ? `| ${language === 'SW' ? 'Madeni' : 'Debt'}: ${settings.currencySymbol} ${c.debt.toLocaleString()}` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>

                {paymentMethod === 'CREDIT' && !selectedCustomerId && (
                  <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-lg text-xs text-amber-900 space-y-2">
                    <p className="font-bold flex items-center gap-1 text-[11.5px]">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                      <span>{language === 'SW' ? 'Tafadhali chagua mteja au msajili mpya ili kukamilisha mauzo ya MKOPO:' : 'Please select or register a customer to complete CREDIT sale:'}</span>
                    </p>
                    <button
                      type="button"
                      id="pos-register-debtor-now-btn"
                      onClick={() => setShowQuickCustModal(true)}
                      className="w-full py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-md text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <UserPlus size={14} />
                      <span>{language === 'SW' ? 'Msajili Mteja Anayekopa Sasa (Offline Ready)' : 'Register Borrower Now'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {language === 'SW' ? 'Njia ya Malipo:' : 'Payment Method:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'CASH', label: language === 'SW' ? 'Taslimu (Cash)' : 'Cash' },
                    { id: 'CARD', label: language === 'SW' ? 'EFT Kadi (Card)' : 'Bank Card' },
                    { id: 'M_PESA', label: 'Vodacom M-Pesa' },
                    { id: 'TIGO_PESA', label: 'Tigo Pesa' },
                    { id: 'AIRTEL_MONEY', label: 'Airtel Money' },
                    { id: 'HALOPESA', label: 'HaloPesa' },
                    { id: 'CREDIT', label: language === 'SW' ? 'Mkopo ya Deni' : 'Credit / Debt', highlightOnlyForCust: true }
                  ].map(m => {
                    const active = paymentMethod === m.id;
                    const requiresCust = m.id === 'CREDIT';

                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setPaymentMethod(m.id as PaymentMethod);
                          // Reset cash fields on credit/card
                          if (m.id !== 'CASH') setCashReceived('');
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold text-left border transition cursor-pointer ${
                          active
                            ? 'bg-slate-800 text-white border-slate-805 shadow-sm'
                            : 'bg-white text-slate-650 border-slate-200 hover:border-slate-800'
                        } ${requiresCust && !selectedCustomerId ? 'opacity-50' : ''}`}
                      >
                        {m.label}
                        {requiresCust && !selectedCustomerId && (
                          <span className="block text-[8.5px] text-red-500 font-bold mt-0.5">
                            {language === 'SW' ? 'Teua mteja kwanza' : 'Select customer first'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash denomination options or credit warnings */}
              {paymentMethod === 'CASH' && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      {language === 'SW' ? 'Kiasi Alichotoa Mteja:' : 'Amount Received:'}
                    </label>
                    {cashReceived !== '' && parseFloat(cashReceived) >= cartTotal && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                        {language === 'SW' ? 'Chenji:' : 'Change:'} {settings.currencySymbol} {(parseFloat(cashReceived) - cartTotal).toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  <input
                    id="cash-received-input"
                    type="number"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-805"
                    placeholder={language === 'SW' ? `Mfano: ${cartTotal}` : `e.g. ${cartTotal}`}
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                  />

                  {/* Fast click buttons */}
                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100">
                    {quickCashOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCashReceived(opt.toString())}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold text-slate-700 transition cursor-pointer"
                      >
                        {settings.currencySymbol} {opt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}              {paymentMethod === 'CREDIT' && selectedCustomer && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {language === 'SW' ? 'Miamala hii itaandikwa kama MKOPO!' : 'This transaction will be recorded as CREDIT!'}
                    </p>
                    <p className="mt-1">
                      {language === 'SW'
                        ? `Kiasi cha ${settings.currencySymbol} ${cartTotal.toLocaleString()} kitaongezwa kwenye mkopo wa ${selectedCustomer.name}. Deni lake litakuwa: ${settings.currencySymbol} ${(selectedCustomer.debt + cartTotal).toLocaleString()}.`
                        : `The amount of ${settings.currencySymbol} ${cartTotal.toLocaleString()} will be added to ${selectedCustomer.name}'s credit limit. Their total debt will be: ${settings.currencySymbol} ${(selectedCustomer.debt + cartTotal).toLocaleString()}.`}
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Actions of checkoutdrawer */}
            <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-2 gap-3 shrink-0">
              <button
                id="back-to-cart-btn"
                onClick={() => setIsCheckingOut(false)}
                className="w-full py-3 border border-slate-200 hover:border-slate-800 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                {language === 'SW' ? 'Rudi Kwenye Kikapu' : 'Back to Cart'}
              </button>
              <button
                id="complete-checkout-btn"
                onClick={handleCheckoutSubmit}
                disabled={paymentMethod === 'CREDIT' && !selectedCustomerId}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShoppingCart size={15} />
                {language === 'SW' ? 'Maliza Uuzaji (Sale)' : 'Complete Sale'}
              </button>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            
            {/* Cart Items List */}
            <div id="pos-cart-items-container" className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 font-sans py-12">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                    <ShoppingCart size={20} />
                  </div>
                  <p className="font-medium text-xs">
                    {language === 'SW' ? 'Kikapu kipo wazi kwa sasa.' : 'Your cart is empty.'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed mx-auto">
                    {language === 'SW'
                      ? 'Gusa bidhaa yoyote upande wa kushoto au utafute kwa barcode ili kuiweka humu.'
                      : 'Tap any product on the left or search by barcode to add it here.'}
                  </p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-300 transition"
                  >
                    {/* Item Details */}
                    <div className="flex-1 min-w-0 font-sans pl-1">
                      <h5 className="font-semibold text-slate-900 text-xs truncate max-w-[170px]" title={item.product.name}>
                        {item.product.name}
                      </h5>
                      <p className="text-[10.5px] text-slate-500 font-bold mt-0.5">
                        {settings.currencySymbol} {(item.customPrice ?? item.product.sellingPrice).toLocaleString()}
                      </p>
                    </div>

                    {/* Quantity Selector controls */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shrink-0 select-none">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 px-2.5 text-slate-500 hover:text-slate-800 transition text-xs font-black cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-slate-800 font-bold text-xs min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 px-2.5 text-slate-500 hover:text-slate-805 transition text-xs font-black cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Delete item completely */}
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1.5 text-red-100 hover:text-red-650 rounded-lg hover:bg-red-50 transition shrink-0 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Calculations and trigger checkout block */}
            <div className="p-4 border-t border-slate-105 bg-slate-50 font-sans shrink-0">
              
              {/* Quick Date Display Pill in Cart */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/70 text-xs">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                  <Calendar size={13} className={isBackdatedSale ? "text-amber-600" : "text-slate-400"} />
                  <span>{language === 'SW' ? 'Tarehe ya Mauzo:' : 'Sale Date:'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCheckingOut(true)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    isBackdatedSale
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                  title={language === 'SW' ? "Gusa ili kubadilisha tarehe ya mauzo" : "Click to change sale date"}
                >
                  <span>
                    {isBackdatedSale
                      ? `📅 ${new Date(customSaleDate).toLocaleDateString(language === 'SW' ? 'sw-TZ' : 'en-US', { day: 'numeric', month: 'short' })} (${language === 'SW' ? 'Nyuma' : 'Past'})`
                      : `✨ ${language === 'SW' ? 'Leo (Sasa)' : 'Today (Now)'}`}
                  </span>
                </button>
              </div>

              {/* Discount custom block */}
              {cart.length > 0 && (
                <div id="pos-discount-input-row" className="flex items-center justify-between gap-2.5 mb-3">
                  <div className="flex items-center gap-1.5 text-slate-650 text-[11px] font-bold uppercase tracking-wide">
                    <Tag size={13} />
                    {language === 'SW' ? `Punguzo (${settings.currencySymbol}):` : `Discount (${settings.currencySymbol}):`}
                  </div>
                  <input
                    id="discount-amount-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    max={cartSubtotal}
                    className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-bold text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-805 focus:border-transparent"
                    value={discount || ''}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0;
                      setDiscount(Math.min(v, cartSubtotal));
                    }}
                  />
                </div>
              )}

              {/* Prices breakdown */}
              <div className="space-y-1.5 border-t border-dashed border-slate-200 pt-3 text-xs mb-3">
                <div className="flex justify-between text-slate-550">
                  <span>{language === 'SW' ? 'Jumla ndogo:' : 'Subtotal:'}</span>
                  <span className="font-bold text-slate-800">{settings.currencySymbol} {cartSubtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>{language === 'SW' ? 'Punguzo:' : 'Discount:'}</span>
                    <span>-{settings.currencySymbol} {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-extrabold text-[15px] pt-1.5 border-t border-slate-100">
                  <span>{language === 'SW' ? 'Malipo Kamili (Total):' : 'Grand Total:'}</span>
                  <span className="text-slate-950 font-black">{settings.currencySymbol} {cartTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Click button */}
              <button
                id="pos-submit-checkout-btn"
                onClick={() => {
                  if (cart.length > 0) {
                    setIsCheckingOut(true);
                  }
                }}
                disabled={cart.length === 0}
                className="w-full py-3 bg-slate-900 hover:bg-slate-850 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
              >
                {language === 'SW'
                  ? `Lipisha Sasa (${cart.reduce((sum, item) => sum + item.quantity, 0)} Bidhaa)`
                  : `Checkout Now (${cart.reduce((sum, item) => sum + item.quantity, 0)} Items)`}
                <ChevronRight size={15} />
              </button>
            </div>

          </div>
        )}

        </div>
      </div>

      {/* Quick Register Customer Modal (Works 100% Offline) */}
      {showQuickCustModal && (
        <div id="quick-customer-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    {language === 'SW' ? 'Usajili wa Mteja Anayekopa' : 'Register Borrowing Customer'}
                  </h3>
                  <p className="text-[10.5px] text-emerald-700 font-bold flex items-center gap-1">
                    <WifiOff size={11} />
                    <span>{language === 'SW' ? 'Inahifadhi kwenye Kifaa (Offline Ready)' : 'Saves Locally (Offline Ready)'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="close-quick-cust-modal"
                onClick={() => setShowQuickCustModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {quickCustMsg && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700">
                {quickCustMsg}
              </div>
            )}

            <form onSubmit={handleQuickAddCustomer} className="mt-3 space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  {language === 'SW' ? 'Jina Kamili la Mteja / Anaekopa *' : 'Customer Full Name *'}
                </label>
                <input
                  id="quick-cust-name-input"
                  type="text"
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white text-xs"
                  placeholder={language === 'SW' ? "Mfano: Mama Brayan / Rashid" : "e.g. John Doe"}
                  value={quickCustName}
                  onChange={e => setQuickCustName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  {language === 'SW' ? 'Namba ya Simu *' : 'Phone Number *'}
                </label>
                <input
                  id="quick-cust-phone-input"
                  type="tel"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs"
                  placeholder={language === 'SW' ? "Mfano: 0712345678" : "e.g. 0712345678"}
                  value={quickCustPhone}
                  onChange={e => setQuickCustPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-slate-500" />
                  {language === 'SW' ? 'Tarehe ya Ahadi ya Kulipa Deni (Hiari)' : 'Promised Repayment Date (Optional)'}
                </label>
                <input
                  id="quick-cust-duedate-input"
                  type="date"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                  value={quickCustDueDate}
                  onChange={e => setQuickCustDueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  {language === 'SW' ? 'Anwani / Maelezo ya Mteja (Hiari)' : 'Address / Notes (Optional)'}
                </label>
                <input
                  id="quick-cust-notes-input"
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  placeholder={language === 'SW' ? "Mfano: Mtaa wa Soko, Duka la pili" : "e.g. Near Main Market"}
                  value={quickCustNotes}
                  onChange={e => setQuickCustNotes(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[10px] text-emerald-700 font-semibold italic flex items-center gap-1">
                  <WifiOff size={10} />
                  <span>{language === 'SW' ? 'Inafanya kazi bila Intaneti (Offline)' : 'Works 100% Offline'}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickCustModal(false)}
                    className="px-3 py-1.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
                  >
                    {language === 'SW' ? 'Ghairi' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    id="submit-quick-cust-btn"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>{language === 'SW' ? 'Hifadhi & Teua Mteja' : 'Save & Select'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
