/**
 * LedgerBox Offline AI Business Advisor Engine
 * Designed by Brayan Kako to run fully offline when internet or Gemini API is unavailable.
 */

export interface StoreSummary {
  storeName: string;
  currency: string;
  dateAnalyzed: string;
  kpis: {
    totalSales: number;
    monthlySales: number;
    todaySales: number;
    totalProfit: number;
    monthlyProfit: number;
    todayProfit: number;
    totalCapitalInvested: number;
    totalCustomerDebts: number;
    allTimeLoss: number;
    monthlyLoss: number;
    todayLoss: number;
    totalReceipts: number;
  };
  lowStockProducts: {
    name: string;
    stock: number;
    minStock: number;
    sellingPrice: number;
  }[];
  bestSellingProducts: {
    name: string;
    quantitySold: number;
    revenue: number;
  }[];
  taxEstimation: {
    annualTurnoverEstimate: number;
    annualExpensesEstimate: number;
    recommendedTaxRegime: string;
    estimatedAnnualTax: number;
  };
}

export function generateOfflineAdvice(userInput: string, summary: StoreSummary, language: 'SW' | 'EN'): string {
  const query = userInput.toLowerCase().trim();
  const isSw = language === 'SW';

  // 0. PHONE NUMBER & CONTACT CHECK
  if (
    query.includes("simu") || 
    query.includes("phone") || 
    query.includes("namba") || 
    query.includes("contact") || 
    query.includes("wasiliana") || 
    query.includes("nambari") || 
    query.includes("piga") || 
    query.includes("call") ||
    query.includes("mobile")
  ) {
    if (isSw) {
      return `📞 **NAMBA YA SIMU NA MAWASILIANO YA MSANIDI (BRAYAN KAKO):**

Namba ya simu ya mtaalamu na msanidi mkuu wa mfumo wa **LedgerBox** (**Brayan Kako**) ni:

📱 **+255 613 584 700** (au **0613584700**)

**Unaweza kuwasiliana naye kwa:**
- 📞 **Piga Simu Moja kwa Moja:** Kwa msaada wa haraka wa kiufundi, mafunzo au ushauri.
- 💬 **WhatsApp:** Kutuma ujumbe, kuomba maboresho mapya ya mfumo, au usaidizi.
- 🛍️ **LedgerBox Engine:** Mfumo wa kisasa wa POS, stoo, na utunzaji hesabu za maduka.

Je, kuna jambo lingine ungependa kukusaidia kuhusu duka lako leo?`;
    } else {
      return `📞 **DEVELOPER & SUPPORT CONTACT PHONE NUMBER (BRAYAN KAKO):**

The official contact phone number for LedgerBox developer and system architect **Brayan Kako** is:

📱 **+255 613 584 700** (or **0613584700**)

**Contact Options:**
- 📞 **Direct Call:** For technical support, onboarding, or system inquiries.
- 💬 **WhatsApp:** Message directly for feature requests, updates, or custom shop setups.
- 🛍️ **LedgerBox POS:** Designed for seamless offline bookkeeping and store management.

How else can I assist you today?`;
    }
  }

  // 1. DEVELOPER IDENTITY CHECK
  if (
    query.includes("brayan") || 
    query.includes("kako") || 
    query.includes("creator") || 
    query.includes("developer") || 
    query.includes("tengeneza") || 
    query.includes("unda") || 
    query.includes("buni") || 
    query.includes("made you") || 
    query.includes("built you") || 
    query.includes("who are you") ||
    query.includes("wewe ni nani")
  ) {
    if (isSw) {
      return `Mimi ni **LedgerBox AI Business Advisor**, akili mnemba ya duka lako! 

Mfumo huu mzima wa LedgerBox pamoja na uwezo wangu wa ushauri umetengenezwa kwa ufundi na umakini mkubwa na mtaalamu wa mifumo **Brayan Kako** (mimi brayan kako).

**Kuhusu Msanidi Programu wako:**
- **Jina:** Brayan Kako
- **Namba ya Simu:** **+255 613 584 700** (au **0613584700**)
- **Kazi yake:** Ameunda LedgerBox kuleta urahisi katika utunzaji wa hesabu, uchambuzi wa faida/hasara, usimamizi wa stoo, na utumaji wa risiti kiotomatiki kwa SMS/WhatsApp kwa wafanyabiashara.
- **Lengo langu:** Brayan Kako alinipa uwezo wa kusoma takwimu za duka na kukupa mwongozo wa kutumia mfumo huu hata ukiwa **100% offline (bila mtandao)**!

Je, ungependa nikuelekeze jinsi ya kutumia kipengele gani cha LedgerBox leo?`;
    } else {
      return `I am **LedgerBox AI Business Advisor**, your shop's smart assistant! 

The entire LedgerBox system and my diagnostic capabilities have been crafted with high-precision and passion by system developer **Brayan Kako** (mimi brayan kako).

**About Your System Developer:**
- **Name:** Brayan Kako
- **Phone Number:** **+255 613 584 700** (or **0613584700**)
- **His Mission:** He designed LedgerBox to simplify bookkeeping, profit/loss tracking, inventory management, and automated receipt delivery via SMS/WhatsApp.
- **My Capabilities:** Brayan Kako built me with the capability to explain **EVERY single system feature** and guide you even when **100% offline (with zero internet)**!

Which LedgerBox module would you like me to guide you on today?`;
    }
  }

  // 2. MASTER SYSTEM USAGE GUIDE / JINSI YA KUTUMIA MFUMO
  if (
    query.includes("kutumia") || 
    query.includes("tumia") || 
    query.includes("mwongozo") || 
    query.includes("guide") || 
    query.includes("jinsi ya") || 
    query.includes("how to use") || 
    query.includes("vipengele") || 
    query.includes("features") || 
    query.includes("mwanzo") || 
    query.includes("anzaje") || 
    query.includes("anaza") ||
    query.includes("jinsi gani")
  ) {
    if (isSw) {
      return `📖 **MWONGOZO KAMILI WA KUTUMIA MFUMO WA LEDGERBOX POS (100% OFFLINE READY)**

Karibu kwenye mfumo wa **LedgerBox POS**! Mfumo huu umegawanyika katika vipengele vikuu **7** vinavyokusaidia kuendesha duka lako kwa urahisi kabisa:

1. 🛒 **MAUZO YA KAUNTA (POS):**
   - **Tafuta au Skana Bidhaa:** Andika jina la bidhaa au tumia Kamera/Barcode Scanner kuiskania.
   - **Badilisha Idadi au Bei:** Bofya kwenye bidhaa kwenye kikapu kurekebisha idadi au kuweka punguzo.
   - **Kukopesha (Mkopo):** Chagua au msajili mteja anayekopa (inafanya kazi hata offline!), kisha chagua njia ya malipo ya **"CREDIT"**.
   - **Chapa/Tuma Risiti:** Bofya **"Kamilisha Mauzo"** kisha chapa risiti ya karatasi au utume kwa WhatsApp/SMS!

2. 📦 **STOO NA BIDHAA (INVENTORY):**
   - **Ongeza Bidhaa Mpya:** Bofya **"+ Ongeza Bidhaa"**, weka Jina, Barcode, Bei ya Kununua (Mtaji), Bei ya Kuuza, Idadi, na Kiwango cha Chini cha Stoo (Min Stock).
   - **Agiza kwa Supplier:** Bofya **"Oda ya Supplier"** kutengeneza na kutuma Oda ya Ununuzi kwa WhatsApp.

3. 👥 **WATEJA NA MADENI (CUSTOMERS):**
   - **Sajili Wateja:** Weka majina, simu na tarehe ya ahadi ya kulipa.
   - **Kurekodi Marejesho:** Bofya **"Record Payment"** unappokea pesa ya deni ili mfumo upunguze deni na kutoa risiti ya mrejesho.
   - **Kutuma Vikumbusho:** Bofya kitufe cha SMS/WhatsApp kumtumia mteja muhtasari wa deni lake.

4. 🧾 **HISTORY YA RISITI (TICKETS / LOGS):**
   - Tazama risiti zote zilizotolewa.
   - **Kughairi Mauzo (Void Sale):** Ikiwa mauzo yalifanyika kwa kosa, bofya **"Kughairi"** — mfumo utarudisha idadi ya bidhaa stoo kiotomatiki!

5. 📊 **RIPOTI NA FAIDA HALISI (REPORTS):**
   - Ona **Faida Halisi (Net Profit)** = (Bei ya Kuuza - Bei ya Mtaji).
   - Tazama chati za mauzo, bidhaa zinazoongoza (Best Sellers), na pakua/chapa Ripoti za PDF au Excel.

6. ⚙️ **MIPANGILIO (SETTINGS):**
   - Weka Jina la Duka, Simu, Anwani, Logo, na Ujumbe wa Risiti.
   - Chagua **Aina ya Risiti ya Msingi** (Kawaida / Full Thermal).
   - Ongeza Makeshia na weka Nenosiri (PIN).
   - Hifadhi Backup ya Data (\`Backup JSON\`) na Rejesha Data.

7. 📱 **KUSAKINISHA APP KWENYE SIMU/LAPTOP (OFFLINE PWA):**
   - Fungua Menu ya Browser yako (vitufe 3 majuu kulia) na uchague **"Install LedgerBox"** au **"Add to Home Screen"** ili uitumie kama App ya desktop/simu bila haja ya intaneti!

Je, unahitaji maelekezo ya kina kuhusu kipengele gani kimoja wapo?`;
    } else {
      return `📖 **COMPLETE LEDGERBOX POS SYSTEM USER GUIDE (100% OFFLINE READY)**

Welcome to **LedgerBox POS**! The system is structured into **7 main modules** designed to run your retail business effortlessly:

1. 🛒 **POINT OF SALE (POS):**
   - **Search or Scan Items:** Search products by name or use the Camera/Barcode scanner.
   - **Adjust Qty or Prices:** Tap cart items to update quantities or apply discount.
   - **Credit / Debt Sales:** Select or quick-register a borrowing customer (works 100% offline!), then select **"CREDIT"** payment method.
   - **Print/Send Receipts:** Click **"Checkout"** to print standard/thermal paper receipts or dispatch via WhatsApp/SMS!

2. 📦 **INVENTORY & STOCK:**
   - **Add New Products:** Click **"+ Add Product"**, set Name, Barcode, Cost Price, Selling Price, Stock Qty, and Safety Limit.
   - **Supplier Orders:** Click **"Supplier Order"** to draft and share Purchase Orders via WhatsApp.

3. 👥 **CUSTOMERS & DEBT TRACKER:**
   - **Register Customers:** Manage names, phone numbers, and repayment due dates.
   - **Record Payments:** Click **"Record Payment"** when a debt is settled to deduct the balance and print a repayment voucher.
   - **Send Reminders:** Click SMS/WhatsApp buttons to send friendly debt balance statements.

4. 🧾 **RECEIPT LOGS & VOID SALES (TICKETS):**
   - Review past transaction logs.
   - **Void Sales:** If an error occurred, click **"Void"** to automatically restock products back to inventory!

5. 📊 **REPORTS & NET PROFIT:**
   - Track **Net Profit** = (Selling Price - Buying Cost Price).
   - Analyze daily/monthly performance trends, best sellers, and export PDF/Excel reports.

6. ⚙️ **SETTINGS & DATA BACKUP:**
   - Customize Store Name, Phone, Address, Logo, and Receipt Greeting.
   - Select **Default Receipt Format** (Simple vs Detailed Thermal).
   - Manage Cashier PINs and roles.
   - Download offline data backups (\`Backup JSON\`) and restore data anytime.

7. 📱 **OFFLINE APP INSTALLATION (PWA):**
   - Open your browser menu (3 dots top right) and tap **"Install LedgerBox"** or **"Add to Home Screen"** to run as a standalone desktop/mobile app without internet!

Which specific module would you like more detailed instructions on?`;
    }
  }

  // 3. POS & SALES & PRINTING RECEIPTS SPECIFIC INSTRUCTIONS
  if (
    query.includes("mauzo") || 
    query.includes("sale") || 
    query.includes("pos") || 
    query.includes("risiti") || 
    query.includes("receipt") || 
    query.includes("chapa") || 
    query.includes("print") || 
    query.includes("kutoa risiti") ||
    query.includes("kawaida")
  ) {
    if (isSw) {
      return `🛒 **JINSI YA KUFANYA MAUZO NA KUTOA RISITI (POS MANUAL)**

Ili kufanya mauzo kwenye LedgerBox POS, fuata hatua hizi rahisi:

1. **Ongeza Bidhaa Kwenye Kikapu:**
   - Andika jina la bidhaa kwenye kisanduku cha utafutaji au tumia skana ya Barcode.
   - Bofya bidhaa ili uiweke kwenye kikapu cha mauzo (Cart).

2. **Badilisha Idadi au Bei:**
   - Kwenye kikapu kulia, bofya **"+"** au **"-"** kuongeza/kupunguza idadi.
   - Unaweza pia kuweka punguzo la jumla la fedha (Discount).

3. **Chagua Mteja (Ikiwa ni Mauzo ya Mkopo):**
   - Kwenye menyu ya kuteua mteja, chagua mteja aliyesajiliwa au bofya **"+ Msajili Mteja"** kummsajili mteja mpya papo hapo hata ukiwa offline!
   - Kisha chagua njia ya malipo ya **"CREDIT / MKOPO"**.

4. **Chagua Njia ya Malipo:**
   - Inasapoti **CASH**, **M-PESA**, **TIGO PESA**, **AIRTEL MONEY**, **HALOPESA**, **CRDB/NMB**, au **CREDIT**.

5. **Kamilisha Mauzo na Kuchapa Risiti:**
   - Bofya **"Kamilisha Mauzo"**. Dirisha la risiti litafunguka.
   - Unaweza kuchagua kati ya **"Risiti ya Kawaida (Simple)"** au **"Risiti Kamili (Thermal)"**.
   - Bofya **"Chapa Risiti (Print Receipt)"** kutoa risiti kwenye printer, au bofya **"WhatsApp / SMS"** kumtumia mteja risiti kwa njia ya kidijitali!`;
    } else {
      return `🛒 **HOW TO CONDUCT SALES AND PRINT RECEIPTS (POS INSTRUCTIONS)**

To complete a sale in LedgerBox POS, follow these steps:

1. **Add Items to Cart:**
   - Search for products by name or scan product barcodes.
   - Tap any item to add it to the active shopping cart.

2. **Adjust Quantity & Discounts:**
   - In the cart column on the right, use **"+"** or **"-"** to adjust quantities.
   - Enter a overall discount amount if applicable.

3. **Select or Register Customer (Credit Sales):**
   - From the customer dropdown, pick an existing customer or click **"+ New Customer"** to register a borrower instantly offline!
   - Set payment method to **"CREDIT"**.

4. **Choose Payment Gateway:**
   - Supports **CASH**, **M-PESA**, **TIGO PESA**, **AIRTEL MONEY**, **HALOPESA**, **CARD**, or **CREDIT**.

5. **Complete Checkout & Print:**
   - Click **"Complete Sale"**. The receipt modal opens.
   - Switch between **"Simple Receipt"** or **"Detailed Thermal Receipt"**.
   - Click **"Print Receipt"** to dispatch to your thermal printer, or tap **"WhatsApp / SMS"** to send paperless receipts!`;
    }
  }

  // 4. INVENTORY / STOCK / SUPPLIER ORDER SPECIFIC INSTRUCTIONS
  if (
    query.includes("stoo") || 
    query.includes("stock") || 
    query.includes("bidhaa") || 
    query.includes("ongeza bidhaa") || 
    query.includes("add product") || 
    query.includes("supplier") || 
    query.includes("oda") || 
    query.includes("agiza")
  ) {
    if (isSw) {
      return `📦 **JINSI YA KUSIMAMIA STOO NA KUONGEZA BIDHAA MPYA**

1. **Kuongeza Bidhaa Mpya:**
   - Nenda kwenye ukurasa wa **Stoo (Inventory)**.
   - Bofya kitufe cha **"+ Ongeza Bidhaa Mpya"**.
   - Jaza:
     - **Jina la Bidhaa** (Mfano: *Mchele wa Mbeya 1kg*)
     - **Barcode / SKU** (Inatengenezwa kiotomatiki au unaweza kuiskani)
     - **Bei ya Kununua / Mtaji** (Cost Price)
     - **Bei ya Kuuza** (Selling Price)
     - **Idadi iliyopo Stoo** (Initial Stock Qty)
     - **Kiwango cha Chini (Min Stock):** Mfumo ukifikia kiwango hiki utakupa tahadhari ya *Low Stock*!

2. **Kuhariri Bidhaa au Kurekebisha Stoo:**
   - Bofya kitufe cha mchoro wa kalamu (Edit) pembeni ya bidhaa yoyote kurekebisha bei au kuongeza mzigo mpya ulioingia.

3. **Kutengeneza Oda kwa Supplier (Supplier Purchase Order):**
   - Bofya kitufe cha **"Oda ya Supplier"**.
   - Chagua bidhaa unazotaka kuagiza, jaza idadi na namba ya simu ya Muuzaji (Supplier).
   - Bofya **"Tengeneza Oda"** kisha itume moja kwa moja kwa muuzaji kupitia WhatsApp!`;
    } else {
      return `📦 **HOW TO MANAGE INVENTORY & REGISTER PRODUCTS**

1. **Adding New Products:**
   - Navigate to the **Inventory** tab.
   - Click **"+ Add New Product"**.
   - Fill in:
     - **Product Name** (e.g. *Mbeya Rice 1kg*)
     - **Barcode / SKU** (Auto-generated or scannable)
     - **Buying Cost Price** (For accurate profit calculation)
     - **Selling Price**
     - **Initial Stock Quantity**
     - **Minimum Safety Stock Limit:** Triggering low stock alerts when quantity drops.

2. **Editing Products & Stock Adjustments:**
   - Click the edit icon next to any product row to update prices or restock inventory.

3. **Supplier Purchase Orders:**
   - Click **"Supplier Order"**.
   - Pick the items you need to restock, enter supplier details.
   - Click **"Generate Order"** and share directly via WhatsApp!`;
    }
  }

  // 5. CUSTOMERS & DEBTORS SPECIFIC INSTRUCTIONS
  if (
    query.includes("wateja") || 
    query.includes("mteja") || 
    query.includes("deni") || 
    query.includes("madeni") || 
    query.includes("kopa") || 
    query.includes("kopesha") || 
    query.includes("customer") || 
    query.includes("debt") || 
    query.includes("mrejesho") || 
    query.includes("record payment")
  ) {
    if (isSw) {
      return `👥 **JINSI YA KUSAMIA WATEJA NA REKODI ZA MADENI**

1. **Kusajili Mteja Mpya:**
   - **Kwenye Menyu ya Wateja:** Nenda **Wateja (Customers)** -> Bofya **"+ Ongeza Mteja Mpya"**.
   - **Kwenye Kaunta ya Mauzo (POS):** Unapofanya mauzo ya mkopo, bofya kitufe cha **"+ Msajili Mteja"** juu ya orodha ya wateja. Inakuruhusu kusajili mteja kwa sekunde 5 hata ukiwa offline!

2. **Kukopesha Mteja:**
   - Weka bidhaa kikapuni -> Chagua mteja -> Chagua njia ya malipo ya **"CREDIT"** -> Bofya Kamilisha Mauzo. Deni litaandikwa kiotomatiki kwenye akaunti yake.

3. **Kurekodi Mrejesho wa Deni (Record Payment):**
   - Mteja anapokuja kulipa deni, nenda **Wateja** -> Tafuta jina lake -> Bofya **"Record Payment"**.
   - Weka kiasi alicholipa na njia ya malipo (Cash/Mobile money).
   - Mfumo utapunguza deni lake papo hapo na kutoa **Stakabadhi ya Mrejesho wa Deni** inayoweza kuchapishwa au kutumwa kwa SMS/WhatsApp!

4. **Kutuma Vikumbusho vya SMS:**
   - Bofya kitufe cha SMS/WhatsApp pembeni ya jina la mteja kumtumia taarifa ya deni lake.`;
    } else {
      return `👥 **HOW TO MANAGE CUSTOMERS AND DEBT REPAYMENTS**

1. **Registering Customers:**
   - **Via Customers Tab:** Go to **Customers** -> Click **"+ Add New Customer"**.
   - **Via POS Checkout:** During a credit sale, click **"+ New Customer"** above the dropdown menu to register a borrower in 5 seconds offline!

2. **Issuing Credit Sales:**
   - Add items to cart -> Select customer -> Choose **"CREDIT"** payment gateway -> Click Complete Sale. Debt is logged automatically.

3. **Recording Debt Repayments:**
   - When a customer repays debt, go to **Customers** -> Find customer -> Click **"Record Payment"**.
   - Enter repayment amount and method.
   - LedgerBox deducts the balance instantly and generates an official **Debt Repayment Voucher** printable or shareable via WhatsApp!

4. **Sending Debt SMS Reminders:**
   - Tap the SMS/WhatsApp buttons next to any customer record to dispatch automated balance reminders.`;
    }
  }

  // 6. TICKETS / VOIDING SALES INSTRUCTIONS
  if (
    query.includes("history") || 
    query.includes("futa mauzo") || 
    query.includes("ghairi") || 
    query.includes("void") || 
    query.includes("cancel sale") || 
    query.includes("reprint") || 
    query.includes("tickets")
  ) {
    if (isSw) {
      return `🧾 **JINSI YA KUCHUNGUZA HISTORIA YA RISITI NA KUGHAIRI MAUZO (VOID SALE)**

1. **Kutazama Miamala Yote:**
   - Nenda kwenye ukurasa wa **Tickets / History**.
   - Utaona orodha ya risiti zote zilizotolewa zikiwa na tarehe, saa, jina la keshia, njia ya malipo, na jumla ya fedha.

2. **Kuchapa Risiti Tena (Reprint):**
   - Bofya risiti yoyote kufungua mchanganuo wake, kisha bofya **"Chapa Risiti"** au **"WhatsApp"** kuituma tena.

3. **Kughairi Mauzo (Void Transaction):**
   - Ikiwa mauzo yalifanyika kwa kosa, bofya kitufe cha **"Ghairi / Futa Mauzo"**.
   - Mfumo utakuuliza uthibitisho. Ukithibitisha:
     - Mfumo utafuta risiti hiyo kwenye miamala ya siku.
     - **Bidhaa zote zilizouzwa kwenye risiti hiyo zitarudishwa stoo kiotomatiki (Auto-restock)!**
     - Hesabu za mauzo na faida zitarekebishwa papo hapo.`;
    } else {
      return `🧾 **HOW TO REVIEW RECEIPT HISTORY & VOID TRANSACTIONS**

1. **Viewing Transaction History:**
   - Navigate to the **Tickets / History** tab.
   - View all generated receipt vouchers complete with date, timestamp, cashier name, payment gateway, and totals.

2. **Reprinting Receipts:**
   - Click any transaction row to open receipt details, then tap **"Print Receipt"** or **"WhatsApp"** to resend.

3. **Voiding / Cancelling Transactions:**
   - If a sale was entered in error, click **"Void / Cancel Sale"**.
   - Upon confirmation:
     - The transaction is removed from daily sales totals.
     - **All items from the transaction are automatically restocked back to inventory!**
     - Sales and profit records are recalibrated instantly.`;
    }
  }

  // 7. REPORTS & NET PROFIT INSTRUCTIONS
  if (
    query.includes("ripoti") || 
    query.includes("report") || 
    query.includes("faida") || 
    query.includes("profit") || 
    query.includes("hasara") || 
    query.includes("loss") || 
    query.includes("net profit") || 
    query.includes("pdf") || 
    query.includes("excel")
  ) {
    const kpis = summary.kpis;
    const currency = summary.currency;
    const profitMargin = kpis.totalSales > 0 ? ((kpis.totalProfit / kpis.totalSales) * 100).toFixed(1) : "0";

    if (isSw) {
      return `📊 **JINSI YA KUANGALIA RIPOTI NA FAIDA HALISI DUKANI KWAKO**

1. **Jinsi Faida Halisi (Net Profit) Inavyokokotolewa:**
   - Mfumo wa LedgerBox unachukua: **(Bei ya Kuuza - Bei ya Mtaji/Kununua)** kwa kila bidhaa.
   - Unapata faida safi bila kubahatisha!

2. **Kuangalia Ripoti kwenye Ukurasa wa REPORTS:**
   - Nenda **Reports & Analytics**.
   - **Kipindi cha Muda:** Unaweza kuchagua kuona *Leo*, *Mwezi Huu*, au *Muda Wote*.
   - **Takwimu za Sasa:**
     - Jumla ya Mauzo: **${currency} ${kpis.totalSales.toLocaleString()}**
     - Faida Halisi: **${currency} ${kpis.totalProfit.toLocaleString()}** (Margin: **${profitMargin}%**)
     - Madeni ya Wateja: **${currency} ${kpis.totalCustomerDebts.toLocaleString()}**

3. **Kudownload au Kuchapa Ripoti:**
   - Bofya kitufe cha **"Download PDF Report"** au **"Export Excel"** ili kupakua ripoti rasmi iliyopangwa vizuri kwa ajili ya ukaguzi wa biashara au TRA!`;
    } else {
      return `📊 **HOW TO VIEW FINANCIAL REPORTS & NET PROFIT**

1. **How Net Profit is Calculated:**
   - LedgerBox calculates: **(Selling Price - Buying Cost Price)** per sold unit.
   - Delivers true net margin insights without guesswork!

2. **Analyzing Reports:**
   - Go to **Reports & Analytics**.
   - **Time Filter:** Select *Today*, *This Month*, or *All Time*.
   - **Current Performance Metrics:**
     - Cumulative Sales: **${currency} ${kpis.totalSales.toLocaleString()}**
     - Net Profit: **${currency} ${kpis.totalProfit.toLocaleString()}** (Margin: **${profitMargin}%**)
     - Outstanding Customer Debts: **${currency} ${kpis.totalCustomerDebts.toLocaleString()}**

3. **Exporting Reports:**
   - Click **"Download PDF Report"** or **"Export Excel"** to generate official financial statements for audits or TRA tax filings!`;
    }
  }

  // 8. SETTINGS, CASHIERS & BACKUP INSTRUCTIONS
  if (
    query.includes("settings") || 
    query.includes("mipangilio") || 
    query.includes("keshia") || 
    query.includes("cashier") || 
    query.includes("password") || 
    query.includes("pin") || 
    query.includes("lugha") || 
    query.includes("language") || 
    query.includes("logo") || 
    query.includes("backup") || 
    query.includes("restore") || 
    query.includes("ingiza data")
  ) {
    if (isSw) {
      return `⚙️ **JINSI YA KUSETA MIPANGILIO YA DUKA NA BACKUP YA DATA**

1. **Taarifa za Duka & Logo:**
   - Nenda **Settings (Mipangilio)** -> Badilisha Jina la Duka, Simu, Anwani, na Weka link ya **Logo/Picha ya Duka**.
   - **Format ya Risiti:** Chagua **"Aina ya Risiti ya Msingi"** kati ya *Kawaida (Simple)* au *Full Thermal*.

2. **Kusajili Makeshia na PIN:**
   - Kwenye Sehemu ya **Cashier / User Management**, bofya **"+ Add Cashier"**.
   - Weka Jina na PIN/Nenosiri ili kila mhudumu aweze kuingia kwenye akaunti yake kutoa risiti.

3. **Backup ya Data ya Duka (Hifadhi Offline Data):**
   - **Kudownload Backup:** Bofya **"Download Backup (JSON)"** kuhifadhi takwimu zako zote kwenye kompyuta au simu.
   - **Kuingiza Backup (Restore):** Ikiwa umebadilisha simu au kompyuta, bofya **"Import Data"** kurejesha taarifa zako zote bila kupoteza chochote!`;
    } else {
      return `⚙️ **HOW TO CONFIGURE SETTINGS & BACKUP OFFLINE DATA**

1. **Store Identity & Logo:**
   - Go to **Settings** -> Update Store Name, Phone, Address, and Logo URL.
   - **Receipt Style:** Set **"Default Receipt Format"** to either *Simple Concise* or *Detailed Thermal*.

2. **Cashiers & Security PINs:**
   - Under **Cashier / User Management**, click **"+ Add Cashier"**.
   - Create cashier names and security PINs for shift tracking.

3. **Offline Data Backup & Restore:**
   - **Download Backup:** Click **"Download Backup (JSON)"** to save your complete store database locally.
   - **Import Data:** When switching devices, click **"Import Data"** to restore all records instantly without data loss!`;
    }
  }

  // 9. OFFLINE MODE & PWA APP INSTALLATION
  if (
    query.includes("offline") || 
    query.includes("bila mtandao") || 
    query.includes("intaneti") || 
    query.includes("bando") || 
    query.includes("pwa") || 
    query.includes("install") || 
    query.includes("sakinisha") || 
    query.includes("desktop") || 
    query.includes("homescreen") || 
    query.includes("download app")
  ) {
    if (isSw) {
      return `📱 **JINSI YA KUSAKINISHA LEDGERBOX APP NA KUTUMIA 100% BILA INTANETI (OFFLINE)**

LedgerBox ni **Progressive Web App (PWA)** iliyotengenezwa kufanya kazi kikamilifu bila kutegemea mtandao wa intaneti wala bando!

1. **Jinsi ya Kusakinisha kwenye Simu au Laptop:**
   - Fungua menu ya Browser yako (vitufe 3 vilivyopo juu kulia kwenye Chrome/Edge/Brave).
   - Chagua **"Install LedgerBox"** au **"Add to Home Screen"** (*Ongeza Kwenye Skrini*).
   - Icon ya **LedgerBox** itaonekana kwenye skrini ya simu au desktop ya laptop yako.

2. **Inavyofanya Kazi Bila Mtandao:**
   - Data zako zote (bidhaa, mauzo, wateja, madeni, na risiti) zinahifadhiwa kwa usalama kwenye hifadhi ya ndani ya kifaa chako (\`IndexedDB & LocalStorage\`).
   - Unaweza kutoa risiti, kusajili wateja, kuangalia faida na kutumia **LedgerBox AI** hata kukiwa hakuna mtandao au bando limeisha kabisa!`;
    } else {
      return `📱 **HOW TO INSTALL LEDGERBOX APP & OPERATE 100% OFFLINE**

LedgerBox is engineered as a **Progressive Web App (PWA)** designed to run seamlessly with zero internet dependence!

1. **How to Install on Phone or Laptop:**
   - Open your browser menu (3 dots top right in Chrome/Edge/Brave).
   - Click **"Install LedgerBox"** or **"Add to Home Screen"**.
   - The **LedgerBox** app icon will launch directly from your desktop or mobile home screen.

2. **Zero-Internet Data Architecture:**
   - All catalog data, sales, debt ledgers, and receipts are secured inside local device storage (\`IndexedDB & LocalStorage\`).
   - Perform checkouts, register debtors, audit profits, and query **LedgerBox AI** with complete offline autonomy!`;
    }
  }

  // 10. TAXATION TRA
  if (
    query.includes("kodi") || 
    query.includes("tra") || 
    query.includes("tax") || 
    query.includes("tin")
  ) {
    const tax = summary.taxEstimation;
    const currency = summary.currency;
    if (isSw) {
      return `🇹🇿 **MWONGOZO WA KODI YA TRA NA LESENI NCHINI TANZANIA**

Utaratibu wa kodi kwa wafanyabiashara wadogo nchini Tanzania unategemea makadirio ya mauzo ya mwaka (Presumptive Tax System):

1. **Kadirio Lako la Kodi ya Mwaka:**
   - **Kiwango kilichopendekezwa:** \`${tax.recommendedTaxRegime}\`
   - **Makadirio ya Kodi ya Mwaka:** \`${currency} ${tax.estimatedAnnualTax.toLocaleString()}\`

2. **Vidokezo Muhimu vya TRA kutoka kwa Brayan Kako:**
   - **Weka Kumbukumbu Sahihi:** TRA wanapenda kuona vitabu vya hesabu safi. LedgerBox inakusaidia kuweka rekodi hizi kiotomatiki, hivyo unaweza kuchapisha ripoti za LedgerBox kama uthibitisho wa mauzo halisi.
   - **Usajili wa EFD:** Ikiwa mauzo yako ya mwaka yanazidi TSh milioni 14, unapaswa kusajili mashine ya EFD.`;
    } else {
      return `🇹🇿 **TAXATION & LICENSING COMPLIANCE IN TANZANIA (TRA)**

1. **Your Annual Tax Estimation:**
   - **Recommended Regime:** \`${tax.recommendedTaxRegime}\`
   - **Estimated Annual Tax Liability:** \`${currency} ${tax.estimatedAnnualTax.toLocaleString()}\`

2. **Important Compliance Milestones:**
   - **Sustained Bookkeeping:** TRA audits demand precise registers. Use LedgerBox to automatically catalog transactions.
   - **EFD Threshold:** Required if annual sales exceed TSh 14 Million.`;
    }
  }

  // 11. GENERAL / DETAILED DIAGNOSIS FALLBACK
  const currency = summary.currency;
  const kpis = summary.kpis;

  if (isSw) {
    return `💡 **MAJIBU YA MSHAURI WA LEDGERBOX AI (OFFLINE MODE)**

Kuhusu swali au maombi yako: **"${userInput}"**

Mimi ni **LedgerBox AI**, na nimepewa uwezo na **Brayan Kako** kumwelekeza na kumsaidia kila mtumiaji kutumia mfumo huu kikamilifu hata kukiwa **OFFLINE** bila mtandao!

**Mwongozo wa Haraka wa Mfumo:**
- 🛒 **Mauzo & Risiti:** Nenda **POS** -> Chagua bidhaa -> Kamilisha mauzo -> Chapa risiti au tuma WhatsApp/SMS.
- 👥 **Kusajili Mteja Anayekopa:** Kwenye checkout ya POS, bofya **"+ Msajili Mteja"** kumweka mteja mpya papo hapo offline.
- 📦 **Ongeza Bidhaa:** Nenda **Inventory** -> **"+ Ongeza Bidhaa"** kuweka bei za mtaji na kuuza.
- 📊 **Angalia Faida Halisi:** Nenda **Reports** kuona Net Profit na kupakua PDF/Excel.

**Hali ya Duka Lako kwa Sasa:**
- Jumla ya Mauzo: **${currency} ${kpis.totalSales.toLocaleString()}**
- Jumla ya Faida: **${currency} ${kpis.totalProfit.toLocaleString()}**
- Madeni ya Wateja: **${currency} ${kpis.totalCustomerDebts.toLocaleString()}**

Ikiwa unahitaji ufafanuzi zaidi kuhusu sehemu yoyote ya mfumo, tafadhali niulize na nitakupa maelekezo ya hatua kwa hatua!`;
  } else {
    return `💡 **LEDGERBOX AI ASSISTANT RESPONSE (OFFLINE MODE)**

Regarding your query: **"${userInput}"**

I am **LedgerBox AI**, fully trained by **Brayan Kako** to guide and assist you with **EVERY feature of this system** even when **OFFLINE** without internet!

**Quick System Guide Shortcuts:**
- 🛒 **Sales & Receipts:** Go to **POS** -> Pick items -> Checkout -> Print receipt or dispatch via WhatsApp/SMS.
- 👥 **Register Borrowers:** At POS checkout, click **"+ New Customer"** to register a customer instantly offline.
- 📦 **Add Products:** Go to **Inventory** -> **"+ Add Product"** to set cost and selling prices.
- 📊 **Check Net Profit:** Go to **Reports** to audit net profits and export PDF/Excel statements.

**Your Store Metrics Snapshot:**
- Total Sales: **${currency} ${kpis.totalSales.toLocaleString()}**
- Net Profit: **${currency} ${kpis.totalProfit.toLocaleString()}**
- Customer Debts: **${currency} ${kpis.totalCustomerDebts.toLocaleString()}**

Feel free to ask any specific step-by-step usage questions!`;
  }
}
