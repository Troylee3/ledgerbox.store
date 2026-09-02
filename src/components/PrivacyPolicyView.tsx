import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Mail, 
  ArrowLeft,
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  Globe, 
  KeyRound, 
  FileText,
  UserCheck,
  ShieldCheck,
  Building,
  Server,
  Trash2,
  HelpCircle,
  Clock,
  EyeOff,
  Database,
  Smartphone,
  AlertTriangle,
  BadgeAlert,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { useLanguage } from '../lib/translations';

interface PrivacyPolicyViewProps {
  onClose?: () => void;
}

export default function PrivacyPolicyView({ onClose }: PrivacyPolicyViewProps) {
  const { language } = useLanguage();
  const [activeLang, setActiveLang] = useState<'EN' | 'SW'>(language === 'SW' ? 'SW' : 'EN');
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('google-oauth');

  const isSw = activeLang === 'SW';

  const handlePrint = () => {
    window.print();
  };

  const rawPolicyEn = `# Privacy Policy for Ledgerbox POS

**Last Updated:** September 2, 2026  
**Effective Date:** September 2, 2026  
**Website:** https://ledgerbox.store  
**Contact Email:** info@ledgerbox.store  
**Application Name:** Ledgerbox POS & Store Management

---

## 1. Introduction & Overview
At Ledgerbox (accessible from https://ledgerbox.store), one of our main priorities is the privacy of our users and visitors. This Privacy Policy document explains what types of information are collected and recorded by Ledgerbox and how we securely handle, use, and protect that data.

Ledgerbox is a Point of Sale (POS), inventory management, invoicing, and retail ledger platform engineered to streamline business operations for store owners and cashiers.

By accessing or using Ledgerbox, you agree to the collection and use of information in accordance with this Privacy Policy.

---

## 2. Information We Collect
We collect information to provide, secure, and improve our services. The categories of information we collect include:

### A. Information from Google OAuth ("Sign in with Google")
When you register or log in to Ledgerbox using Google OAuth 2.0, we request and access your Google profile data under the authorized scopes:
- **Primary Google Email Address** (\`userinfo.email\`): Used to uniquely identify your account, enable secure authentication, and send vital account and billing notices.
- **Full Name and Profile Picture** (\`userinfo.profile\`): Used to personalize your dashboard, display cashier names on receipts, and improve user experience.
- **Google OpenID / Unique Identifier** (\`openid\`): A unique cryptographic token confirming your verified Google identity without exposing your Google password.

### B. Business & POS Store Data
To enable store management features, we store user-provided operational data:
- Store details (Business name, location, phone number, currency settings).
- Inventory catalog (Product titles, buying prices, selling prices, stock quantities, barcodes).
- Sales & Transaction records (Receipts, items purchased, totals, payment methods, timestamps).
- Customer & Debtor records (Customer name, contact phone number, balance due, repayment history entered by store operator).
- Expense records (Expense category, amount, description, timestamp).

### C. Technical, Device & Offline Storage Data
- Browser type, operating system, and device screen dimensions.
- Offline cached transaction data via IndexedDB / LocalStorage to support offline sales when internet connectivity is intermittent.
- Error logs and diagnostic telemetry used strictly for troubleshooting and performance optimization.

---

## 3. How We Use Your Information (Purposes of Processing)
We process your personal and business information strictly for legitimate commercial and functional purposes:
1. **Account Creation & Authentication:** Authenticate store owners and cashiers securely.
2. **Core POS Functionality:** Process sales, generate printable receipts, compute profits, update inventory levels, and calculate sales tax.
3. **Data Synchronization & Backup:** Safely synchronize your store ledger across multiple devices and store branches.
4. **Customer Communication & Support:** Provide technical assistance and respond to support inquiries.
5. **System Notifications:** Deliver critical security alerts, subscription updates, and system upgrade notifications.
6. **Security & Fraud Prevention:** Protect against unauthorized access, malicious attacks, and data breaches.

---

## 4. Google API Services User Data Policy Compliance & Limited Use Disclosure
**MANDATORY GOOGLE COMPLIANCE STATEMENT:**

> **"Ledgerbox's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements."**

In strict adherence to Google's Limited Use Requirements:
1. **No Selling of User Data:** We DO NOT sell, trade, license, or rent Google user data, customer records, or store data to any third parties, advertisers, or data brokers.
2. **No Advertising Usage:** We DO NOT use Google user data to serve advertisements, targeted campaigns, retargeting ads, or user profiling.
3. **No Secondary Processing:** Information obtained via Google APIs is used strictly to provide user-facing POS features.
4. **Human Access Restrictions:** No human employees or contractors are permitted to read your personal Google data unless:
   - You have provided explicit affirmative consent for technical troubleshooting.
   - It is strictly necessary for security purposes (e.g., investigating a security incident or abuse).
   - It is required by applicable law or governmental authority.
   - The data has been fully anonymized and aggregated for high-level system metrics.

---

## 5. Third-Party Service Providers & Cloud Infrastructure
We share data only with trusted infrastructure service providers who are contractually bound to maintain strict confidentiality and security:
- **Google Cloud Platform (GCP) & Firebase:** Hosted cloud database (Firestore), authentication servers, and CDN hosting operating under enterprise-grade SOC 2, ISO 27001, and GDPR compliance.
- **SMS & Email Delivery Gateways:** Transmitting transactional OTP verification codes and invoice links only when triggered by the store operator.

We ensure that all service providers adhere to data protection standards at least as stringent as those outlined in this policy.

---

## 6. Data Protection, Security & Encryption
We enforce defense-in-depth security measures to protect your information:
- **Encryption in Transit:** All communications between your browser/device and our servers are encrypted using modern Transport Layer Security (TLS 1.3 / HTTPS).
- **Encryption at Rest:** All database records, user profiles, and transaction logs are stored with AES-256 bit encryption at rest on Google Cloud infrastructure.
- **Zero-Knowledge Password Architecture:** We never see or store your Google password. Google handles password authentication directly via OAuth 2.0. Internal cashier PINs are encrypted and salted.
- **Role-Based Access Control (RBAC):** Access to store data is restricted strictly to authorized store owners and designated cashier accounts.

---

## 7. Data Retention & Account Deletion (Right to Be Forgotten)
We retain your data only for as long as your account remains active or as required to fulfill legal, tax, and accounting obligations:
- **Self-Service Data Purge:** Store owners can reset or clear store inventory, sales history, and customer debts anytime from the Settings menu.
- **Account Deletion Requests:** You can request the permanent deletion of your account, Google profile data, and all associated store databases at any time by emailing **info@ledgerbox.store** with the subject "Data Deletion Request". We process and confirm all deletion requests within 48 to 72 hours.
- **Revoking Google Permissions:** You can immediately revoke Ledgerbox's access to your Google account at any time via your Google Security Settings:  
  👉 https://myaccount.google.com/permissions

---

## 8. Cookies, Local Storage & Offline PWA Caching
Ledgerbox uses browser storage technologies (such as LocalStorage, SessionStorage, and IndexedDB):
- **Essential Operational Storage:** Keeps you logged in, remembers your selected language and active store branch, and temporarily holds offline sales queue data until internet connectivity is restored.
- **No Third-Party Tracking Cookies:** We do not use third-party tracking cookies or advertising tracking pixels.

---

## 9. Your Privacy Rights (GDPR, CCPA & Global Standards)
Regardless of your location, Ledgerbox provides you with full control over your personal data:
- **Right to Access:** Obtain confirmation of whether your data is being processed and receive a copy of your records.
- **Right to Rectification:** Update or correct inaccurate store or profile information directly in the app.
- **Right to Erasure:** Request total erasure of your personal data.
- **Right to Data Portability:** Export your inventory, transaction reports, and debtor lists to CSV and PDF format anytime.
- **Right to Withdraw Consent:** Revoke your authorization for data processing at any time.

To exercise any of these rights, contact us at **info@ledgerbox.store**.

---

## 10. Children's Privacy
Ledgerbox is a commercial business utility designed exclusively for business operators, entrepreneurs, and retail managers. We do not knowingly collect personal data from children under the age of 13 (or under 16 in certain jurisdictions). If you believe a child has provided us with personal information, please contact us immediately, and we will take prompt steps to remove the data.

---

## 11. International Data Transfers
Your information may be transferred to and maintained on cloud servers located in secure Google Cloud data center regions. By using the service, you consent to this transfer, provided appropriate data security safeguards are in place.

---

## 12. Changes to this Privacy Policy
We may update our Privacy Policy periodically to reflect technological updates, legal compliance, or changes in our operational features. Any modifications will be posted on this page with an updated "Last Updated" date. We encourage you to review this Privacy Policy periodically.

---

## 13. Contact Us & Data Protection Officer
If you have questions, feedback, or concerns regarding this Privacy Policy or your data privacy, please contact us:

- **Entity Name:** Ledgerbox POS
- **Official Website:** https://ledgerbox.store
- **Privacy Policy URL:** https://ledgerbox.store/?privacy=true
- **Direct Privacy Email:** info@ledgerbox.store
- **Location:** Tanzania / East Africa
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawPolicyEn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const sections = [
    { id: 'intro', titleEn: '1. Introduction & Overview', titleSw: '1. Utangulizi & Muhtasari' },
    { id: 'google-oauth', titleEn: '2. Information We Collect (Google OAuth)', titleSw: '2. Taarifa Tunazokusanya (Google OAuth)' },
    { id: 'usage', titleEn: '3. How We Use Information', titleSw: '3. Jinsi Tunavyotumia Taarifa' },
    { id: 'limited-use', titleEn: '4. Google Limited Use Disclosure', titleSw: '4. Ahadi ya Google ya Limited Use' },
    { id: 'third-party', titleEn: '5. Third-Party Infrastructure', titleSw: '5. Mifumo ya Seva & Watoa Huduma' },
    { id: 'security', titleEn: '6. Security & Encryption', titleSw: '6. Ulinzi na Usimbaji Fiche' },
    { id: 'deletion', titleEn: '7. Data Retention & Deletion', titleSw: '7. Kuhifadhi & Kufuta Data' },
    { id: 'cookies', titleEn: '8. Local Storage & Offline PWA', titleSw: '8. Uhifadhi wa Ndani & PWA' },
    { id: 'rights', titleEn: '9. Your Privacy Rights', titleSw: '9. Haki Zako za Kisheria' },
    { id: 'children', titleEn: '10. Children\'s Privacy', titleSw: '10. Faragha ya Watoto' },
    { id: 'changes', titleEn: '11. Policy Updates', titleSw: '11. Mabadiliko ya Sera' },
    { id: 'contact', titleEn: '12. Contact Information', titleSw: '12. Mawasiliano Rasmi' },
  ];

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div id="privacy-policy-view" className="min-h-full bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* TOP HEADER / ACTION BAR */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg print:hidden">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs"
              title={isSw ? "Rudi nyuma" : "Go Back"}
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">{isSw ? "Rudi Nyuma" : "Back to App"}</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-500 p-0.5 flex items-center justify-center shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck size={18} className="text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-tight flex items-center gap-2">
                <span>{isSw ? "Sera ya Faragha ya Ledgerbox POS" : "Ledgerbox POS Privacy Policy"}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  Google Verified
                </span>
              </h1>
              <p className="text-[10.5px] text-slate-400 font-medium flex items-center gap-1.5">
                <Globe size={11} className="text-indigo-400" />
                <span>https://ledgerbox.store</span>
                <span className="text-slate-600">•</span>
                <Mail size={11} className="text-indigo-400" />
                <span>info@ledgerbox.store</span>
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS (Language Switcher, Copy, Print) */}
        <div className="flex items-center gap-2.5">
          {/* Language Toggle */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveLang('EN')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                activeLang === 'EN' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English (Official)
            </button>
            <button
              onClick={() => setActiveLang('SW')}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                activeLang === 'SW' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kiswahili
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title={isSw ? "Nakili Maandishi Yote" : "Copy Complete Policy Markdown"}
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-300" />}
            <span className="hidden sm:inline">{copied ? (isSw ? "Imenakiliwa!" : "Copied!") : (isSw ? "Nakili Yote" : "Copy Text")}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            title={isSw ? "Chapa au Pakua kama PDF" : "Print or Save as PDF"}
          >
            <Printer size={14} />
            <span className="hidden md:inline">{isSw ? "Chapa / PDF" : "Print / PDF"}</span>
          </button>
        </div>
      </header>

      {/* QUICK TABLE OF CONTENTS / SCROLL PILLS (STICKY SUBHEADER) */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-2 overflow-x-auto no-scrollbar print:hidden">
        <div className="max-w-5xl mx-auto flex items-center gap-1.5 min-w-max text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <BookOpen size={12} className="text-indigo-400" />
            {isSw ? "Sehemu:" : "Sections:"}
          </span>
          {sections.map(sec => (
            <button
              key={sec.id}
              onClick={() => scrollTo(sec.id)}
              className={`px-2.5 py-1 rounded-lg transition text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                activeSection === sec.id 
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' 
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {isSw ? sec.titleSw : sec.titleEn}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN DOCUMENT CONTAINER */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-10 space-y-8">
        
        {/* DOCUMENT CARD */}
        <article className="bg-slate-950 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-2xl space-y-10 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
          
          {/* HEADER AREA */}
          <div className="border-b border-slate-800/80 pb-6 space-y-4 print:border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold print:border-gray-300 print:text-gray-800">
                <ShieldCheck size={14} />
                <span>{isSw ? "Hati Rasmi ya Kisheria ya Faragha" : "Official Legal Privacy Policy"}</span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                <span>Version 2026.09.02</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight print:text-black">
              {isSw ? "Sera ya Faragha ya Ledgerbox POS" : "Privacy Policy for Ledgerbox POS"}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 print:bg-gray-50 print:border-gray-300">
                <span className="text-slate-400 block mb-0.5">{isSw ? "Tarehe ya Marekebisho:" : "Last Updated:"}</span>
                <strong className="text-emerald-400 font-mono text-sm print:text-black">September 2, 2026</strong>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 print:bg-gray-50 print:border-gray-300">
                <span className="text-slate-400 block mb-0.5">{isSw ? "Tovuti Rasmi:" : "Official Website:"}</span>
                <a href="https://ledgerbox.store" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-mono text-sm underline inline-flex items-center gap-1 print:text-black">
                  https://ledgerbox.store
                  <ExternalLink size={12} className="print:hidden" />
                </a>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 print:bg-gray-50 print:border-gray-300">
                <span className="text-slate-400 block mb-0.5">{isSw ? "Barua Pepe ya Faragha:" : "Privacy Contact:"}</span>
                <a href="mailto:info@ledgerbox.store" className="text-indigo-400 hover:text-indigo-300 font-mono text-sm underline print:text-black">
                  info@ledgerbox.store
                </a>
              </div>
            </div>
          </div>

          {/* HIGHLIGHTED GOOGLE VERIFICATION & LIMITED USE HERO BOX */}
          <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-emerald-950/40 border-2 border-indigo-500/50 rounded-2xl space-y-3 print:bg-gray-50 print:border-gray-400">
            <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs uppercase tracking-wider print:text-black">
              <Shield size={16} className="text-indigo-400" />
              <span>{isSw ? "Tamko la Kisheria la Google API Limited Use" : "Google API Services User Data Policy Compliance"}</span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed italic print:text-gray-900">
              "{isSw 
                ? "Matumizi na uhamishaji wa Ledgerbox wa taarifa zilizopokelewa kutoka kwa Google APIs kwenda kwa programu nyingine yoyote utazingatia Sera ya Data ya Mtumiaji ya Google API Services, ikiwa ni pamoja na mahitaji ya Limited Use."
                : "Ledgerbox's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements."}"
            </p>
            <div className="pt-1 text-xs text-slate-400 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 size={13} />
                {isSw ? "Hakuna uuzaji wa data ya mtumiaji" : "No Sale of User Data"}
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 size={13} />
                {isSw ? "Hakuna matangazo yanayotumia data ya Google" : "No Ads Targeting"}
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 size={13} />
                {isSw ? "Usimbaji fiche wa TLS 1.3 & AES-256" : "TLS 1.3 & AES-256 Encryption"}
              </span>
            </div>
          </div>

          {/* SECTION 1: INTRODUCTION & OVERVIEW */}
          <section id="intro" className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-500/30 shrink-0 print:border-gray-400 print:text-black">
                1
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "1. Utangulizi & Muhtasari wa Mfumo" : "1. Introduction & Application Overview"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-3 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw ? (
                  <>
                    Katika <strong>Ledgerbox POS</strong> (inayopatikana kupitia <a href="https://ledgerbox.store" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-mono">https://ledgerbox.store</a>), moja ya vipaumbele vyetu vikuu ni ulinzi na faragha ya wamiliki wa maduka, wauzaji, na wateja wanaotumia mfumo wetu. Hati hii inaeleza aina ya taarifa tunazokusanya, jinsi tunavyozitumia, na mifumo madhubuti ya kiusalama inayolinda taarifa hizo.
                  </>
                ) : (
                  <>
                    At <strong>Ledgerbox POS</strong> (accessible from <a href="https://ledgerbox.store" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-mono">https://ledgerbox.store</a>), the privacy and security of our store owners, cashiers, and retail operators is our highest priority. This Privacy Policy outlines the types of information collected and recorded by Ledgerbox and how we strictly safeguard and process that data.
                  </>
                )}
              </p>
              <p>
                {isSw ? (
                  <>
                    Ledgerbox ni mfumo wa kisasa wa kusimamia mauzo (Point of Sale - POS), stoo na bidhaa (Inventory Catalog), risiti na ankara (Invoicing), madeni ya wateja (Debtor Ledger), na ripoti za biashara uliotengenezwa kurahisisha uendeshaji wa biashara ndogo, za kati, na kubwa.
                  </>
                ) : (
                  <>
                    Ledgerbox is a comprehensive retail Point of Sale (POS), inventory management, invoicing, debtor tracking, and business analytics solution engineered to streamline store management for retail businesses of all sizes.
                  </>
                )}
              </p>
            </div>
          </section>

          {/* SECTION 2: INFORMATION WE COLLECT */}
          <section id="google-oauth" className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-sm border border-blue-500/30 shrink-0 print:border-gray-400 print:text-black">
                2
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "2. Taarifa Tunazokusanya (Google OAuth & Data za Biashara)" : "2. Information We Collect (Google OAuth & Store Data)"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-4 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Ili kutoa huduma salama ya POS na kusawazisha data za duka lako, tunakusanya aina zifuatazo za taarifa:"
                  : "To deliver reliable POS operations and securely synchronize your store data across devices, we collect the following categories of information:"}
              </p>

              {/* Sub-item A: Google OAuth */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                  <UserCheck size={16} className="text-indigo-400" />
                  <span>{isSw ? "A. Taarifa za Google OAuth (Sign in with Google)" : "A. Google OAuth 2.0 User Profile Data"}</span>
                </div>
                <p className="text-xs text-slate-400">
                  {isSw 
                    ? "Unapoingia kwa kutumia Google OAuth (Scopes: `userinfo.email`, `userinfo.profile`, `openid`), tunapata taarifa zifuatazo pekee:"
                    : "When you authenticate via Google OAuth (Scopes: `userinfo.email`, `userinfo.profile`, `openid`), we access solely:"}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                    <strong className="text-slate-100 text-xs flex items-center gap-1.5 print:text-black">
                      <Mail size={14} className="text-indigo-400" />
                      {isSw ? "Barua Pepe Kuu ya Google (Primary Email)" : "Primary Google Email Address"}
                    </strong>
                    <p className="text-[11px] text-slate-400 print:text-gray-600">
                      {isSw ? "Inatumika kama kitambulisho kikuu cha akaunti na kutuma arifa za usalama." : "Serves as your unique account ID and destination for security notices."}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                    <strong className="text-slate-100 text-xs flex items-center gap-1.5 print:text-black">
                      <UserCheck size={14} className="text-emerald-400" />
                      {isSw ? "Jina Kamili & Picha (Name & Profile Picture)" : "Full Name & Profile Picture"}
                    </strong>
                    <p className="text-[11px] text-slate-400 print:text-gray-600">
                      {isSw ? "Inatumika kubinafsisha dashibodi na kuweka jina la mhudumu kwenye risiti." : "Used to personalize your dashboard and identify the active cashier."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-item B: Business Data */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <Database size={16} className="text-emerald-400" />
                  <span>{isSw ? "B. Taarifa za Uendeshaji wa Duka (Store Operations Data)" : "B. Store Operational Data"}</span>
                </div>
                <ul className="space-y-2 text-xs">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>{isSw ? "Taarifa za Duka:" : "Store Profile:"}</strong> {isSw ? "Jina la biashara, eneo, namba ya simu, na sarafu (TZS, USD, n.k.)." : "Business name, location, phone contact, and currency preference."}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>{isSw ? "Bidhaa & Stoo:" : "Product Catalog:"}</strong> {isSw ? "Majina ya bidhaa, bei ya kununulia, bei ya kuuzia, kiasi kilichopo, na barcode." : "Item names, buying/selling prices, stock levels, and barcodes."}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>{isSw ? "Miamala ya Mauzo & Risiti:" : "Sales & Invoicing:"}</strong> {isSw ? "Kiasi cha mauzo, njia ya malipo (Cash/Mobile/Credit), muda, na punguzo." : "Transaction amounts, payment method (Cash/Mobile/Credit), and timestamps."}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>{isSw ? "Daftari la Madeni & Wateja:" : "Debtor Ledger:"}</strong> {isSw ? "Majina ya wateja, namba zao za simu, na kiasi cha deni wanachodaiwa." : "Customer names, contact numbers, outstanding balances, and repayment history."}</span>
                  </li>
                </ul>
              </div>

              {/* Sub-item C: Device & Offline Cache */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
                  <Smartphone size={16} className="text-purple-400" />
                  <span>{isSw ? "C. Data za Kiufundi & Uhifadhi wa Nje ya Mtandao (Offline Cache)" : "C. Technical & Offline PWA Storage"}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isSw 
                    ? "Tunatumia IndexedDB na LocalStorage ya kifaa chako kuhifadhi nakala ya stoo na miamala ili uweze kuendelea kuuza hata internet inapokatika." 
                    : "We leverage browser LocalStorage and IndexedDB to cache store data locally on your device, enabling uninterrupted offline sales during network outages."}
                </p>
              </div>

            </div>
          </section>

          {/* SECTION 3: HOW WE USE INFORMATION */}
          <section id="usage" className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-black text-sm border border-purple-500/30 shrink-0 print:border-gray-400 print:text-black">
                3
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "3. Jinsi Tunavyotumia Taarifa Zako (Madhumuni ya Uchakataji)" : "3. How We Use Your Information (Purposes of Processing)"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-3 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Tunachakata taarifa zako kwa madhumuni yafuatayo pekee:"
                  : "We process your information strictly for the following legitimate purposes:"}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {[
                  {
                    titleEn: "Authentication & Security",
                    titleSw: "Utambulisho & Kuingia Salama",
                    descEn: "To authenticate store owners and cashiers and protect your account from unauthorized access.",
                    descSw: "Kuthibitisha wamiliki na wauzaji na kuzuia watu wasioidhinishwa kufungua stoo yako."
                  },
                  {
                    titleEn: "Core POS & Receipt Generation",
                    titleSw: "Uendeshaji wa Mauzo & Risiti",
                    descEn: "To record sales, calculate accurate profit margins, print receipts, and deduct inventory.",
                    descSw: "Kurekodi mauzo, kuhesabu faida halisi, kutoa risiti, na kupunguza stoo kiotomatiki."
                  },
                  {
                    titleEn: "Multi-Device Cloud Synchronization",
                    titleSw: "Kusawazisha Data Kwenye Vifaa Vingi",
                    descEn: "To securely back up and sync your ledger data across your phone, tablet, and PC in real time.",
                    descSw: "Kuhifadhi na kusawazisha taarifa za duka lako kwenye simu, tablet, na kompyuta kwa wakati mmoja."
                  },
                  {
                    titleEn: "System Notifications & Support",
                    titleSw: "Arifa Muhimu & Msaada wa Kiufundi",
                    descEn: "To send essential subscription alerts, security notices, and respond to technical support requests.",
                    descSw: "Kutuma arifa za mfumo, uthibitisho wa malipo, na kutoa msaada wa huduma kwa wateja."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1 print:bg-gray-50 print:border-gray-300">
                    <strong className="text-slate-100 text-xs block font-bold print:text-black">
                      {isSw ? item.titleSw : item.titleEn}
                    </strong>
                    <p className="text-xs text-slate-400 print:text-gray-600">
                      {isSw ? item.descSw : item.descEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 4: GOOGLE LIMITED USE DISCLOSURE */}
          <section id="limited-use" className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/30 shrink-0 print:border-gray-400 print:text-black">
                4
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "4. Ahadi ya Google ya Limited Use & Kinga Dhidi ya Uuzaji wa Data" : "4. Google Limited Use Compliance & Anti-Monetization Guarantees"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-4 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2.5">
                <p className="font-semibold text-slate-100 print:text-black">
                  {isSw 
                    ? "Ledgerbox inafuata kikamilifu mwongozo wa Google API Services User Data Policy, hasa mahitaji ya Limited Use:"
                    : "Ledgerbox strictly complies with the Google API Services User Data Policy, specifically the Limited Use requirements:"}
                </p>
                <ul className="space-y-2 text-xs">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>{isSw ? "HAKUNA KUUZA DATA:" : "NO SELLING OF DATA:"}</strong>{' '}
                      {isSw ? "Hatuuzi, hatukodishi, wala hatushiriki data zako za Google au za duka kwa kampuni za matangazo au madalali wa data." : "We DO NOT sell, trade, license, or rent Google user data or store information to data brokers or third parties."}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>{isSw ? "HAKUNA MATANGAZO YA KULENGA:" : "NO TARGETED ADVERTISING:"}</strong>{' '}
                      {isSw ? "Data za Google hazitumiki kamwe kutengeneza matangazo au kufuatilia tabia ya mtumiaji (retargeting)." : "Google user data is never used to serve personalized, targeted, or retargeted advertisements."}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>{isSw ? "ZUIA LA BINADAMU KUSOMA DATA:" : "RESTRICTED HUMAN ACCESS:"}</strong>{' '}
                      {isSw ? "Hakuna mfanyakazi anayeruhusiwa kusoma data zako za Google isipokuwa ukiomba msaada wa kiufundi au ikitakiwa kisheria." : "No humans are permitted to read your personal Google data unless explicitly authorized by you for support or required by law."}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 5: THIRD-PARTY INFRASTRUCTURE */}
          <section id="third-party" className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center font-black text-sm border border-teal-500/30 shrink-0 print:border-gray-400 print:text-black">
                5
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "5. Mifumo ya Seva & Watoa Huduma wa Nje (Cloud Infrastructure)" : "5. Third-Party Service Providers & Cloud Infrastructure"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-3 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Tunatumia miundombinu ya kimataifa ya kiwango cha juu cha usalama kuendesha mfumo:"
                  : "We partner exclusively with world-class, enterprise-grade cloud providers to host and secure your data:"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1 print:bg-gray-50 print:border-gray-300">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs print:text-black">
                    <Server size={14} />
                    <span>Google Cloud Platform & Firebase</span>
                  </div>
                  <p className="text-xs text-slate-400 print:text-gray-600">
                    {isSw ? "Database salama (Firestore) yenye usimbaji fiche na seva za uthibitisho wa Google." : "Encrypted Firestore database, auth token validation, and high-availability hosting."}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1 print:bg-gray-50 print:border-gray-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs print:text-black">
                    <Lock size={14} />
                    <span>ISO 27001 & SOC 2 Compliance</span>
                  </div>
                  <p className="text-xs text-slate-400 print:text-gray-600">
                    {isSw ? "Seva zote zinakidhi viwango vikali vya kimataifa vya ulinzi wa data." : "All underlying infrastructure meets rigorous international data protection standards."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 6: SECURITY & ENCRYPTION */}
          <section id="security" className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center font-black text-sm border border-amber-500/30 shrink-0 print:border-gray-400 print:text-black">
                6
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "6. Ulinzi na Usimbaji Fiche wa Data (Security & Encryption)" : "6. Data Security & Encryption Standards"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-3 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Tunazingatia mbinu za kisasa za ulinzi wa kidijitali kulinda taarifa zako:"
                  : "We enforce multi-layered defense-in-depth protocols to safeguard your business assets:"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <strong className="text-indigo-400 text-xs block font-mono">TLS 1.3 / HTTPS</strong>
                  <span className="text-[11px] text-slate-400">
                    {isSw ? "Data zote zinazotumwa mtandaoni zinalindwa kwa usimbaji fiche." : "End-to-end encryption for all data in transit across networks."}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <strong className="text-emerald-400 text-xs block font-mono">AES-256 Bit Encryption</strong>
                  <span className="text-[11px] text-slate-400">
                    {isSw ? "Data zilizohifadhiwa kwenye database zinalindwa kwa kiwango cha kibenki." : "Military-grade encryption for all database records at rest."}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <strong className="text-purple-400 text-xs block font-mono">Zero-Knowledge Passwords</strong>
                  <span className="text-[11px] text-slate-400">
                    {isSw ? "Nenosiri la Google halihifadhiwi kamwe; PIN za wauzaji zinasimbwa kwa salt." : "Google passwords are never stored; cashier PINs are salted and hashed."}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 7: DATA RETENTION & DELETION */}
          <section id="deletion" className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center font-black text-sm border border-rose-500/30 shrink-0 print:border-gray-400 print:text-black">
                7
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "7. Kuhifadhi na Kufuta Data (Right to Be Forgotten & Account Deletion)" : "7. Data Retention & Account Deletion (Right to be Forgotten)"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-4 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Una mamlaka kamili juu ya data zako za biashara na akaunti yako ya Google:"
                  : "You maintain total ownership and autonomy over your business and personal records:"}
              </p>

              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-start gap-3">
                  <Trash2 size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="text-slate-100 text-xs block print:text-black">
                      {isSw ? "Jinsi ya Kufuta Akaunti na Data Zote (How to Request Account & Data Deletion):" : "How to Request Permanent Account & Data Deletion:"}
                    </strong>
                    <p className="text-xs text-slate-400 leading-relaxed print:text-gray-600">
                      {isSw ? (
                        <>
                          Unaweza kufuta taarifa za duka moja kwa moja kupitia menyu ya <strong>Mipangilio (Settings)</strong>, au kutuma barua pepe ya kufutiwa data zote kabisa kwenda <a href="mailto:info@ledgerbox.store" className="text-indigo-400 underline font-mono">info@ledgerbox.store</a> yenye mada "Data Deletion Request". Maombi yote yanatekelezwa ndani ya masaa 48 hadi 72.
                        </>
                      ) : (
                        <>
                          You can purge store data directly in-app via the <strong>Settings</strong> menu, or request complete account and database removal by emailing <a href="mailto:info@ledgerbox.store" className="text-indigo-400 underline font-mono">info@ledgerbox.store</a> with the subject "Data Deletion Request". All requests are fulfilled within 48 to 72 hours.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 flex items-start gap-3">
                  <KeyRound size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="text-slate-100 text-xs block print:text-black">
                      {isSw ? "Kuondoa Ruhusa za Google Wakati Wowote:" : "Revoking Google Account Access:"}
                    </strong>
                    <p className="text-xs text-slate-400 leading-relaxed print:text-gray-600">
                      {isSw ? (
                        <>
                          Unaweza kuondoa ruhusa ya Ledgerbox kufikia akaunti yako ya Google wakati wowote kupitia ukurasa rasmi wa usalama wa Google:{' '}
                          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-mono inline-flex items-center gap-1">
                            https://myaccount.google.com/permissions
                            <ExternalLink size={10} />
                          </a>
                        </>
                      ) : (
                        <>
                          You can instantly revoke Ledgerbox's access to your Google account at any time via your official Google Security Settings:{' '}
                          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-mono inline-flex items-center gap-1">
                            https://myaccount.google.com/permissions
                            <ExternalLink size={10} />
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 8: LOCAL STORAGE & PWA */}
          <section id="cookies" className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/30 shrink-0 print:border-gray-400 print:text-black">
                8
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "8. Uhifadhi wa Ndani, Vidakuzi & PWA (Local Storage & Offline Caching)" : "8. Cookies, Local Storage & Offline PWA Caching"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-3 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Ledgerbox haitumii vidakuzi vya ufuatiliaji wa matangazo (third-party tracking cookies). Tunatumia teknolojia za ndani ya browser (LocalStorage na IndexedDB) kwa ajili ya kuweka kikao chako cha kuingia na kuwezesha mauzo kufanyika bila internet."
                  : "Ledgerbox does NOT use third-party advertising tracking cookies. We utilize native browser storage (LocalStorage & IndexedDB) exclusively to maintain your active authentication session and enable offline retail operations."}
              </p>
            </div>
          </section>

          {/* SECTION 9: YOUR PRIVACY RIGHTS */}
          <section id="rights" className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-500/30 shrink-0 print:border-gray-400 print:text-black">
                9
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "9. Haki Zako za Faragha (GDPR, CCPA & Viwango vya Kimataifa)" : "9. Your Privacy Rights (GDPR, CCPA & Global Standards)"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-3 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw ? "Unazo haki zifuatazo za kisheria kuhusu data zako:" : "Under applicable data protection laws, you are entitled to the following rights:"}
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {[
                  isSw ? "Haki ya Kuona Data Zako (Right to Access)" : "Right to Access Your Data",
                  isSw ? "Haki ya Kusahihisha Taarifa (Right to Rectification)" : "Right to Rectify Inaccuracies",
                  isSw ? "Haki ya Kufuta Data Zote (Right to Erasure)" : "Right to Total Erasure",
                  isSw ? "Haki ya Kupakua Data (Data Portability in Excel/PDF)" : "Right to Export Data (CSV/PDF)",
                  isSw ? "Haki ya Kujitoa Wakati Wowote (Right to Withdraw Consent)" : "Right to Withdraw Consent",
                  isSw ? "Haki ya Kuweka Vikwazo vya Uchakataji" : "Right to Restrict Processing"
                ].map((r, i) => (
                  <li key={i} className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span className="text-slate-200 font-medium">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* SECTION 10: CHILDREN'S PRIVACY */}
          <section id="children" className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center font-black text-sm border border-orange-500/30 shrink-0 print:border-gray-400 print:text-black">
                10
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "10. Faragha ya Watoto (Children's Privacy - COPPA)" : "10. Children's Privacy (COPPA Compliance)"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-3 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Ledgerbox ni mfumo wa kibiashara unaolengwa kwa wamiliki wa biashara na wauzaji. Hatukusanyi kimakusudi taarifa kutoka kwa watoto walio chini ya umri wa miaka 13 (au 16 kulingana na sheria husika)."
                  : "Ledgerbox is a commercial application intended for business operators. We do not knowingly collect or solicit personal data from children under the age of 13 (or under 16 in applicable jurisdictions)."}
              </p>
            </div>
          </section>

          {/* SECTION 11: POLICY CHANGES */}
          <section id="changes" className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-sm border border-blue-500/30 shrink-0 print:border-gray-400 print:text-black">
                11
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "11. Mabadiliko ya Sera Hii ya Faragha" : "11. Changes & Updates to This Privacy Policy"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-3 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Tunaweza kusasisha Sera hii ya Faragha mara kwa mara ili kuendana na mabadiliko ya kiteknolojia na kisheria. Mabadiliko yoyote yatawekwa wazi kwenye ukurasa huu na tarehe ya mwisho ya sasisho itabadilishwa."
                  : "We may revise this Privacy Policy periodically to reflect enhancements in technology, service features, or legal regulations. All updates will be published on this page with an updated 'Last Updated' timestamp."}
              </p>
            </div>
          </section>

          {/* SECTION 12: CONTACT US */}
          <section id="contact" className="space-y-4 pt-4 border-t border-slate-800/80 print:border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center font-black text-sm border border-teal-500/30 shrink-0 print:border-gray-400 print:text-black">
                12
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight print:text-black">
                {isSw ? "12. Mawasiliano Rasmi na Afisa wa Faragha" : "12. Contact Information & Data Protection Officer"}
              </h2>
            </div>

            <div className="pl-0 sm:pl-11 space-y-4 text-sm text-slate-300 leading-relaxed print:text-gray-800">
              <p>
                {isSw 
                  ? "Ikiwa una maswali, mapendekezo, au unahitaji usaidizi kuhusu Sera hii ya Faragha na data zako, tafadhali wasiliana nasi:"
                  : "If you have questions, feedback, or inquiries regarding this Privacy Policy or your data protection rights, please contact our team directly:"}
              </p>

              <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:bg-gray-50 print:border-gray-300">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                    <Building size={16} />
                    <span>Ledgerbox POS Engineering & Privacy Team</span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Mail size={16} className="text-emerald-400" />
                    <a href="mailto:info@ledgerbox.store" className="hover:text-indigo-300 underline font-mono text-base">
                      info@ledgerbox.store
                    </a>
                  </div>
                  <p className="text-xs text-slate-400">
                    Website: <a href="https://ledgerbox.store" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-mono">https://ledgerbox.store</a> • Location: Tanzania / East Africa
                  </p>
                </div>

                <a 
                  href="mailto:info@ledgerbox.store?subject=Privacy%20Policy%20Inquiry%20-%20Ledgerbox" 
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shrink-0 print:hidden"
                >
                  <Mail size={15} />
                  <span>{isSw ? "Tuma Barua Pepe ya Faragha" : "Email Privacy Officer"}</span>
                </a>
              </div>
            </div>
          </section>

          {/* FOOTER DETAILS */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 print:text-gray-600">
            <div>
              © 2026 <strong>Ledgerbox POS</strong> (https://ledgerbox.store). {isSw ? "Haki zote zimehifadhiwa." : "All rights reserved."}
            </div>
            <div className="font-mono">
              Compliant with Google API Services User Data Policy
            </div>
          </div>

        </article>

      </div>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500 print:hidden">
        <p>
          Ledgerbox Store & POS • <a href="https://ledgerbox.store" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">https://ledgerbox.store</a> • <a href="mailto:info@ledgerbox.store" className="text-indigo-400 hover:underline">info@ledgerbox.store</a>
        </p>
      </footer>

    </div>
  );
}
