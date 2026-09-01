import React, { useState, useEffect, useMemo } from 'react';
import { 
  GoogleContactPerson, 
  fetchGoogleContacts, 
  searchGoogleContacts, 
  createGoogleContact, 
  updateGoogleContact, 
  deleteGoogleContact 
} from '../lib/contacts';
import { 
  googleSignIn, 
  logout, 
  auth, 
  getAccessToken 
} from '../lib/firebase';
import { Customer, Supplier, DbState } from '../types';
import { useLanguage } from '../lib/translations';
import { 
  X, 
  Search, 
  UserPlus, 
  RefreshCw, 
  Check, 
  Phone, 
  Mail, 
  Building2, 
  MapPin, 
  Trash2, 
  Edit3, 
  UploadCloud, 
  DownloadCloud, 
  Users, 
  AlertTriangle,
  ExternalLink,
  Loader2,
  CheckCircle2,
  BookUser,
  Plus
} from 'lucide-react';

interface GoogleContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DbState;
  onImportCustomers?: (imported: Array<Omit<Customer, 'id' | 'createdAt' | 'debt'>>) => void;
  onImportSuppliers?: (imported: Array<Omit<Supplier, 'id' | 'createdAt'>>) => void;
  onSelectContactForFill?: (contact: GoogleContactPerson) => void;
  pickerMode?: boolean; // If true, acts as a picker to return a single contact
  pickerTarget?: 'customer' | 'supplier';
}

export default function GoogleContactsModal({
  isOpen,
  onClose,
  state,
  onImportCustomers,
  onImportSuppliers,
  onSelectContactForFill,
  pickerMode = false,
  pickerTarget = 'customer'
}: GoogleContactsModalProps) {
  const { language } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Contacts state
  const [contacts, setContacts] = useState<GoogleContactPerson[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filter tab
  const [filterTab, setFilterTab] = useState<'all' | 'not_imported' | 'imported'>('all');

  // Contact Create / Edit Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<GoogleContactPerson | null>(null);
  const [formGivenName, setFormGivenName] = useState('');
  const [formFamilyName, setFormFamilyName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Contact Delete Confirmation Modal
  const [deletingContact, setDeletingContact] = useState<GoogleContactPerson | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Batch Exporting State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await getAccessToken();
        setAccessToken(token);
      } else {
        setAccessToken(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch contacts when token is available and modal is open
  useEffect(() => {
    if (isOpen && accessToken) {
      loadContacts();
    }
  }, [isOpen, accessToken]);

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const loadContacts = async () => {
    if (!accessToken) return;
    setIsLoadingContacts(true);
    try {
      const fetched = await fetchGoogleContacts(accessToken);
      setContacts(fetched);
    } catch (err: any) {
      console.error('Failed to load Google Contacts:', err);
      showStatus(err.message || 'Error loading contacts', 'error');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        showStatus(
          language === 'SW' ? 'Umeunganisha Google Contacts kikamilifu!' : 'Google Contacts connected successfully!',
          'success'
        );
      }
    } catch (err: any) {
      console.warn('[GoogleContactsModal] Google Sign In notice:', err?.message || err);
      const isNetwork = err?.isNetworkOrIframeError || 
        err?.code === 'auth/network-request-failed' ||
        String(err?.message || err).includes('network-request-failed') ||
        err?.code === 'auth/popup-blocked';

      showStatus(
        language === 'SW' 
          ? (isNetwork ? 'Kizuizi cha mtandao/iframe. Fungua app kwenye tab mpya.' : 'Imeshindikana kuingia na Google.')
          : (isNetwork ? 'Network/iframe auth restriction. Open app in a new tab.' : 'Failed to connect Google account.'),
        'error'
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setContacts([]);
      showStatus(language === 'SW' ? 'Umetoka kwenye Google.' : 'Logged out from Google.', 'info');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Check if contact already exists in LedgerBox
  const isExistingInLedgerBox = (c: GoogleContactPerson) => {
    const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
    const cleanEmail = (c.email || '').toLowerCase().trim();
    const nameMatch = c.displayName.toLowerCase().trim();

    const inCustomers = state.customers.some(cust => {
      const custPhone = cust.phone.replace(/[^0-9]/g, '');
      const custEmail = cust.email.toLowerCase().trim();
      return (cleanPhone && custPhone === cleanPhone) || 
             (cleanEmail && custEmail === cleanEmail) || 
             (cust.name.toLowerCase().trim() === nameMatch);
    });

    const inSuppliers = (state.suppliers || []).some(sup => {
      const supPhone = sup.phone.replace(/[^0-9]/g, '');
      const supEmail = (sup.email || '').toLowerCase().trim();
      return (cleanPhone && supPhone === cleanPhone) || 
             (cleanEmail && supEmail === cleanEmail) || 
             (sup.name.toLowerCase().trim() === nameMatch);
    });

    return inCustomers || inSuppliers;
  };

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        c.displayName.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const exists = isExistingInLedgerBox(c);
      if (filterTab === 'imported') return exists;
      if (filterTab === 'not_imported') return !exists;
      return true;
    });
  }, [contacts, searchQuery, filterTab, state.customers, state.suppliers]);

  // Toggle selection
  const toggleSelect = (resourceName: string) => {
    const next = new Set(selectedIds);
    if (next.has(resourceName)) {
      next.delete(resourceName);
    } else {
      next.add(resourceName);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.resourceName)));
    }
  };

  // Handle Bulk Import to Customers
  const handleBulkImportCustomers = () => {
    if (selectedIds.size === 0 || !onImportCustomers) return;
    const selected = contacts.filter(c => selectedIds.has(c.resourceName));
    
    const importPayload = selected.map(c => ({
      name: c.displayName,
      phone: c.phone || '',
      email: c.email || '',
      notes: [
        c.company ? `Company: ${c.company}` : '',
        c.address ? `Address: ${c.address}` : '',
        c.notes ? `Notes: ${c.notes}` : '',
        'Imported from Google Contacts'
      ].filter(Boolean).join(' | ')
    }));

    onImportCustomers(importPayload);
    setSelectedIds(new Set());
    showStatus(
      language === 'SW' 
        ? `Wateja ${importPayload.length} wameongezwa kutoka Google Contacts!` 
        : `Successfully imported ${importPayload.length} customer(s) from Google Contacts!`,
      'success'
    );
  };

  // Handle Bulk Import to Suppliers
  const handleBulkImportSuppliers = () => {
    if (selectedIds.size === 0 || !onImportSuppliers) return;
    const selected = contacts.filter(c => selectedIds.has(c.resourceName));
    
    const importPayload = selected.map(c => ({
      name: c.displayName,
      companyName: c.company || c.displayName,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      notes: c.notes ? `${c.notes} (Imported from Google Contacts)` : 'Imported from Google Contacts'
    }));

    onImportSuppliers(importPayload);
    setSelectedIds(new Set());
    showStatus(
      language === 'SW' 
        ? `Wasambazaji ${importPayload.length} wameongezwa kutoka Google Contacts!` 
        : `Successfully imported ${importPayload.length} supplier(s) from Google Contacts!`,
      'success'
    );
  };

  // Open Create / Edit Contact Modal
  const openNewContactForm = () => {
    setEditingContact(null);
    setFormGivenName('');
    setFormFamilyName('');
    setFormPhone('');
    setFormEmail('');
    setFormCompany('');
    setFormNotes('');
    setFormAddress('');
    setIsFormOpen(true);
  };

  const openEditContactForm = (c: GoogleContactPerson) => {
    setEditingContact(c);
    setFormGivenName(c.givenName || c.displayName);
    setFormFamilyName(c.familyName || '');
    setFormPhone(c.phone || '');
    setFormEmail(c.email || '');
    setFormCompany(c.company || '');
    setFormNotes(c.notes || '');
    setFormAddress(c.address || '');
    setIsFormOpen(true);
  };

  // Save Contact (Create or Edit)
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !formGivenName.trim()) return;

    setIsSavingContact(true);
    try {
      if (editingContact) {
        // Confirmation for updating contact
        const updated = await updateGoogleContact(
          accessToken,
          editingContact.resourceName,
          editingContact.etag,
          {
            givenName: formGivenName.trim(),
            familyName: formFamilyName.trim() || undefined,
            phone: formPhone.trim() || undefined,
            email: formEmail.trim() || undefined,
            company: formCompany.trim() || undefined,
            notes: formNotes.trim() || undefined,
            address: formAddress.trim() || undefined,
          }
        );
        setContacts(prev => prev.map(c => c.resourceName === updated.resourceName ? updated : c));
        showStatus(language === 'SW' ? 'Mawasiliano yamehaririwa Google!' : 'Contact updated in Google Contacts!', 'success');
      } else {
        const created = await createGoogleContact(accessToken, {
          givenName: formGivenName.trim(),
          familyName: formFamilyName.trim() || undefined,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          company: formCompany.trim() || undefined,
          notes: formNotes.trim() || undefined,
          address: formAddress.trim() || undefined,
        });
        setContacts(prev => [created, ...prev]);
        showStatus(language === 'SW' ? 'Mawasiliano mapya yamehifadhiwa Google!' : 'New contact created in Google Contacts!', 'success');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Error saving Google contact:', err);
      showStatus(err.message || 'Failed to save contact', 'error');
    } finally {
      setIsSavingContact(false);
    }
  };

  // Delete Contact with User Confirmation Dialog
  const handleDeleteContact = async () => {
    if (!accessToken || !deletingContact) return;

    setIsDeleting(true);
    try {
      await deleteGoogleContact(accessToken, deletingContact.resourceName);
      setContacts(prev => prev.filter(c => c.resourceName !== deletingContact.resourceName));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(deletingContact.resourceName);
        return next;
      });
      showStatus(
        language === 'SW' ? `Mawasiliano ya ${deletingContact.displayName} yamefutwa kutoka Google.` : `Deleted ${deletingContact.displayName} from Google Contacts.`,
        'success'
      );
      setDeletingContact(null);
    } catch (err: any) {
      console.error('Error deleting Google contact:', err);
      showStatus(err.message || 'Failed to delete contact', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export all LedgerBox Customers to Google Contacts
  const handleExportCustomersToGoogle = async () => {
    if (!accessToken || state.customers.length === 0) return;
    
    const confirmed = window.confirm(
      language === 'SW'
        ? `Je, una uhakika unataka kusafirisha wateja ${state.customers.length} kwenda kwenye Google Contacts yako?`
        : `Export all ${state.customers.length} customer(s) to your Google Contacts?`
    );
    if (!confirmed) return;

    setIsExporting(true);
    setExportProgress({ current: 0, total: state.customers.length });

    let createdCount = 0;
    try {
      for (let i = 0; i < state.customers.length; i++) {
        const cust = state.customers[i];
        setExportProgress({ current: i + 1, total: state.customers.length });
        
        try {
          const names = cust.name.trim().split(' ');
          const givenName = names[0] || 'Customer';
          const familyName = names.slice(1).join(' ') || '';

          await createGoogleContact(accessToken, {
            givenName,
            familyName,
            phone: cust.phone || undefined,
            email: cust.email || undefined,
            company: state.settings.storeName || undefined,
            notes: `LedgerBox Customer | Outstanding Debt: ${cust.debt} | Notes: ${cust.notes || 'None'}`
          });
          createdCount++;
        } catch (subErr) {
          console.warn(`Could not export customer ${cust.name}:`, subErr);
        }
      }

      await loadContacts();
      showStatus(
        language === 'SW' 
          ? `Wateja ${createdCount} wamesafirishwa kwenda Google Contacts!` 
          : `Exported ${createdCount} customer(s) to Google Contacts!`,
        'success'
      );
    } catch (err: any) {
      console.error('Export error:', err);
      showStatus(err.message || 'Export failed', 'error');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="google-contacts-modal-container"
        className="bg-white text-slate-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
      >
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <BookUser size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  {pickerMode 
                    ? (language === 'SW' ? 'Chagua Mawasiliano kutoka Google' : 'Pick Contact from Google')
                    : (language === 'SW' ? 'Google Contacts Hub & Usawazishaji' : 'Google Contacts Explorer & Sync')}
                </h2>
                <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  People API
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'SW' 
                  ? 'Tafuta, sajili, hamisha na sawazisha wateja na wasambazaji kutoka Google Contacts.'
                  : 'Browse, import, create, and sync contacts seamlessly with your Google Account.'}
              </p>
            </div>
          </div>

          <button
            id="close-google-contacts-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* STATUS BANNER */}
        {statusMessage && (
          <div className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 transition-all ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' :
            statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border-b border-rose-200' :
            'bg-blue-50 text-blue-800 border-b border-blue-200'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> :
             statusMessage.type === 'error' ? <AlertTriangle size={16} className="text-rose-600 shrink-0" /> :
             <Loader2 size={16} className="text-blue-600 animate-spin shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* AUTH STATE / ACTION BAR */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {user && accessToken ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={user.photoURL || 'https://lh3.googleusercontent.com/a/default-user'} 
                  alt={user.displayName || 'Google User'} 
                  className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full"></span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{user.displayName || 'Google User'}</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold">Imeunganishwa</span>
                </div>
                <span className="text-[11px] text-slate-500">{user.email}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">
                {language === 'SW' ? 'Akaunti ya Google haijaunganishwa:' : 'Google Account not connected:'}
              </span>
              <button
                id="google-signin-contacts-btn"
                onClick={handleSignIn}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Users size={14} />
                <span>{language === 'SW' ? 'Ingia na Google' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}

          {/* ACTION BUTTONS */}
          {user && accessToken && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="refresh-google-contacts-btn"
                onClick={loadContacts}
                disabled={isLoadingContacts}
                className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="Pakia upya kutoka Google"
              >
                <RefreshCw size={14} className={isLoadingContacts ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{language === 'SW' ? 'Pakia Upya' : 'Refresh'}</span>
              </button>

              <button
                id="add-google-contact-btn"
                onClick={openNewContactForm}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>{language === 'SW' ? 'Ongeza Google Contact' : 'New Contact'}</span>
              </button>

              {!pickerMode && (
                <button
                  id="export-customers-to-google-btn"
                  onClick={handleExportCustomersToGoogle}
                  disabled={isExporting}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                  title="Hamisha wateja wote wa duka kwenda kwenye Google Contacts yako"
                >
                  <UploadCloud size={14} />
                  <span>
                    {isExporting 
                      ? `${exportProgress?.current}/${exportProgress?.total}...` 
                      : (language === 'SW' ? 'Hamisha Wateja Google' : 'Export Customers')}
                  </span>
                </button>
              )}

              <button
                id="google-signout-contacts-btn"
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                title="Ondoka Google"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* SEARCH & FILTERS BAR */}
        {user && accessToken && (
          <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="search-google-contacts-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'SW' ? 'Tafuta jina, simu, email au kampuni...' : 'Search name, phone, email...'}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {language === 'SW' ? 'Zote' : 'All'} ({contacts.length})
              </button>
              <button
                onClick={() => setFilterTab('not_imported')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  filterTab === 'not_imported' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {language === 'SW' ? 'Bado Kuagizwa' : 'Not Imported'}
              </button>
              <button
                onClick={() => setFilterTab('imported')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  filterTab === 'imported' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {language === 'SW' ? 'Imo Kwenye Duka' : 'In LedgerBox'}
              </button>
            </div>
          </div>
        )}

        {/* BULK ACTION BAR (When items are selected) */}
        {!pickerMode && selectedIds.size > 0 && (
          <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-900">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                {selectedIds.size}
              </span>
              <span>{language === 'SW' ? 'Umechagua mawasiliano' : 'Selected contacts'}</span>
            </div>

            <div className="flex items-center gap-2">
              {onImportCustomers && (
                <button
                  id="bulk-import-to-customers-btn"
                  onClick={handleBulkImportCustomers}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Users size={13} />
                  <span>{language === 'SW' ? 'Agiza kama Wateja' : 'Import as Customers'}</span>
                </button>
              )}
              {onImportSuppliers && (
                <button
                  id="bulk-import-to-suppliers-btn"
                  onClick={handleBulkImportSuppliers}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Building2 size={13} />
                  <span>{language === 'SW' ? 'Agiza kama Wasambazaji' : 'Import as Suppliers'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* CONTACTS LIST CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {!user || !accessToken ? (
            <div className="py-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
                <BookUser size={32} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {language === 'SW' ? 'Unganisha Google Contacts' : 'Connect Google Contacts'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'SW'
                    ? 'Ruhusu mfumo kupata mawasiliano ya wateja kutoka Google People API ili uweze kuyaingiza kwenye LedgerBox au kusawazisha madeni yao moja kwa moja.'
                    : 'Allow LedgerBox to access your Google Contacts to quickly import customers, fill debt records, and keep customer directories synchronized.'}
                </p>
              </div>
              <button
                id="connect-google-btn-prompt"
                onClick={handleSignIn}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Users size={15} />
                <span>{language === 'SW' ? 'Unganisha Sasa na Google' : 'Connect Google Account Now'}</span>
              </button>
            </div>
          ) : isLoadingContacts ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-500">
                {language === 'SW' ? 'Inapakua mawasiliano kutoka Google...' : 'Loading Google Contacts...'}
              </p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <Search size={22} />
              </div>
              <p className="text-xs font-bold text-slate-600">
                {searchQuery 
                  ? (language === 'SW' ? 'Hakuna mawasiliano yanayolingana na utafutaji.' : 'No contacts match your query.')
                  : (language === 'SW' ? 'Hakuna mawasiliano kwenye Google Contacts yako.' : 'No contacts found in your Google Account.')}
              </p>
              <button
                onClick={openNewContactForm}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                + {language === 'SW' ? 'Ongeza mawasiliano mapya sasa' : 'Add a new contact now'}
              </button>
            </div>
          ) : (
            <div>
              {/* Select All Checkbox Header */}
              {!pickerMode && (
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs text-slate-500">
                  <label className="flex items-center gap-2 cursor-pointer select-none font-semibold">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>{language === 'SW' ? 'Chagua Zote' : 'Select All'} ({filteredContacts.length})</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {language === 'SW' ? 'Gusa kuingiza au kuhariri' : 'Click to import or edit'}
                  </span>
                </div>
              )}

              {/* Grid of Contact Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredContacts.map(contact => {
                  const isSelected = selectedIds.has(contact.resourceName);
                  const isImported = isExistingInLedgerBox(contact);

                  return (
                    <div
                      key={contact.resourceName}
                      id={`contact-card-${contact.resourceName.replace('/', '-')}`}
                      className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-blue-50/70 border-blue-400 shadow-sm ring-1 ring-blue-400' 
                          : 'bg-white hover:bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      {/* Top Info Row */}
                      <div className="flex items-start gap-3">
                        {!pickerMode && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(contact.resourceName)}
                            className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        )}

                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {contact.photoUrl ? (
                            <img
                              src={contact.photoUrl}
                              alt={contact.displayName}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                              {contact.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">
                              {contact.displayName}
                            </h4>
                            {isImported && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-extrabold shrink-0 flex items-center gap-0.5">
                                <Check size={10} />
                                <span>{language === 'SW' ? 'Dukani' : 'LedgerBox'}</span>
                              </span>
                            )}
                          </div>

                          {contact.phone && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5 font-medium">
                              <Phone size={11} className="text-slate-400 shrink-0" />
                              <span className="font-mono">{contact.phone}</span>
                            </div>
                          )}

                          {contact.email && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate">
                              <Mail size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}

                          {contact.company && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                              <Building2 size={10} className="text-slate-400 shrink-0" />
                              <span className="truncate">{contact.company}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Row */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        {pickerMode ? (
                          <button
                            id={`pick-contact-${contact.resourceName.replace('/', '-')}`}
                            onClick={() => {
                              if (onSelectContactForFill) {
                                onSelectContactForFill(contact);
                                onClose();
                              }
                            }}
                            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <Check size={13} />
                            <span>{language === 'SW' ? 'Chagua Huyu' : 'Select Contact'}</span>
                          </button>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5">
                              {onImportCustomers && !isImported && (
                                <button
                                  onClick={() => {
                                    onImportCustomers([{
                                      name: contact.displayName,
                                      phone: contact.phone || '',
                                      email: contact.email || '',
                                      notes: `Imported from Google Contacts${contact.company ? ` | Company: ${contact.company}` : ''}`
                                    }]);
                                    showStatus(
                                      language === 'SW' ? `${contact.displayName} ameongezwa kama mteja!` : `Imported ${contact.displayName} as customer!`,
                                      'success'
                                    );
                                  }}
                                  className="px-2 py-0.8 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold transition cursor-pointer"
                                >
                                  + {language === 'SW' ? 'Mteja' : 'Customer'}
                                </button>
                              )}

                              {onImportSuppliers && (
                                <button
                                  onClick={() => {
                                    onImportSuppliers([{
                                      name: contact.displayName,
                                      companyName: contact.company || contact.displayName,
                                      phone: contact.phone || '',
                                      email: contact.email || '',
                                      address: contact.address || '',
                                      notes: 'Imported from Google Contacts'
                                    }]);
                                    showStatus(
                                      language === 'SW' ? `${contact.displayName} ameongezwa kama msambazaji!` : `Imported ${contact.displayName} as supplier!`,
                                      'success'
                                    );
                                  }}
                                  className="px-2 py-0.8 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold transition cursor-pointer"
                                >
                                  + {language === 'SW' ? 'Msambazaji' : 'Supplier'}
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                id={`edit-contact-${contact.resourceName.replace('/', '-')}`}
                                onClick={() => openEditContactForm(contact)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                title="Hariri Google Contact"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                id={`delete-contact-${contact.resourceName.replace('/', '-')}`}
                                onClick={() => setDeletingContact(contact)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="Futa Google Contact"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>{contacts.length} {language === 'SW' ? 'mawasiliano Google' : 'Google contacts loaded'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition cursor-pointer"
          >
            {language === 'SW' ? 'Funga' : 'Close'}
          </button>
        </div>
      </div>

      {/* CREATE / EDIT CONTACT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white text-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingContact 
                  ? (language === 'SW' ? 'Hariri Mawasiliano ya Google' : 'Edit Google Contact') 
                  : (language === 'SW' ? 'Ongeza Mawasiliano Mapya Google' : 'Add New Google Contact')}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'SW' ? 'Jina la Kwanza*' : 'Given Name*'}
                  </label>
                  <input
                    id="contact-form-given-name"
                    type="text"
                    required
                    value={formGivenName}
                    onChange={(e) => setFormGivenName(e.target.value)}
                    placeholder="e.g. John"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'SW' ? 'Jina la Ukoo' : 'Family Name'}
                  </label>
                  <input
                    id="contact-form-family-name"
                    type="text"
                    value={formFamilyName}
                    onChange={(e) => setFormFamilyName(e.target.value)}
                    placeholder="e.g. Mwangi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'SW' ? 'Namba ya Simu' : 'Phone Number'}
                </label>
                <input
                  id="contact-form-phone"
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 0712345678"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'SW' ? 'Barua Pepe (Email)' : 'Email Address'}
                </label>
                <input
                  id="contact-form-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. customer@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'SW' ? 'Kampuni / Shirika' : 'Company / Organization'}
                </label>
                <input
                  id="contact-form-company"
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="e.g. Acme Supplies Ltd"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'SW' ? 'Anwani ya Eneo (Address)' : 'Street Address'}
                </label>
                <input
                  id="contact-form-address"
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Kariakoo, Dar es Salaam"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'SW' ? 'Maelezo ya Ziada (Notes)' : 'Notes'}
                </label>
                <textarea
                  id="contact-form-notes"
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Muuzaji wa vinywaji vya jumla"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-medium resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  {language === 'SW' ? 'Ghairi' : 'Cancel'}
                </button>
                <button
                  id="contact-form-submit-btn"
                  type="submit"
                  disabled={isSavingContact}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSavingContact ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{editingContact ? (language === 'SW' ? 'Hifadhi Mabadiliko' : 'Update Contact') : (language === 'SW' ? 'Hifadhi Google' : 'Save to Google')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPLICIT CONFIRMATION DIALOG FOR CONTACT DELETION (Destructive Operation Requirement) */}
      {deletingContact && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white text-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-5 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-slate-900">
                {language === 'SW' ? 'Futa Mawasiliano ya Google?' : 'Delete Google Contact?'}
              </h4>
              <p className="text-xs text-slate-500">
                {language === 'SW' 
                  ? `Je, una uhakika unataka kufuta mawasiliano ya "${deletingContact.displayName}" kabisa kutoka kwenye Google Contacts yako? Kitendo hiki hakiwezi kubatilishwa.`
                  : `Are you sure you want to permanently delete "${deletingContact.displayName}" from your Google Contacts? This action cannot be undone.`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                id="cancel-delete-contact-btn"
                type="button"
                onClick={() => setDeletingContact(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {language === 'SW' ? 'Ghairi' : 'Cancel'}
              </button>
              <button
                id="confirm-delete-contact-btn"
                type="button"
                onClick={handleDeleteContact}
                disabled={isDeleting}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
              >
                {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{language === 'SW' ? 'Ndio, Futa' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
