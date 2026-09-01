import React, { useState, useMemo } from 'react';
import { Product, Category, DbState, StockLog, Supplier } from '../types';
import { 
  Package, Layers, ArrowLeftRight, Search, Plus, Edit, Trash2, AlertTriangle, ArrowUp, ArrowDown, Settings, Save, X, Truck, Building2, Phone, Mail, MapPin, FileText, Send, BookUser
} from 'lucide-react';
import { useLanguage } from '../lib/translations';
import { SupplierOrderModal } from './SupplierOrderModal';
import GoogleContactsModal from './GoogleContactsModal';
import { GoogleContactPerson } from '../lib/contacts';

interface InventoryViewProps {
  state: DbState;
  addProduct: (p: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (p: Product, customNote?: string) => void;
  deleteProduct: (id: string) => void;
  addCategory: (name: string, color: string) => void;
  updateCategory: (cat: Category) => void;
  deleteCategory: (id: string) => void;
  addSupplier?: (s: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier?: (s: Supplier) => void;
  deleteSupplier?: (id: string) => void;
}

export default function InventoryView({
  state,
  addProduct,
  updateProduct,
  deleteProduct,
  addCategory,
  updateCategory,
  deleteCategory,
  addSupplier,
  updateSupplier,
  deleteSupplier
}: InventoryViewProps) {
  const { language, t } = useLanguage();
  const { products, categories, stockLogs, suppliers = [], settings, currentUser } = state;
  const canViewCostPrice = currentUser?.permissions?.canViewCostPrice !== false;
  const canManageInventory = currentUser?.permissions?.canManageInventory !== false;

  const [activeSubTab, setActiveSubTab] = useState<'PRODUCTS' | 'CATEGORIES' | 'STOCK_LOGS' | 'SUPPLIERS'>('PRODUCTS');
  
  // Search & Filter state
  const [productQuery, setProductQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Forms management
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Quick Restock & Loss Management States
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockType, setRestockType] = useState<'IN' | 'OUT'>('IN');
  const [restockNote, setRestockNote] = useState('Kupokea mizigo mipya (Restocking)');

  // Product Form Field States
  const [pName, setPName] = useState('');
  const [pBarcode, setPBarcode] = useState('');
  const [pCategory, setPCategory] = useState(categories[0]?.id || 'cat-5');
  const [pCostPrice, setPCostPrice] = useState('0');
  const [pSellingPrice, setPSellingPrice] = useState('0');
  const [pStock, setPStock] = useState('0');
  const [pMinStock, setPMinStock] = useState('5');

  // Category Form Field States
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('bg-slate-100 text-slate-800 border-slate-300');

  // Supplier Form States
  const [supplierQuery, setSupplierQuery] = useState('');
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [orderModalSupplier, setOrderModalSupplier] = useState<Supplier | null>(null);
  
  // Google Contacts States for Suppliers
  const [isGoogleContactsHubOpen, setIsGoogleContactsHubOpen] = useState(false);
  const [isGooglePickerOpen, setIsGooglePickerOpen] = useState(false);

  const [suppName, setSuppName] = useState('');
  const [suppCompany, setSuppCompany] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppEmail, setSuppEmail] = useState('');
  const [suppAddress, setSuppAddress] = useState('');
  const [suppNotes, setSuppNotes] = useState('');

  const handleImportSuppliersBatch = (imported: Array<Omit<Supplier, 'id' | 'createdAt'>>) => {
    if (addSupplier) {
      imported.forEach(s => addSupplier(s));
    }
  };

  const handleSelectSupplierFromPicker = (contact: GoogleContactPerson) => {
    setSuppName(contact.displayName || '');
    setSuppCompany(contact.company || contact.displayName || '');
    setSuppPhone(contact.phone || '');
    setSuppEmail(contact.email || '');
    setSuppAddress(contact.address || '');
    setSuppNotes(contact.notes || '');
  };

  const openAddSupplierForm = () => {
    setEditingSupplier(null);
    setSuppName('');
    setSuppCompany('');
    setSuppPhone('');
    setSuppEmail('');
    setSuppAddress('');
    setSuppNotes('');
    setIsAddingSupplier(true);
  };

  const openEditSupplierForm = (s: Supplier) => {
    setEditingSupplier(s);
    setSuppName(s.name);
    setSuppCompany(s.companyName || '');
    setSuppPhone(s.phone);
    setSuppEmail(s.email || '');
    setSuppAddress(s.address || '');
    setSuppNotes(s.notes || '');
    setIsAddingSupplier(true);
  };

  const handleSubmitSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName.trim() || !suppPhone.trim()) return;

    const data = {
      name: suppName.trim(),
      companyName: suppCompany.trim(),
      phone: suppPhone.trim(),
      email: suppEmail.trim(),
      address: suppAddress.trim(),
      notes: suppNotes.trim()
    };

    if (editingSupplier) {
      if (updateSupplier) {
        updateSupplier({
          ...editingSupplier,
          ...data
        });
      }
    } else {
      if (addSupplier) {
        addSupplier(data);
      }
    }

    setIsAddingSupplier(false);
    setEditingSupplier(null);
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const q = supplierQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || 
             (s.companyName && s.companyName.toLowerCase().includes(q)) || 
             s.phone.includes(q);
    });
  }, [suppliers, supplierQuery]);

  // Color preset buttons for Category creation
  const colorPresets = [
    { name: 'Emerald', value: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { name: 'Blue', value: 'bg-blue-100 text-blue-800 border-blue-300' },
    { name: 'Amber', value: 'bg-amber-100 text-amber-800 border-amber-300' },
    { name: 'Pink', value: 'bg-pink-100 text-pink-800 border-pink-300' },
    { name: 'Purple', value: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { name: 'Rose', value: 'bg-rose-100 text-rose-800 border-rose-300' },
    { name: 'Slate', value: 'bg-slate-100 text-slate-800 border-slate-300' },
  ];

  // Map filters on catalog list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(productQuery.toLowerCase()) || 
                          p.barcode.includes(productQuery);
      const matchCat = selectedCatFilter === 'all' || p.category === selectedCatFilter;
      const matchLowStock = !showLowStockOnly || p.stock <= p.minStock;
      return matchSearch && matchCat && matchLowStock;
    });
  }, [products, productQuery, selectedCatFilter, showLowStockOnly]);

  // Open forms helper
  const openAddProductForm = () => {
    setPName('');
    setPBarcode('');
    setPCategory(categories[0]?.id || 'cat-5');
    setPCostPrice('');
    setPSellingPrice('');
    setPStock('');
    setPMinStock('5');
    setEditingProduct(null);
    setIsAddingProduct(true);
  };

  const openEditProductForm = (p: Product) => {
    setEditingProduct(p);
    setPName(p.name);
    setPBarcode(p.barcode);
    setPCategory(p.category);
    setPCostPrice(p.costPrice.toString());
    setPSellingPrice(p.sellingPrice.toString());
    setPStock(p.stock.toString());
    setPMinStock(p.minStock.toString());
    setIsAddingProduct(false);
  };

  // Submit handers
  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;

    const data = {
      name: pName,
      barcode: pBarcode || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      category: pCategory,
      costPrice: parseFloat(pCostPrice) || 0,
      sellingPrice: parseFloat(pSellingPrice) || 0,
      stock: parseInt(pStock) || 0,
      minStock: parseInt(pMinStock) || 0,
      imageUrl: ''
    };

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        ...data
      });
    } else {
      addProduct(data);
    }

    setIsAddingProduct(false);
    setEditingProduct(null);
  };

  const handleSubmitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    addCategory(catName, catColor);
    setCatName('');
    setCatColor('bg-slate-100 text-slate-800 border-slate-300');
    setIsAddingCategory(false);
  };

  return (
    <div id="inventory-wrapper" className="p-4 lg:p-6 flex flex-col h-full overflow-hidden font-sans bg-slate-50">
      
      {/* Title & Secondary Navigation Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 font-sans tracking-tight">{t('inventoryTitle')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('inventorySub')}</p>
        </div>

        {/* Subtabs selector */}
        <div id="inventory-subtabs" className="flex items-center gap-1 bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveSubTab('PRODUCTS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'PRODUCTS'
                ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package size={15} />
            {language === 'SW' ? 'Bidhaa' : 'Products'}
          </button>
          <button
            onClick={() => setActiveSubTab('CATEGORIES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'CATEGORIES'
                ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={15} />
            {language === 'SW' ? 'Makundi' : 'Categories'}
          </button>
          <button
            id="subtab-suppliers-btn"
            onClick={() => setActiveSubTab('SUPPLIERS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'SUPPLIERS'
                ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck size={15} />
            {language === 'SW' ? 'Wasambazaji' : 'Suppliers'}
          </button>
          {canManageInventory && (
            <button
              onClick={() => setActiveSubTab('STOCK_LOGS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'STOCK_LOGS'
                  ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeftRight size={15} />
              {language === 'SW' ? 'Ripoti ya Stoo' : 'Stock Reports'}
            </button>
          )}
        </div>
      </div>

      {/* Main Container Workspace */}
      <div className="flex-1 min-h-0 overflow-hidden">
        
        {/* SUB TAB 1: PRODUCTS DISPLAY & FORMS */}
        {activeSubTab === 'PRODUCTS' && (
          <div className="h-full flex flex-col md:flex-row gap-4 md:gap-6 overflow-y-auto md:overflow-hidden">
            
            {/* Products List & Search Filters (Left Side on Desktop) */}
            <div className="flex-1 flex flex-col min-w-0 md:h-full shrink-0 md:shrink">
              
              {/* Filter controls bar */}
              <div id="product-filters-bar" className="flex flex-col sm:flex-row gap-2.5 mb-4 shrink-0 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                {/* Text query search search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 top-2.5 text-slate-400" size={16} />
                  <input
                    id="catalog-search-field"
                    type="text"
                    placeholder={language === 'SW' ? "Tafuta bidhaa kwa jina au SKU..." : "Search product by name or SKU..."}
                    className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-slate-805 focus:bg-white text-xs"
                    value={productQuery}
                    onChange={e => setProductQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto scrollbar-none">
                  {/* Dropdown category selection */}
                  <select
                    id="catalog-category-select"
                    className="flex-1 sm:flex-none px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-750 text-xs focus:outline-none focus:ring-1 focus:ring-slate-805 h-8.5"
                    value={selectedCatFilter}
                    onChange={e => setSelectedCatFilter(e.target.value)}
                  >
                    <option value="all">{language === 'SW' ? 'Makundi yote' : 'All Categories'}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {/* Show low stock checkbox alert filter */}
                  <button
                    id="toggle-lowstock-filter-btn"
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      showLowStockOnly
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-800'
                    }`}
                  >
                    <AlertTriangle size={14} />
                    <span className="hidden xs:inline">{language === 'SW' ? 'Low Stock Pekee' : 'Low Stock Only'}</span> ({products.filter(p => p.stock <= p.minStock).length})
                  </button>

                  {/* Add product action trigger */}
                  {canManageInventory && (
                    <button
                      id="add-product-main-btn"
                      onClick={openAddProductForm}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>{language === 'SW' ? 'Weka' : 'Add'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Products List Scrollable Area */}
              <div id="products-table-box" className="flex-1 min-h-[300px] overflow-auto bg-white border border-slate-200 rounded-2xl shadow-2xs w-full max-w-full p-2 sm:p-0">
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 p-6 text-center text-slate-400">
                    <Package size={30} className="mb-2 text-slate-300" />
                    <p className="font-semibold text-xs">
                      {language === 'SW' ? 'Hakuna bidhaa inayolingana na vigezo vilivyoombwa.' : 'No products matched your search filters.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* MOBILE CARDS VIEW (Visible < md screens) */}
                    <div className="md:hidden space-y-3 p-1">
                      {filteredProducts.map(p => {
                        const originalCategoryName = categories.find(c => c.id === p.category)?.name || 'Nyinginezo';
                        const isUnderStock = p.stock <= p.minStock;
                        const isOutOfStock = p.stock === 0;

                        return (
                          <div 
                            key={p.id}
                            className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-indigo-300 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                                  {originalCategoryName}
                                </span>
                                <h4 className="font-bold text-slate-900 text-sm tracking-tight truncate leading-tight">
                                  {p.name}
                                </h4>
                                {p.barcode && (
                                  <span className="inline-block mt-0.5 font-mono text-[9px] text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded">
                                    #{p.barcode}
                                  </span>
                                )}
                              </div>

                              <span className={`px-2.5 py-1 rounded-full font-black text-[10px] shrink-0 ${
                                isOutOfStock
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : isUnderStock
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {language === 'SW' ? `Stoo: ${p.stock}` : `Stock: ${p.stock}`}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-200/80 pt-2.5 mt-1 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-bold">{language === 'SW' ? 'Bei ya Kuuza' : 'Selling Price'}</span>
                                <span className="font-mono font-black text-slate-900 text-sm">{settings.currencySymbol} {p.sellingPrice.toLocaleString()}</span>
                              </div>

                              {canViewCostPrice && (
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold">{language === 'SW' ? 'Bei ya Mtaji' : 'Cost Price'}</span>
                                  <span className="font-mono font-bold text-slate-500 text-xs">{settings.currencySymbol} {p.costPrice.toLocaleString()}</span>
                                </div>
                              )}
                            </div>

                            {canManageInventory && (
                              <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-slate-200/60">
                                <button
                                  onClick={() => {
                                    setRestockProduct(p);
                                    setRestockQty('');
                                    setRestockType('IN');
                                    setRestockNote(language === 'SW' ? 'Kupokea mizigo mipya (Restocking)' : 'Restocking / Receiving new stock');
                                  }}
                                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 shadow-xs min-h-[38px] cursor-pointer"
                                >
                                  <Plus size={13} />
                                  <span>{language === 'SW' ? '+ Stoo' : '+ Stock'}</span>
                                </button>

                                <button
                                  onClick={() => openEditProductForm(p)}
                                  className="p-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl transition min-h-[38px] cursor-pointer"
                                  title={language === 'SW' ? "Sahihisha" : "Edit"}
                                >
                                  <Edit size={14} />
                                </button>

                                <button
                                  onClick={() => {
                                    const confirmMsg = language === 'SW'
                                      ? `Una uhakika unataka kufuta bidhaa ya ${p.name}?`
                                      : `Are you sure you want to delete product ${p.name}?`;
                                    if (confirm(confirmMsg)) {
                                      deleteProduct(p.id);
                                    }
                                  }}
                                  className="p-2.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-xl transition min-h-[38px] cursor-pointer"
                                  title={language === 'SW' ? "Futa" : "Delete"}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* DESKTOP TABLE VIEW (Visible >= md screens) */}
                    <table className="hidden md:table w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-[10.5px] uppercase tracking-wider font-mono">
                          <th className="py-3 px-4">{language === 'SW' ? 'Bidhaa na kundi' : 'Product & Category'}</th>
                          <th className="py-3 px-3">{language === 'SW' ? 'Namba ya SKU (Barcode)' : 'SKU / Barcode'}</th>
                          {canViewCostPrice && <th className="py-3 px-3 text-right">{language === 'SW' ? 'Bei ya Mtaji' : 'Cost/Buying Price'}</th>}
                          <th className="py-3 px-3 text-right">{language === 'SW' ? 'Bei ya Kuuza' : 'Selling Price'}</th>
                          <th className="py-3 px-3 text-center">{language === 'SW' ? 'Stoo iliyopo' : 'In Stock'}</th>
                          {canManageInventory && <th className="py-3 px-4 text-center">{language === 'SW' ? 'Vitendo' : 'Actions'}</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700 text-xs font-sans">
                        {filteredProducts.map(p => {
                          const originalCategoryName = categories.find(c => c.id === p.category)?.name || 'Nyinginezo';
                          const isUnderStock = p.stock <= p.minStock;
                          const isOutOfStock = p.stock === 0;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{p.name}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{originalCategoryName}</div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10.5px]">
                                  {p.barcode}
                                </span>
                              </td>
                              {canViewCostPrice && (
                                <td className="py-3 px-3 text-right font-mono font-medium text-slate-500">
                                  {settings.currencySymbol} {p.costPrice.toLocaleString()}
                                </td>
                              )}
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                {settings.currencySymbol} {p.sellingPrice.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded font-black text-xs inline-block ${
                                  isOutOfStock
                                    ? 'bg-red-100 text-red-800'
                                    : isUnderStock
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {p.stock} {isOutOfStock ? (language === 'SW' ? '(Tupu)' : '(Empty)') : isUnderStock ? (language === 'SW' ? '(Pungufu)' : '(Low)') : ''}
                                </span>
                              </td>
                              {canManageInventory && (
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setRestockProduct(p);
                                        setRestockQty('');
                                        setRestockType('IN');
                                        setRestockNote(language === 'SW' ? 'Kupokea mizigo mipya (Restocking)' : 'Restocking / Receiving new stock');
                                      }}
                                      className="p-1 px-1.5 text-emerald-600 hover:text-emerald-800 rounded bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer hover:shadow-xs flex items-center gap-0.5 border border-emerald-200/40"
                                      title={language === 'SW' ? "Ongeza au Punguza Stoo" : "Add or Reduce Stock"}
                                    >
                                      <Plus size={11} />
                                      <span className="text-[9.5px] font-extrabold tracking-wide uppercase">
                                        {language === 'SW' ? 'Stoo' : 'Stock'}
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => openEditProductForm(p)}
                                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded bg-slate-50 hover:bg-slate-100 transition cursor-pointer hover:shadow-xs"
                                      title={language === 'SW' ? "Sahihisha taarifa" : "Edit Details"}
                                    >
                                      <Edit size={13} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const confirmMsg = language === 'SW'
                                          ? `Una uhakika unataka kufuta bidhaa ya ${p.name}?`
                                          : `Are you sure you want to delete product ${p.name}?`;
                                        if (confirm(confirmMsg)) {
                                          deleteProduct(p.id);
                                        }
                                      }}
                                      className="p-1.5 text-red-500 hover:text-red-700 rounded bg-red-50 hover:bg-red-100 transition cursor-pointer hover:shadow-xs"
                                      title={language === 'SW' ? "Futa bidhaa hii" : "Delete this product"}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>

            {/* Product Add/Edit Form Overlay Panel (Right Side on Desktop If Open) */}
            {isAddingProduct || editingProduct ? (
              <div id="product-add-edit-panel" className="w-full md:w-[320px] bg-white rounded-xl border border-slate-200 p-4.5 shadow-2xs h-fit shrink-0 font-sans">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block">
                    {editingProduct 
                      ? (language === 'SW' ? 'Hariri Bidhaa (Sahihisha)' : 'Edit Product') 
                      : (language === 'SW' ? 'Ongeza Bidhaa Mpya' : 'Add New Product')}
                  </h4>
                  <button
                    id="close-product-form-btn"
                    onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition"
                  >
                    <X size={15} />
                  </button>
                </div>

                <form onSubmit={handleSubmitProduct} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Jina la Bidhaa *' : 'Product Name *'}
                    </label>
                    <input
                      id="form-pname-field"
                      type="text"
                      required
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-805 focus:bg-white"
                      placeholder={language === 'SW' ? "Mchele Safi, Mafuta, Soda n.k." : "Rice, Oil, Soda etc."}
                      value={pName}
                      onChange={e => setPName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Namba ya SKU / Barcode (Hiari)' : 'SKU / Barcode (Optional)'}
                    </label>
                    <input
                      id="form-pbarcode-field"
                      type="text"
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-805 focus:bg-white font-mono"
                      placeholder={language === 'SW' ? "Ukiacha wazi tutatoa otomatiki" : "Auto-generated if left empty"}
                      value={pBarcode}
                      onChange={e => setPBarcode(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Kundi (Category) *' : 'Category *'}
                    </label>
                    <select
                      id="form-pcategory-select"
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-805 focus:bg-white"
                      value={pCategory}
                      onChange={e => setPCategory(e.target.value)}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                   <div className="grid grid-cols-2 gap-2.5">
                    {canViewCostPrice ? (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          {language === 'SW' ? 'Bei ya Mtaji (Buying)' : 'Cost Price (Buying)'}
                        </label>
                        <input
                          id="form-pcostprice-field"
                          type="number"
                          min="0"
                          className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-805 focus:bg-white font-mono"
                          placeholder="0"
                          value={pCostPrice}
                          onChange={e => setPCostPrice(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="hidden" />
                    )}
                    <div className={canViewCostPrice ? '' : 'col-span-2'}>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        {language === 'SW' ? 'Bei ya Kuuza *' : 'Selling Price *'}
                      </label>
                      <input
                        id="form-psellingprice-field"
                        type="number"
                        min="0"
                        required
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-805 focus:bg-white font-mono font-sans"
                        placeholder="0"
                        value={pSellingPrice}
                        onChange={e => setPSellingPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        {language === 'SW' ? 'Stoo (Kiasi kilichopo)' : 'Current Stock Qty'}
                      </label>
                      <input
                        id="form-pstock-field"
                        type="number"
                        min="0"
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-805 focus:bg-white"
                        placeholder="0"
                        value={pStock}
                        onChange={e => setPStock(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        {language === 'SW' ? 'Kikomo cha chini (Low limit)' : 'Low Stock Threshold'}
                      </label>
                      <input
                        id="form-pminstock-field"
                        type="number"
                        min="0"
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-805 focus:bg-white"
                        placeholder="5"
                        value={pMinStock}
                        onChange={e => setPMinStock(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      id="product-form-cancel-btn"
                      type="button"
                      onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                      className="flex-1 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer text-center"
                    >
                      {language === 'SW' ? 'Ghairi' : 'Cancel'}
                    </button>
                    <button
                      id="product-form-submit-btn"
                      type="submit"
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <Save size={13} />
                      {editingProduct 
                        ? (language === 'SW' ? 'Hifadhi' : 'Save Changes') 
                        : (language === 'SW' ? 'Ongeza' : 'Add Product')}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

          </div>
        )}

        {/* SUB TAB 2: CATEGORIES WORKSPACE */}
        {activeSubTab === 'CATEGORIES' && (
          <div className="h-full flex flex-col md:flex-row gap-6 overflow-hidden font-sans">
            
            {/* Cateogries Listing table (Left side) */}
            <div className="flex-1 flex flex-col h-full bg-white border border-slate-200 rounded-xl p-5 shadow-2xs overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 text-sm">
                  {language === 'SW' ? 'Orodha ya Makundi (Product Categories)' : 'Product Categories'}
                </h3>
                {canManageInventory && (
                  <button
                    id="add-category-trigger-btn"
                    onClick={() => setIsAddingCategory(true)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    {language === 'SW' ? 'Kundi Jipya' : 'New Category'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {categories.map(cat => {
                  const count = products.filter(p => p.category === cat.id).length;

                  return (
                    <div 
                      key={cat.id} 
                      className={`p-4 rounded-xl border flex flex-col justify-between h-28 hover:shadow-xs transition ${cat.color}`}
                    >
                      <div>
                        <h4 className="font-black text-sm tracking-tight">{cat.name}</h4>
                        <p className="text-[11px] font-bold opacity-75 mt-1">
                          {count} {language === 'SW' ? 'Bidhaa zilizopo' : 'Products listed'}
                        </p>
                      </div>

                      {canManageInventory && (
                        <div className="flex justify-end gap-1.5 border-t border-black/10 pt-2.5">
                          <button
                            onClick={() => {
                              if (cat.id === 'cat-5') {
                                alert(language === 'SW' ? 'Huwezi kufuta kundi hili la msingi!' : 'You cannot delete this default category!');
                                return;
                              }
                              const confirmMsg = language === 'SW'
                                ? `Una uhakika unataka kufuta kundi la "${cat.name}"? Bidhaa zote humu zitahamishiwa kundi la Nyinginezo.`
                                : `Are you sure you want to delete the category "${cat.name}"? All products in this category will be moved to Miscellaneous.`;
                              if (confirm(confirmMsg)) {
                                deleteCategory(cat.id);
                              }
                            }}
                            className="p-1 px-2 hover:bg-black/5 text-red-700 bg-white/40 font-bold border border-black/5 flex items-center justify-center gap-1 text-[11px] rounded transition cursor-pointer"
                            title={language === 'SW' ? "Futa Kundi" : "Delete Category"}
                          >
                            <Trash2 size={12} />
                            {language === 'SW' ? 'Futa' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Form modal container */}
            {isAddingCategory && (
              <div id="category-add-panel" className="w-full md:w-[280px] bg-white rounded-xl border border-slate-200 p-4 shadow-2xs h-fit font-sans shrink-0">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block">
                    {language === 'SW' ? 'Sajili Kundi Jipya' : 'Add New Category'}
                  </h4>
                  <button
                    id="close-category-form-btn"
                    onClick={() => setIsAddingCategory(false)}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition"
                  >
                    <X size={15} />
                  </button>
                </div>

                <form onSubmit={handleSubmitCategory} className="space-y-4 text-xs text-slate-700">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Jina la Kundi *' : 'Category Name *'}
                    </label>
                    <input
                      id="form-catname-field"
                      type="text"
                      required
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-805 focus:bg-white"
                      placeholder={language === 'SW' ? "Mifano: Vipaji, Karanga, Vyombo" : "e.g. Snacks, Drinks, Cosmetics"}
                      value={catName}
                      onChange={e => setCatName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2">
                      {language === 'SW' ? 'Chagua Mandhari ya Kundi:' : 'Choose Category Color Preset:'}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {colorPresets.map((cl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCatColor(cl.value)}
                          className={`h-7 w-full rounded border flex items-center justify-center font-bold text-[10px] transition cursor-pointer ${cl.value} ${
                            catColor === cl.value ? 'ring-2 ring-slate-800 scale-105 shadow-sm' : 'opacity-80 hover:opacity-100'
                          }`}
                          title={cl.name}
                        >
                          Aa
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      id="cat-form-cancel-btn"
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="flex-1 py-2 text-slate-600 hover:bg-slate-100 font-semibold text-center rounded-lg"
                    >
                      {language === 'SW' ? 'Ghairi' : 'Cancel'}
                    </button>
                    <button
                      id="cat-form-submit-btn"
                      type="submit"
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition"
                    >
                      {language === 'SW' ? 'Ongeza' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        )}

        {/* SUB TAB 3: STOCK MOVEMENT HISTORY LOGS */}
        {activeSubTab === 'STOCK_LOGS' && (
          <div className="h-full flex flex-col bg-white border border-slate-200 rounded-xl p-5 shadow-2xs overflow-hidden font-sans">
            <h3 className="font-bold text-slate-800 text-sm mb-1.5">
              {language === 'SW' ? 'Gogo la Mabadiliko ya Stoo (Stock Movement Audit Logs)' : 'Stock Movement Audit Logs'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-normal">
              {language === 'SW' 
                ? 'Mfumo huu umehifadhi otomatiki nyakati zote ambazo bidhaa ziliingia stoo, kupunguzwa kupitia mauzo, au kurekebishwa na mhudumu.'
                : 'The system automatically logs all stock additions, sales depletions, or manual corrections made by staff members.'}
            </p>

            <div id="stock-logs-scroll" className="flex-1 overflow-y-auto pr-1">
              {stockLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <p className="text-xs">
                    {language === 'SW' ? 'Bado hakuna kumbukumbu za mabadiliko ya stoo.' : 'No stock changes logged yet.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stockLogs.map((log) => {
                    const prodObj = products.find(p => p.id === log.productId);
                    const prodName = prodObj?.name || 'Bidhaa Iliyofutwa';
                    
                    const isIncrease = log.type === 'IN' || (log.type === 'ADJUST' && log.note.includes('restocked'));
                    const isSale = log.type === 'SALE';

                    return (
                      <div 
                        key={log.id} 
                        className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:shadow-2xs transition ${
                          isIncrease 
                            ? 'bg-emerald-50/50 border-emerald-100'
                            : isSale
                              ? 'bg-slate-50/70 border-slate-100'
                              : 'bg-amber-50/40 border-amber-100'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900">{prodName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">#{log.productId.substr(log.productId.length - 4)}</span>
                          </div>
                          <p className="text-slate-600 font-medium">{log.note}</p>
                          <p className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString('sw-TZ')}</p>
                        </div>

                        <div className="flex items-center gap-2 font-mono font-bold whitespace-nowrap sm:text-right shrink-0">
                          {isIncrease ? (
                            <span className="text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded flex items-center gap-0.5">
                              <ArrowUp size={12} />
                              +{log.quantity} units
                            </span>
                          ) : (
                            <span className="text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded flex items-center gap-0.5">
                              <ArrowDown size={12} />
                              -{log.quantity} units
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB TAB 4: WASAMBAZAJI / SUPPLIERS MANAGEMENT */}
        {activeSubTab === 'SUPPLIERS' && (
          <div className="h-full flex flex-col md:flex-row gap-4 overflow-hidden font-sans">
            {/* Left Column: Suppliers List & Header Controls */}
            <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <Truck size={18} className="text-indigo-600" />
                    {language === 'SW' ? 'Taarifa za Wasambazaji na Wazabuni (Suppliers)' : 'Suppliers & Wholesalers'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'SW' ? 'Weka na uhariri taarifa za makampuni na wasambazaji wa bidhaa za duka lako.' : 'Manage supplier details, contact information, and company notes.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="open-google-contacts-suppliers-btn"
                    onClick={() => setIsGoogleContactsHubOpen(true)}
                    className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    title="Agiza au sawazisha wasambazaji kutoka Google Contacts"
                  >
                    <BookUser size={14} className="text-blue-600" />
                    <span>Google Contacts</span>
                  </button>

                  {canManageInventory && (
                    <button
                      id="add-supplier-btn"
                      onClick={openAddSupplierForm}
                      className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
                    >
                      <Plus size={15} />
                      {language === 'SW' ? 'Ongeza Msambazaji' : 'Add Supplier'}
                    </button>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="search-supplier-input"
                  type="text"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:bg-white transition"
                  placeholder={language === 'SW' ? 'Tafuta msambazaji kwa jina, kampuni au namba ya simu...' : 'Search supplier by name, company or phone...'}
                  value={supplierQuery}
                  onChange={e => setSupplierQuery(e.target.value)}
                />
              </div>

              {/* Suppliers List / Grid */}
              <div id="suppliers-list-scroll" className="flex-1 overflow-y-auto pr-1">
                {filteredSuppliers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Building2 size={36} className="mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">
                      {language === 'SW' ? 'Hakuna wasambazaji waliopatikana.' : 'No suppliers found.'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {language === 'SW' ? 'Bonyeza "Ongeza Msambazaji" kusajili wa kwanza.' : 'Click "Add Supplier" to register one.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredSuppliers.map((supp) => (
                      <div 
                        key={supp.id} 
                        className="bg-white border border-slate-200/90 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-black text-slate-900 text-sm truncate">{supp.name}</h4>
                              {supp.companyName && (
                                <span className="text-[11px] font-semibold text-indigo-600 block truncate">
                                  {supp.companyName}
                                </span>
                              )}
                            </div>
                            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 shrink-0">
                              <Truck size={16} />
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-600 my-3">
                            <div className="flex items-center gap-2 text-slate-800 font-mono">
                              <Phone size={13} className="text-slate-400 shrink-0" />
                              <a href={`tel:${supp.phone}`} className="hover:underline font-bold">{supp.phone}</a>
                            </div>

                            {supp.email && (
                              <div className="flex items-center gap-2 truncate text-slate-600">
                                <Mail size={13} className="text-slate-400 shrink-0" />
                                <span className="truncate">{supp.email}</span>
                              </div>
                            )}

                            {supp.address && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <MapPin size={13} className="text-slate-400 shrink-0" />
                                <span className="truncate">{supp.address}</span>
                              </div>
                            )}

                            {supp.notes && (
                              <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                                "{supp.notes}"
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-1.5 pt-3 border-t border-slate-100 mt-2">
                          <button
                            type="button"
                            onClick={() => setOrderModalSupplier(supp)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs flex items-center gap-1 transition shadow-2xs cursor-pointer"
                            title={language === 'SW' ? 'Tuma orodha ya mahitaji kwa WhatsApp' : 'Send order requisition via WhatsApp'}
                          >
                            <Send size={12} />
                            <span>{language === 'SW' ? 'Tuma Agizo WA' : 'Send Order WA'}</span>
                          </button>

                          {canManageInventory && (
                            <div className="flex items-center gap-1.5">
                              <button
                                id={`edit-supplier-${supp.id}`}
                                onClick={() => openEditSupplierForm(supp)}
                                className="px-2 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                <Edit size={13} />
                                {language === 'SW' ? 'Hariri' : 'Edit'}
                              </button>
                              <button
                                id={`delete-supplier-${supp.id}`}
                                onClick={() => {
                                  if (confirm(language === 'SW' ? `Unahakika unataka kumfuta msambazaji ${supp.name}?` : `Are you sure you want to delete supplier ${supp.name}?`)) {
                                    if (deleteSupplier) deleteSupplier(supp.id);
                                  }
                                }}
                                className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer"
                                title={language === 'SW' ? 'Futa Msambazaji' : 'Delete Supplier'}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Add/Edit Supplier Modal / Side Panel */}
            {isAddingSupplier && (
              <div id="supplier-form-panel" className="w-full md:w-[340px] bg-white rounded-2xl border border-slate-200 p-5 shadow-lg font-sans shrink-0 h-fit">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={15} className="text-indigo-600" />
                    {editingSupplier 
                      ? (language === 'SW' ? 'Hariri Taarifa za Msambazaji' : 'Edit Supplier Details') 
                      : (language === 'SW' ? 'Sajili Msambazaji Mpya' : 'Add New Supplier')}
                  </h4>
                  <button
                    id="close-supplier-form-btn"
                    onClick={() => { setIsAddingSupplier(false); setEditingSupplier(null); }}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSubmitSupplier} className="space-y-3.5 text-xs">
                  {/* Quick Autofill from Google Contacts banner */}
                  <div className="flex items-center justify-between bg-blue-50/80 p-2.5 rounded-xl border border-blue-200/70 mb-2 text-xs">
                    <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
                      <BookUser size={14} className="text-blue-600 shrink-0" />
                      <span className="text-[10.5px]">{language === 'SW' ? 'Kutoka Google:' : 'From Google:'}</span>
                    </div>
                    <button
                      type="button"
                      id="autofill-supplier-from-google-btn"
                      onClick={() => setIsGooglePickerOpen(true)}
                      className="px-2 py-0.8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer shadow-2xs"
                    >
                      {language === 'SW' ? 'Chagua Msambazaji' : 'Pick Contact'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Jina la Msambazaji / Mawasiliano *' : 'Supplier Contact Name *'}
                    </label>
                    <input
                      id="form-suppname-field"
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder={language === 'SW' ? "Mfano: Kariakoo Agritech Ltd" : "e.g. Kariakoo Agritech Ltd"}
                      value={suppName}
                      onChange={e => setSuppName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Jina la Kampuni (Company Name)' : 'Company Name'}
                    </label>
                    <input
                      id="form-suppcompany-field"
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder={language === 'SW' ? "Mfano: Wholesalers & Distributors" : "e.g. Wholesalers & Distributors"}
                      value={suppCompany}
                      onChange={e => setSuppCompany(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Namba ya Simu *' : 'Phone Number *'}
                    </label>
                    <input
                      id="form-suppphone-field"
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder="0712345678"
                      value={suppPhone}
                      onChange={e => setSuppPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Barua Pepe (Email)' : 'Email Address'}
                    </label>
                    <input
                      id="form-suppemail-field"
                      type="email"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder="supplier@company.co.tz"
                      value={suppEmail}
                      onChange={e => setSuppEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Anwani / Mahali (Location)' : 'Location Address'}
                    </label>
                    <input
                      id="form-suppaddress-field"
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder={language === 'SW' ? "Mfano: Msimbazi St, Kariakoo" : "e.g. Kariakoo, Dar es Salaam"}
                      value={suppAddress}
                      onChange={e => setSuppAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Maelezo ya Ziada (Notes)' : 'Additional Notes'}
                    </label>
                    <textarea
                      id="form-suppnotes-field"
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      placeholder={language === 'SW' ? "Maelezo kuhusu bidhaa anazosambaza au masharti..." : "Notes about items supplied or terms..."}
                      value={suppNotes}
                      onChange={e => setSuppNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button
                      id="supp-form-cancel-btn"
                      type="button"
                      onClick={() => { setIsAddingSupplier(false); setEditingSupplier(null); }}
                      className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 font-semibold text-center rounded-xl cursor-pointer"
                    >
                      {language === 'SW' ? 'Ghairi' : 'Cancel'}
                    </button>
                    <button
                      id="supp-form-submit-btn"
                      type="submit"
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
                    >
                      {editingSupplier 
                        ? (language === 'SW' ? 'Hifadhi' : 'Save') 
                        : (language === 'SW' ? 'Sajili' : 'Register')}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

      {/* RESTOCK / STOCK CORRECTION MODAL OVERLAY */}
      {restockProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight size={18} className="text-emerald-400" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider">
                  {language === 'SW' ? 'Marekebisho ya Stoo (Stock Adjust)' : 'Stock Adjust / Correction'}
                </h3>
              </div>
              <button 
                onClick={() => setRestockProduct(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!restockProduct) return;
              const additional = parseInt(restockQty) || 0;
              if (additional <= 0) {
                alert(language === 'SW' ? "Weka idadi sahihi ya bidhaa kubwa kuliko sifuri!" : "Please enter a valid quantity greater than zero!");
                return;
              }

              let updatedStock = restockProduct.stock;
              let directionLabel = '';
              let selectedLogNote = restockNote;

              if (restockType === 'IN') {
                updatedStock += additional;
                directionLabel = language === 'SW' ? `Ongezeko` : `Stock In`;
              } else {
                updatedStock = Math.max(0, restockProduct.stock - additional);
                directionLabel = language === 'SW' ? `Kuharibika / Hasara` : `Damaged / Loss`;
                // Guarantee the note includes swahili or english loss term for reports calculation matching
                if (!selectedLogNote.toLowerCase().includes('hasara') && !selectedLogNote.toLowerCase().includes('kuharibika') && !selectedLogNote.toLowerCase().includes('damage')) {
                  selectedLogNote = `Hasara/Kuharibika - ${selectedLogNote}`;
                }
              }

              const updated: Product = {
                ...restockProduct,
                stock: updatedStock
              };

              const adminLogPrefix = language === 'SW'
                ? `Marekebisho ya stoo (Admin): [${directionLabel} +${additional} pcs] - Nukuu: `
                : `Stock adjustment (Admin): [${directionLabel} +${additional} pcs] - Notes: `;

              updateProduct(updated, `${adminLogPrefix}${selectedLogNote}`);
              setRestockProduct(null);
            }} className="p-5 space-y-4">
              
              {/* Product Info Row */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  {language === 'SW' ? 'Bidhaa:' : 'Product:'}
                </span>
                <span className="font-extrabold text-slate-900 block text-xs sm:text-sm mt-0.5">{restockProduct.name}</span>
                <div className="flex justify-between text-[11px] text-slate-600 mt-2 font-mono">
                  <span>
                    {language === 'SW' ? 'Hisa iliyopo:' : 'Current Stock:'} <strong className="text-slate-900 font-extrabold">{restockProduct.stock} pcs</strong>
                  </span>
                  <span>SKU: {restockProduct.barcode}</span>
                </div>
              </div>

              {/* Action Type Toggle */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  {language === 'SW' ? 'Aina ya mabadiliko (Direction)' : 'Adjustment Direction'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRestockType('IN');
                      setRestockNote(language === 'SW' ? 'Kupokea mizigo mipya (Restocking)' : 'Restocking / Receiving new stock');
                    }}
                    className={`py-2 px-3 rounded-xl border text-[11px] font-extrabold text-center transition cursor-pointer select-none ${
                      restockType === 'IN'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-250 text-slate-650'
                    }`}
                  >
                    🚀 {language === 'SW' ? '+ Ongeza Stoo (IN)' : '+ Restock (IN)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRestockType('OUT');
                      setRestockNote(language === 'SW' ? 'Bidhaa iliyoharibika au upotevu dukani (Write-off)' : 'Damaged goods or inventory loss (Write-off)');
                    }}
                    className={`py-2 px-3 rounded-xl border text-[11px] font-extrabold text-center transition cursor-pointer select-none ${
                      restockType === 'OUT'
                        ? 'bg-red-50 border-red-500 text-red-800'
                        : 'bg-white border-slate-250 text-slate-650'
                    }`}
                  >
                    ⚠️ {language === 'SW' ? '- Ondoa / Hasara (OUT)' : '- Loss / Damage (OUT)'}
                  </button>
                </div>
              </div>

              {/* Input Qty Row */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  {language === 'SW' ? 'Idadi ya Vipande (Quantity) *' : 'Quantity *'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder={language === 'SW' ? "Mifano: 10, 50, 100" : "e.g. 10, 50, 100"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-slate-800 focus:bg-white"
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                />
              </div>

              {/* Input Reason Note */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  {language === 'SW' ? 'Sababu au Maelezo (Reason Note) *' : 'Reason / Note *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'SW' ? "K.m. Risiti ya mzigo mpya, bidhaa imeisha muda mrefu n.k." : "e.g. Received new shipment batch, expired batch write-off"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-slate-800 focus:bg-white"
                  value={restockNote}
                  onChange={e => setRestockNote(e.target.value)}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="flex-1 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-center text-xs cursor-pointer"
                >
                  {language === 'SW' ? 'Ghairi' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-1.5 text-white font-extrabold rounded-lg text-xs transition shadow cursor-pointer ${
                    restockType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {language === 'SW' ? 'Hifadhi Mabadiliko' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER PURCHASE ORDER MODAL */}
      <SupplierOrderModal
        isOpen={!!orderModalSupplier}
        onClose={() => setOrderModalSupplier(null)}
        supplier={orderModalSupplier}
        products={state.products}
        language={language}
        shopName={state.settings?.storeName || 'SANDU ELECTRONICS'}
      />

      {/* GOOGLE CONTACTS HUB MODAL */}
      <GoogleContactsModal
        isOpen={isGoogleContactsHubOpen}
        onClose={() => setIsGoogleContactsHubOpen(false)}
        state={state}
        onImportSuppliers={handleImportSuppliersBatch}
      />

      {/* GOOGLE CONTACTS PICKER MODAL FOR SUPPLIERS */}
      <GoogleContactsModal
        isOpen={isGooglePickerOpen}
        onClose={() => setIsGooglePickerOpen(false)}
        state={state}
        pickerMode={true}
        pickerTarget="supplier"
        onSelectContactForFill={handleSelectSupplierFromPicker}
      />

      </div>
    </div>
  );
}
