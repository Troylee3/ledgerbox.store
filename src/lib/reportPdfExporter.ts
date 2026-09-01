import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface ReportPdfData {
  storeName: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  currencySymbol: string;
  generatedBy: string;
  language: 'SW' | 'EN';
  timePeriodLabel: string;
  trendChartDays: '30' | '14' | '7' | string;
  trendSummary: {
    totalIncome: number;
    totalExpenses: number;
    totalCogs: number;
    grossProfit: number;
    netProfit: number;
    expenseRatio: number;
    avgProfitMargin: number;
    isNetLoss: boolean;
    profitableDays: number;
    deficitDays: number;
    breakEvenDays: number;
    totalTx: number;
    totalExp: number;
    peakExpense: { date: string; amount: number; fullDate: string };
    peakIncome: { date: string; amount: number; fullDate: string };
    bestProfitDay: { date: string; amount: number; fullDate: string; marginPct: number };
    worstProfitDay: { date: string; amount: number; fullDate: string; marginPct: number };
    avgDailyIncome: number;
    avgDailyExpense: number;
    avgDailyNet: number;
  };
  trendData: Array<{
    dateString: string;
    label: string;
    fullDate: string;
    income: number;
    expenses: number;
    cogs: number;
    netProfit: number;
    profitMarginPct: number;
    txCount: number;
    expCount: number;
  }>;
  cashFlow?: {
    CASH: number;
    M_PESA: number;
    TIGO_PESA: number;
    AIRTEL_MONEY: number;
    HALOPESA: number;
    CARD: number;
    CREDIT: number;
  };
  topProducts?: Array<{
    name: string;
    qtySold: number;
    revenueGained: number;
  }>;
}

/**
 * Generates an executive-grade printable PDF report for LedgerBox Store & POS
 */
export async function exportReportToPdf(
  data: ReportPdfData,
  chartElementId?: string
): Promise<void> {
  const isSw = data.language === 'SW';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const now = new Date();
  const dateStr = now.toLocaleDateString(isSw ? 'sw-TZ' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString(isSw ? 'sw-TZ' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // --- 1. HEADER & BRANDING BANNER ---
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(margin, y, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.storeName || 'LEDGERBOX POS & STORE', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  const subTitle = isSw 
    ? `Ripoti ya Kina ya Mapato, Matumizi na Faida Halisi (${data.trendChartDays} Siku)`
    : `Comprehensive Income, Expense & Net Profit Report (${data.trendChartDays} Days)`;
  doc.text(subTitle, margin + 6, y + 15);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${isSw ? 'Tarehe:' : 'Date:'} ${dateStr} ${timeStr} | ${isSw ? 'Imetolewa na:' : 'By:'} ${data.generatedBy || 'Admin'}`,
    margin + 6,
    y + 20
  );

  // Status Badge in Header
  const statusLabel = data.trendSummary.isNetLoss
    ? (isSw ? 'HASARA / DEFICIT' : 'DEFICIT')
    : (isSw ? 'FAIDA / PROFIT' : 'SURPLUS');
  const badgeColor = data.trendSummary.isNetLoss ? [225, 29, 72] : [16, 185, 129];
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(pageWidth - margin - 38, y + 5, 32, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(statusLabel, pageWidth - margin - 22, y + 9.5, { align: 'center' });

  y += 28;

  // --- 2. EXECUTIVE KPI CARDS GRID (4 Cards) ---
  const cardGap = 3;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 18;

  // Card 1: Gross Income
  doc.setFillColor(238, 242, 255); // Indigo 50
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(79, 70, 229);
  doc.text(isSw ? 'MAPATO YA MAUZO' : 'GROSS REVENUE', margin + 3, y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(30, 27, 75);
  doc.text(
    `${data.currencySymbol} ${data.trendSummary.totalIncome.toLocaleString()}`,
    margin + 3,
    y + 10.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${data.trendSummary.totalTx} ${isSw ? 'mauzo' : 'txns'} | ~${data.currencySymbol}${Math.round(data.trendSummary.avgDailyIncome).toLocaleString()}/d`,
    margin + 3,
    y + 15
  );

  // Card 2: Total Operating Expenses
  const c2X = margin + cardWidth + cardGap;
  doc.setFillColor(255, 241, 242); // Rose 50
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(c2X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(225, 29, 72);
  doc.text(isSw ? 'JUMLA YA MATUMIZI' : 'TOTAL EXPENSES', c2X + 3, y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(76, 5, 25);
  doc.text(
    `${data.currencySymbol} ${data.trendSummary.totalExpenses.toLocaleString()}`,
    c2X + 3,
    y + 10.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${data.trendSummary.totalExp} ${isSw ? 'vocha' : 'records'} | ~${data.currencySymbol}${Math.round(data.trendSummary.avgDailyExpense).toLocaleString()}/d`,
    c2X + 3,
    y + 15
  );

  // Card 3: Net Margin / Profit
  const c3X = margin + (cardWidth + cardGap) * 2;
  const isLoss = data.trendSummary.isNetLoss;
  doc.setFillColor(isLoss ? 254 : 236, isLoss ? 242 : 253, isLoss ? 242 : 245);
  doc.setDrawColor(isLoss ? 254 : 167, isLoss ? 202 : 243, isLoss ? 202 : 208);
  doc.roundedRect(c3X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isLoss ? 185 : 5, isLoss ? 28 : 150, isLoss ? 28 : 105);
  doc.text(isSw ? 'FAIDA HALISI (NET)' : 'NET PROFIT', c3X + 3, y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(isLoss ? 153 : 6, isLoss ? 27 : 95, isLoss ? 27 : 70);
  doc.text(
    `${data.trendSummary.netProfit >= 0 ? '+' : ''}${data.currencySymbol} ${data.trendSummary.netProfit.toLocaleString()}`,
    c3X + 3,
    y + 10.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${isSw ? 'Wastani wa Faida:' : 'Net Margin:'} ${data.trendSummary.avgProfitMargin}%`,
    c3X + 3,
    y + 15
  );

  // Card 4: Profitability Ratio & Win Rate
  const c4X = margin + (cardWidth + cardGap) * 3;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(c4X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(isSw ? 'SIKU ZENYE FAIDA' : 'PROFITABLE DAYS', c4X + 3, y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${data.trendSummary.profitableDays} / ${data.trendData.length} ${isSw ? 'Siku' : 'Days'}`,
    c4X + 3,
    y + 10.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const winRate = ((data.trendSummary.profitableDays / (data.trendData.length || 1)) * 100).toFixed(0);
  doc.text(
    `${winRate}% ${isSw ? 'Win Rate' : 'Success'} | ${data.trendSummary.expenseRatio.toFixed(1)}% ${isSw ? 'Matumizi' : 'Burn'}`,
    c4X + 3,
    y + 15
  );

  y += cardHeight + 4;

  // --- 3. EMBEDDED TREND CHART CAPTURE (IF AVAILABLE) ---
  let chartCaptured = false;
  if (chartElementId) {
    try {
      const chartElement = document.getElementById(chartElementId);
      if (chartElement) {
        const canvas = await html2canvas(chartElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/png');
        const chartHeight = 52;

        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, y, contentWidth, chartHeight + 8, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(
          isSw ? `GRAFU YA MWENENDO WA SIKU ${data.trendChartDays} (OVERLAYED TREND CHART)` : `${data.trendChartDays}-DAY OVERLAYED TREND CHART`,
          margin + 4,
          y + 5
        );

        doc.addImage(imgData, 'PNG', margin + 2, y + 6, contentWidth - 4, chartHeight);
        y += chartHeight + 12;
        chartCaptured = true;
      }
    } catch (err) {
      console.warn('Could not capture chart element to image canvas', err);
    }
  }

  if (!chartCaptured) {
    // Fallback info strip if chart canvas capture was bypassed
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      isSw ? `Uchambuzi wa Siku ${data.trendChartDays}: Mapato ${data.currencySymbol}${data.trendSummary.totalIncome.toLocaleString()} | Matumizi ${data.currencySymbol}${data.trendSummary.totalExpenses.toLocaleString()} | Faida Halisi ${data.currencySymbol}${data.trendSummary.netProfit.toLocaleString()}` : `Horizon summary: Revenue ${data.currencySymbol}${data.trendSummary.totalIncome.toLocaleString()} | Expenses ${data.currencySymbol}${data.trendSummary.totalExpenses.toLocaleString()} | Net Margin ${data.currencySymbol}${data.trendSummary.netProfit.toLocaleString()}`,
      margin + 4,
      y + 6.5
    );
    y += 14;
  }

  // --- 4. ITEMIZED DAILY BREAKDOWN TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    isSw ? `Jedwali la Siku kwa Siku (${data.trendChartDays} Siku)` : `Daily Itemized Ledger (${data.trendChartDays} Days)`,
    margin,
    y
  );
  y += 3.5;

  // Table Headers
  const colW = {
    date: 34,
    income: 34,
    expenses: 32,
    cogs: 28,
    netProfit: 32,
    margin: 22,
  };

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);

  let curX = margin + 2;
  doc.text(isSw ? 'TAREHE' : 'DATE', curX, y + 4.2);
  curX += colW.date;
  doc.text(isSw ? 'MAPATO (INCOME)' : 'INCOME', curX, y + 4.2);
  curX += colW.income;
  doc.text(isSw ? 'MATUMIZI (EXPENSES)' : 'EXPENSES', curX, y + 4.2);
  curX += colW.expenses;
  doc.text(isSw ? 'MTAJI (COGS)' : 'COGS', curX, y + 4.2);
  curX += colW.cogs;
  doc.text(isSw ? 'FAIDA HALISI' : 'NET PROFIT', curX, y + 4.2);
  curX += colW.netProfit;
  doc.text(isSw ? 'MARGIN %' : 'MARGIN %', curX, y + 4.2);

  y += 6.5;

  // Table Rows
  const sortedData = [...data.trendData].reverse(); // Most recent first
  const rowHeight = 4.8;

  sortedData.forEach((row, idx) => {
    // Check for page break
    if (y + rowHeight > pageHeight - 20) {
      doc.addPage();
      y = margin;
      
      // Re-print table header on new page
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);

      let headerX = margin + 2;
      doc.text(isSw ? 'TAREHE' : 'DATE', headerX, y + 4.2);
      headerX += colW.date;
      doc.text(isSw ? 'MAPATO' : 'INCOME', headerX, y + 4.2);
      headerX += colW.income;
      doc.text(isSw ? 'MATUMIZI' : 'EXPENSES', headerX, y + 4.2);
      headerX += colW.expenses;
      doc.text(isSw ? 'MTAJI (COGS)' : 'COGS', headerX, y + 4.2);
      headerX += colW.cogs;
      doc.text(isSw ? 'FAIDA HALISI' : 'NET PROFIT', headerX, y + 4.2);
      headerX += colW.netProfit;
      doc.text(isSw ? 'MARGIN %' : 'MARGIN %', headerX, y + 4.2);
      y += 6.5;
    }

    // Alternating row background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 1, contentWidth, rowHeight, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);

    let rowX = margin + 2;
    doc.text(row.label, rowX, y + 2.5);

    rowX += colW.date;
    doc.text(`${data.currencySymbol} ${row.income.toLocaleString()}`, rowX, y + 2.5);

    rowX += colW.income;
    if (row.expenses > 0) {
      doc.setTextColor(225, 29, 72);
    } else {
      doc.setTextColor(148, 163, 184);
    }
    doc.text(`${data.currencySymbol} ${row.expenses.toLocaleString()}`, rowX, y + 2.5);

    rowX += colW.expenses;
    doc.setTextColor(100, 116, 139);
    doc.text(`${data.currencySymbol} ${row.cogs.toLocaleString()}`, rowX, y + 2.5);

    rowX += colW.cogs;
    if (row.netProfit > 0) {
      doc.setTextColor(5, 150, 105);
    } else if (row.netProfit < 0) {
      doc.setTextColor(225, 29, 72);
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(`${row.netProfit >= 0 ? '+' : ''}${data.currencySymbol} ${row.netProfit.toLocaleString()}`, rowX, y + 2.5);

    rowX += colW.netProfit;
    const marginText = `${row.profitMarginPct >= 0 ? '+' : ''}${row.profitMarginPct}%`;
    doc.text(marginText, rowX, y + 2.5);

    y += rowHeight;
  });

  y += 6;

  // --- 5. CASH FLOW DISTRIBUTION (IF SPACE PERMITS OR ON BOTTOM) ---
  if (data.cashFlow && y + 30 <= pageHeight - 18) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(isSw ? 'MGAWANYO WA MALIPO (CASH FLOW BY METHOD)' : 'CASH FLOW BREAKDOWN', margin + 4, y + 5);

    const methods = [
      { name: isSw ? 'Taslimu (Cash)' : 'Cash', amount: data.cashFlow.CASH },
      { name: 'M-Pesa', amount: data.cashFlow.M_PESA },
      { name: 'Tigo Pesa', amount: data.cashFlow.TIGO_PESA },
      { name: 'Airtel/Halo', amount: data.cashFlow.AIRTEL_MONEY + data.cashFlow.HALOPESA },
      { name: isSw ? 'Kadi (Card)' : 'Card', amount: data.cashFlow.CARD },
      { name: isSw ? 'Mikopo (Credit)' : 'Credit', amount: data.cashFlow.CREDIT },
    ];

    const mWidth = (contentWidth - 8) / 6;
    methods.forEach((m, i) => {
      const mX = margin + 4 + i * mWidth;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(m.name, mX, y + 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${data.currencySymbol} ${m.amount.toLocaleString()}`, mX, y + 15);
    });

    y += 24;
  }

  // --- 6. USER GUIDE & SYSTEM FEATURES EXPLANATION PAGE (MWONGOZO WA MFUMO NA MABORESHO MAPYA) ---
  doc.addPage();
  let guideY = margin;

  // Header Banner for Guide Page
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(margin, guideY, contentWidth, 18, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    isSw ? 'MWONGOZO WA MATUMIZI NA MABORESHO MAPYA YA MFUMO' : 'SYSTEM USER GUIDE & UPDATED FEATURE DIRECTORY',
    margin + 5,
    guideY + 7.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    isSw 
      ? 'Maelezo kamili ya jinsi vipengele vipya vya LedgerBox vinavyofanya kazi na miongozo ya kuendesha biashara.'
      : 'Comprehensive breakdown of LedgerBox analytics, calculations, expense tracking, and system workflows.',
    margin + 5,
    guideY + 13
  );

  guideY += 23;

  // Feature Section 1: Matumizi & Faida Halisi (P&L & Expense Tracking)
  doc.setFillColor(238, 242, 255); // Indigo 50
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin, guideY, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(67, 56, 202);
  doc.text(
    isSw ? '1. USIMAMIZI WA MATUMIZI NA HESABU YA FAIDA HALISI (P&L ENGINE)' : '1. OPERATIONAL EXPENSE TRACKING & NET PROFIT ENGINE',
    margin + 4,
    guideY + 5.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  const p1Text = isSw
    ? [
        '• Kurekodi Vocha za Matumizi: Mfumo unakuwezesha kuingiza matumizi ya biashara kama vile Kodi ya fremu, Umeme/Maji, Mishahara, Usafiri, Vifungashio, n.k.',
        '• Hesabu ya Faida Ghafi (Gross Profit): Inapimwa kwa kukata Mtaji wa Bidhaa (COGS) kutoka kwenye Mauzo ya Jumla.',
        '• Hesabu ya Faida Halisi (Net Profit): Inapimwa kwa kutoa Jumla ya Matumizi ya Uendeshaji kutoka kwenye Faida Ghafi.',
        '• Tahadhari ya Matumizi Makubwa: Mfumo hutoa arifa za kiwango cha matumizi (Expense Ratio) ili kukulinda dhidi ya uendeshaji unaozalisha hasara.'
      ]
    : [
        '• Expense Voucher Logging: Track operational costs including store rent, electricity, staff wages, transport, packaging, and repairs.',
        '• Gross Profit Calculation: Gross Revenue minus Cost of Goods Sold (COGS).',
        '• Net Profit Margin: Gross Profit minus Total Operating Expenses.',
        '• Expense Burn Alerts: Provides visual alerts if operating spend exceeds healthy thresholds relative to daily revenues.'
      ];

  let lineY = guideY + 11;
  p1Text.forEach(line => {
    doc.text(line, margin + 4, lineY);
    lineY += 5.2;
  });

  guideY += 38;

  // Feature Section 2: Grafu ya Mwenendo wa Siku 30 (Overlay Trend Charts)
  doc.setFillColor(254, 242, 242); // Rose/Red 50
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, guideY, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(190, 18, 60);
  doc.text(
    isSw ? '2. GRAFU YA MISTARI ILIYOPISHANISHWA (MULTI-LINE OVERLAY TRENDS)' : '2. MULTI-LINE OVERLAY TREND CHARTING & PERFORMANCE HORIZONS',
    margin + 4,
    guideY + 5.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  const p2Text = isSw
    ? [
        '• Mstari wa Indigo (Mapato): Huonyesha mtiririko wa pesa zinazoingia kutokana na mauzo ya kila siku.',
        '• Mstari Mwekundu (Matumizi): Huonyesha kiwango cha gharama zilizotumika siku hiyo.',
        '• Mstari wa Kijani wa Vitone (Faida Halisi): Huonyesha kiasi halisi kilichobaki mfukoni kama faida baada ya kutoa mtaji na gharama.',
        '• Siku Zenye Faida (Win Rate): Huhesabu idadi ya siku biashara ilipofanya kazi kwa faida dhidi ya siku zilizokuwa na upungufu/hasara.'
      ]
    : [
        '• Indigo Line (Gross Income): Tracks daily checkout revenues generated across all channels.',
        '• Rose Line (Operating Spend): Plots daily overhead costs and expense vouchers.',
        '• Dashed Emerald Line (Net Margin): Represents real take-home net profit after deducting COGS and operating expenses.',
        '• Profitable Days Ratio: Computes win-rate percentage of days operating in net surplus versus deficit days.'
      ];

  lineY = guideY + 11;
  p2Text.forEach(line => {
    doc.text(line, margin + 4, lineY);
    lineY += 5.2;
  });

  guideY += 38;

  // Feature Section 3: Mfumo wa Ripoti ya Matumizi kwa Kila Mtumiaji / Mfanyakazi (Staff Expense Tracking & Accountability)
  doc.setFillColor(245, 243, 255); // Purple 50
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(margin, guideY, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(109, 40, 217);
  doc.text(
    isSw ? '3. RIPOTI YA MATUMIZI KWA KILA MTUMIAJI (AUTOMATIC STAFF EXPENSE ACCOUNTABILITY)' : '3. AUTOMATIC USER EXPENSE ACCOUNTABILITY & AUDIT TRAIL',
    margin + 4,
    guideY + 5.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  const p3Text = isSw
    ? [
        '• Ufuatiliaji wa Kiotomatiki: Kila matumizi yanaporekodiwa, mfumo hunasa jina la mfanyakazi au msimamizi aliyefanya matumizi hayo (Recorded By).',
        '• Ripoti Maalumu ya Wafanyakazi: Sehemu ya "Matumizi" ina kichupo cha "Ripoti kwa Watumiaji" kinachochanganua nani katumia kiasi gani na asilimia ngapi.',
        '• Orodha ya Vocha kwa Kila Mfanyakazi: Unaweza kuona mchanganuo wa stakabadhi na sababu za matumizi ya kila mmoja kwa tarehe husika.',
        '• Uchapishaji wa Ripoti ya Wafanyakazi: Uwezo wa kutoa ripoti iliyoandaliwa maalumu kwa ajili ya ukaguzi wa matumizi ya wafanyakazi.'
      ]
    : [
        '• Automated Staff Attribution: Every expense voucher automatically captures the exact staff member or cashier who authorized/logged the spend.',
        '• Staff Expense Summary View: The Expenses module provides a dedicated "User Expense Report" tab with spending volume and percentage shares.',
        '• Itemized Spend Audit: View individual receipt breakdown and expenditure notes grouped under each staff profile.',
        '• Printable Staff Audit Export: Generates formatted audit receipts for internal review and expense verification.'
      ];

  lineY = guideY + 11;
  p3Text.forEach(line => {
    doc.text(line, margin + 4, lineY);
    lineY += 5.2;
  });

  guideY += 38;

  // Feature Section 4: Mbinu za Malipo, Stoo & Kodi ya TRA (Multi-Payment, Stock & Tax Engine)
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, guideY, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61);
  doc.text(
    isSw ? '4. MALIPO YA SIMU, THAMANI YA STOO NA HESABU ZA KODI (TRA TAX ENGINE)' : '4. MULTI-PAYMENTS, INVENTORY INTELLIGENCE & TRA TAX ENGINE',
    margin + 4,
    guideY + 5.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  const p4Text = isSw
    ? [
        '• Malipo ya Mitandao: M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Taslimu (Cash), Kadi na Mikopo ya Wateja yenye ufuatiliaji wa madeni.',
        '• Usimamizi wa Stoo: Hesabu ya thamani ya stoo kwa bei ya ununuzi na arifa za bidhaa zinapokaribia kuisha.',
        '• Injini ya Kodi ya TRA: Hesabu za kodi ya mapato kulingana na sheria za Tanzania (Turnover Tax, Presumptive na Corporate Tax).',
        '• Taarifa za Kifedha: Taarifa ya Faida au Hasara (Profit or Loss) na Hali ya Kifedha (Financial Position) kulingana na viwango vya kihasibu.'
      ]
    : [
        '• Multi-Channel Cashflow: Instant tracking for M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Cash, Bank Cards, and Customer Credit ledgers.',
        '• Inventory Valuation: Real-time stock valuation at cost price with automated re-order low stock warnings.',
        '• TRA Tax Engine: Automated Tanzanian presumptive tax brackets and Corporate income tax estimates.',
        '• Financial Statements: Comprehensive Profit or Loss and Balance Sheet Statements compliant with retail standards.'
      ];

  lineY = guideY + 11;
  p4Text.forEach(line => {
    doc.text(line, margin + 4, lineY);
    lineY += 5.2;
  });

  guideY += 38;

  // Feature Section 5: Mfumo wa Fomula za Hesabu za Kifedha (Financial Formulas Reference)
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, guideY, contentWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    isSw ? '5. JEDWALI LA FOMULA ZA HESABU ZA KIFEDHA (FINANCIAL FORMULAS)' : '5. FINANCIAL FORMULAS & CALCULATION LOGIC',
    margin + 4,
    guideY + 5.5
  );

  const formulas = isSw
    ? [
        { label: 'Mapato ya Mauzo (Revenue):', formula: 'Jumla ya fedha zote za mauzo zilizopokelewa' },
        { label: 'Mtaji wa Bidhaa (COGS):', formula: 'Idadi ya bidhaa zilizouzwa × Bei ya ununuzi ya kila bidhaa' },
        { label: 'Faida Ghafi (Gross Profit):', formula: 'Mapato ya Mauzo - Mtaji wa Bidhaa (COGS)' },
        { label: 'Faida Halisi (Net Profit):', formula: 'Faida Ghafi - Jumla ya Matumizi ya Uendeshaji' },
        { label: 'Kiwango cha Faida (Margin %):', formula: '(Faida Halisi ÷ Mapato ya Mauzo) × 100' },
        { label: 'Kiwango cha Matumizi (Burn %):', formula: '(Jumla ya Matumizi ÷ Mapato ya Mauzo) × 100' }
      ]
    : [
        { label: 'Gross Revenue:', formula: 'Sum of all completed sales transactions' },
        { label: 'Cost of Goods Sold (COGS):', formula: 'Quantity Sold × Unit Cost Price' },
        { label: 'Gross Profit:', formula: 'Gross Revenue - Cost of Goods Sold (COGS)' },
        { label: 'Net Profit:', formula: 'Gross Profit - Total Operational Expenses' },
        { label: 'Net Profit Margin %:', formula: '(Net Profit / Gross Revenue) × 100' },
        { label: 'Expense Ratio %:', formula: '(Total Expenses / Gross Revenue) × 100' }
      ];

  let fY = guideY + 11;
  formulas.forEach(f => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text(f.label, margin + 4, fY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(f.formula, margin + 55, fY);

    fY += 4.5;
  });

  // --- 7. FOOTER WITH SIGNATURE LINE & PAGE NUMBERS ---
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `LedgerBox POS & Store Engine • ${isSw ? 'Ripoti Rasmi ya Biashara & Mwongozo wa Mfumo' : 'Official Business Analytics Report & User Guide'} • ${data.storeName}`,
      margin,
      pageHeight - 9
    );

    doc.text(
      `${isSw ? 'Ukurasa' : 'Page'} ${i} ${isSw ? 'wa' : 'of'} ${pageCount}`,
      pageWidth - margin,
      pageHeight - 9,
      { align: 'right' }
    );
  }

  // Save the generated PDF
  const sanitizedStore = (data.storeName || 'LedgerBox').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${sanitizedStore}_Ripoti_${(data.trendChartDays || 'custom').toString().replace(/[^a-zA-Z0-9]/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export interface TransactionsReportPdfData {
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  currencySymbol: string;
  generatedBy: string;
  language: 'SW' | 'EN';
  periodTitle: string; // e.g. "Ripoti ya Mwezi wa Januari 2026", "Ripoti ya Miezi 3 Iliyopita"
  dateRangeSubtitle: string; // e.g. "01 Jan 2026 - 31 Jan 2026"
  summary: {
    totalSales: number;
    totalCogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    profitMarginPct: number;
    transactionCount: number;
    totalUnitsSold: number;
    avgTransactionValue: number;
  };
  cashFlow: {
    CASH: number;
    M_PESA: number;
    TIGO_PESA: number;
    AIRTEL_MONEY: number;
    HALOPESA: number;
    CARD: number;
    CREDIT: number;
  };
  dailyBreakdown?: Array<{
    dateStr: string;
    formattedDate: string;
    transactionCount: number;
    unitsCount: number;
    cashSales: number;
    mobileSales: number;
    debtPaymentsCollected?: number;
    unpaidCreditSales?: number;
    creditSales?: number;
    totalSales: number;
    netProfit: number;
  }>;
  topProducts: Array<{
    name: string;
    qtySold: number;
    revenueGained: number;
  }>;
  transactions: Array<{
    receiptNumber: string;
    timestamp: string;
    cashierName: string;
    paymentMethod: string;
    itemsCount: number;
    total: number;
    discount?: number;
    customerName?: string;
  }>;
}

/**
 * Generates an official, comprehensive printable PDF report for any requested time horizon:
 * 1 Month, 3 Months, 6 Months, 12 Months, or Specific Chosen Month.
 */
export async function exportTransactionsReportPdf(data: TransactionsReportPdfData): Promise<void> {
  const isSw = data.language === 'SW';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const now = new Date();
  const dateStr = now.toLocaleDateString(isSw ? 'sw-TZ' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString(isSw ? 'sw-TZ' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // --- 1. HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, y, contentWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(data.storeName || 'LEDGERBOX STORE & POS', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(data.periodTitle, margin + 6, y + 15);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${data.dateRangeSubtitle} | ${isSw ? 'Imetolewa:' : 'Printed:'} ${dateStr} ${timeStr} | ${isSw ? 'Na:' : 'By:'} ${data.generatedBy || 'Admin'}`,
    margin + 6,
    y + 21
  );

  // Status Badge
  const isLoss = data.summary.netProfit < 0;
  const statusLabel = isLoss ? (isSw ? 'HASARA' : 'DEFICIT') : (isSw ? 'FAIDA' : 'SURPLUS');
  const badgeColor = isLoss ? [225, 29, 72] : [16, 185, 129];
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(pageWidth - margin - 36, y + 6, 30, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(statusLabel, pageWidth - margin - 21, y + 10.5, { align: 'center' });

  y += 30;

  // --- 2. EXECUTIVE METRIC SUMMARY CARDS (4 Cards) ---
  const cardGap = 3;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 18;

  // Card 1: Total Sales
  doc.setFillColor(238, 242, 255); // Indigo 50
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(79, 70, 229);
  doc.text(isSw ? 'JUMLA YA MAUZO' : 'GROSS SALES', margin + 3, y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(30, 27, 75);
  doc.text(`${data.currencySymbol} ${data.summary.totalSales.toLocaleString()}`, margin + 3, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.summary.transactionCount} ${isSw ? 'miamala' : 'txns'} | ${data.summary.totalUnitsSold} ${isSw ? 'bidhaa' : 'items'}`, margin + 3, y + 15);

  // Card 2: Cost of Goods (COGS)
  const c2X = margin + cardWidth + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(c2X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(isSw ? 'MTAJI WA BIDHAA (COGS)' : 'COST OF GOODS', c2X + 3, y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.currencySymbol} ${data.summary.totalCogs.toLocaleString()}`, c2X + 3, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${isSw ? 'Faida Ghafi:' : 'Gross:'} ${data.currencySymbol} ${data.summary.grossProfit.toLocaleString()}`, c2X + 3, y + 15);

  // Card 3: Expenses
  const c3X = margin + (cardWidth + cardGap) * 2;
  doc.setFillColor(255, 241, 242);
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(c3X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(225, 29, 72);
  doc.text(isSw ? 'MATUMIZI YA DUKA' : 'OPERATING SPEND', c3X + 3, y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(76, 5, 25);
  doc.text(`${data.currencySymbol} ${data.summary.totalExpenses.toLocaleString()}`, c3X + 3, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const expenseRatio = data.summary.totalSales > 0 ? ((data.summary.totalExpenses / data.summary.totalSales) * 100).toFixed(1) : '0';
  doc.text(`${expenseRatio}% ${isSw ? 'ya mauzo' : 'of revenue'}`, c3X + 3, y + 15);

  // Card 4: Net Profit
  const c4X = margin + (cardWidth + cardGap) * 3;
  doc.setFillColor(isLoss ? 254 : 236, isLoss ? 242 : 253, isLoss ? 242 : 245);
  doc.setDrawColor(isLoss ? 254 : 167, isLoss ? 202 : 243, isLoss ? 202 : 208);
  doc.roundedRect(c4X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isLoss ? 185 : 5, isLoss ? 28 : 150, isLoss ? 28 : 105);
  doc.text(isSw ? 'FAIDA HALISI (NET)' : 'NET TAKE-HOME', c4X + 3, y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(isLoss ? 153 : 6, isLoss ? 27 : 95, isLoss ? 27 : 70);
  doc.text(`${data.summary.netProfit >= 0 ? '+' : ''}${data.currencySymbol} ${data.summary.netProfit.toLocaleString()}`, c4X + 3, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${isSw ? 'Kiwango:' : 'Margin:'} ${data.summary.profitMarginPct.toFixed(1)}%`, c4X + 3, y + 15);

  y += cardHeight + 5;

  // --- 3. PAYMENT CHANNELS BREAKDOWN ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(isSw ? 'MGAWANYO WA NJIA ZA MALIPO (CASHFLOW CHANNELS)' : 'PAYMENT METHODS BREAKDOWN', margin + 4, y + 4.5);

  const channels = [
    { name: isSw ? 'Taslimu (Cash)' : 'Cash', amount: data.cashFlow.CASH },
    { name: 'M-Pesa', amount: data.cashFlow.M_PESA },
    { name: 'Tigo Pesa', amount: data.cashFlow.TIGO_PESA },
    { name: 'Airtel Money', amount: data.cashFlow.AIRTEL_MONEY },
    { name: 'HaloPesa', amount: data.cashFlow.HALOPESA },
    { name: isSw ? 'Kadi (Card)' : 'Card', amount: data.cashFlow.CARD },
    { name: isSw ? 'Mikopo (Credit)' : 'Credit', amount: data.cashFlow.CREDIT },
  ];

  const chWidth = (contentWidth - 8) / 7;
  channels.forEach((ch, i) => {
    const chX = margin + 4 + i * chWidth;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(ch.name, chX, y + 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${data.currencySymbol} ${ch.amount.toLocaleString()}`, chX, y + 14);
  });

  y += 22;

  // --- 4. TOP PRODUCTS SOLD IN THIS PERIOD ---
  if (data.topProducts && data.topProducts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(isSw ? 'BIDHAA ZILIZOONGOZA KWA MAUZO (TOP BEST-SELLING PRODUCTS)' : 'TOP BEST-SELLING PRODUCTS', margin, y + 3);
    y += 5;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);

    doc.text(isSw ? 'JINA LA BIDHAA' : 'PRODUCT NAME', margin + 3, y + 3.8);
    doc.text(isSw ? 'VIPANDE VILIVYOUZWA' : 'QUANTITY SOLD', margin + 95, y + 3.8);
    doc.text(isSw ? 'MAPATO YALIYOPATIKANA' : 'REVENUE GENERATED', pageWidth - margin - 3, y + 3.8, { align: 'right' });
    y += 5.5;

    data.topProducts.slice(0, 5).forEach((p, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 5, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${idx + 1}. ${p.name}`, margin + 3, y + 3.5);
      doc.text(`${p.qtySold.toLocaleString()} ${isSw ? 'pcs' : 'units'}`, margin + 95, y + 3.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${data.currencySymbol} ${p.revenueGained.toLocaleString()}`, pageWidth - margin - 3, y + 3.5, { align: 'right' });
      y += 5;
    });

    y += 4;
  }

  // --- 5. DAILY AGGREGATED SUMMARY (SUM UP AMOUNT YA KILA TAREHE) ---
  if (data.dailyBreakdown && data.dailyBreakdown.length > 0) {
    if (y + 35 > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
      isSw 
        ? `MUHTASARI WA JUMLA YA MAUZO KWA KILA TAREHE (${data.dailyBreakdown.length} SIKU)`
        : `DAILY AGGREGATED SALES & REVENUE SUMS (${data.dailyBreakdown.length} DAYS)`,
      margin,
      y + 3
    );
    y += 5;

    // Daily Table Header
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(255, 255, 255);

    const dCol = {
      date: 45,
      count: 22,
      cash: 26,
      mobile: 26,
      total: 35,
      profit: 28
    };

    let dyX = margin + 2;
    doc.text(isSw ? 'TAREHE HUSIKA' : 'DATE', dyX, y + 3.8);
    dyX += dCol.date;
    doc.text(isSw ? 'MIAMALA' : 'TXNS', dyX, y + 3.8);
    dyX += dCol.count;
    doc.text(isSw ? 'TASLIMU' : 'CASH', dyX, y + 3.8);
    dyX += dCol.cash;
    doc.text(isSw ? 'SIMU / M-PESA' : 'MOBILE', dyX, y + 3.8);
    dyX += dCol.mobile;
    doc.text(isSw ? 'JUMLA YA SIKU (TZS)' : 'DAILY TOTAL', dyX, y + 3.8);
    dyX += dCol.total;
    doc.text(isSw ? 'FAIDA HALISI' : 'NET PROFIT', pageWidth - margin - 2, y + 3.8, { align: 'right' });

    y += 5.5;

    data.dailyBreakdown.forEach((day, dIdx) => {
      if (y + 6 > pageHeight - 20) {
        doc.addPage();
        y = margin;

        // Repeat Daily Header
        doc.setFillColor(79, 70, 229);
        doc.rect(margin, y, contentWidth, 5.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(255, 255, 255);

        let subDyX = margin + 2;
        doc.text(isSw ? 'TAREHE HUSIKA' : 'DATE', subDyX, y + 3.8);
        subDyX += dCol.date;
        doc.text(isSw ? 'MIAMALA' : 'TXNS', subDyX, y + 3.8);
        subDyX += dCol.count;
        doc.text(isSw ? 'TASLIMU' : 'CASH', subDyX, y + 3.8);
        subDyX += dCol.cash;
        doc.text(isSw ? 'SIMU / M-PESA' : 'MOBILE', subDyX, y + 3.8);
        subDyX += dCol.mobile;
        doc.text(isSw ? 'JUMLA YA SIKU (TZS)' : 'DAILY TOTAL', subDyX, y + 3.8);
        subDyX += dCol.total;
        doc.text(isSw ? 'FAIDA HALISI' : 'NET PROFIT', pageWidth - margin - 2, y + 3.8, { align: 'right' });
        y += 5.5;
      }

      if (dIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(30, 41, 59);

      let rX = margin + 2;
      doc.text(day.formattedDate || day.dateStr, rX, y + 3.5);
      rX += dCol.date;
      doc.text(`${day.transactionCount} ${isSw ? 'risiti' : 'txns'}`, rX, y + 3.5);
      rX += dCol.count;
      doc.text(`${data.currencySymbol} ${day.cashSales.toLocaleString()}`, rX, y + 3.5);
      rX += dCol.cash;
      doc.text(`${data.currencySymbol} ${day.mobileSales.toLocaleString()}`, rX, y + 3.5);
      rX += dCol.mobile;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(`${data.currencySymbol} ${day.totalSales.toLocaleString()}`, rX, y + 3.5);
      rX += dCol.total;
      doc.setTextColor(16, 185, 129);
      doc.text(`+${data.currencySymbol} ${day.netProfit.toLocaleString()}`, pageWidth - margin - 2, y + 3.5, { align: 'right' });

      y += 5;
    });

    // Daily Grand Total Row
    doc.setFillColor(238, 242, 255);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 27, 75);
    doc.text(isSw ? 'JUMLA KUU YA SIKU ZOTE:' : 'TOTAL FOR ALL DAYS:', margin + 2, y + 3.8);
    
    const sumAllDailyTotal = data.dailyBreakdown.reduce((sum, d) => sum + d.totalSales, 0);
    const sumAllDailyProfit = data.dailyBreakdown.reduce((sum, d) => sum + d.netProfit, 0);
    doc.setTextColor(79, 70, 229);
    doc.text(`${data.currencySymbol} ${sumAllDailyTotal.toLocaleString()}`, margin + 2 + dCol.date + dCol.count + dCol.cash + dCol.mobile, y + 3.8);
    doc.setTextColor(16, 185, 129);
    doc.text(`+${data.currencySymbol} ${sumAllDailyProfit.toLocaleString()}`, pageWidth - margin - 2, y + 3.8, { align: 'right' });

    y += 7;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      isSw 
        ? '* Miamala ya madeni haijumuishwi kwenye mauzo ya siku hadi pale deni litakapolipwa au kupunguzwa. Marejesho ya madeni yanasawazishwa moja kwa moja kwenye mauzo ya tarehe ya malipo.' 
        : '* Credit sales are excluded from daily revenue until paid/reduced. Debt repayments sync directly to sales on the date payment is recorded.',
      margin + 2,
      y
    );
    y += 5;
  }

  // --- 6. ITEMIZED TRANSACTIONS SAMPLE / LEDGER ---
  if (y + 25 > pageHeight - 20) {
    doc.addPage();
    y = margin;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    isSw 
      ? `ORODHA YA MIAMALA YA KIPINDI HIKI (${data.transactions.length} MIAMALA)`
      : `TRANSACTION LEDGER FOR THIS PERIOD (${data.transactions.length} TRANSACTIONS)`,
    margin,
    y + 3
  );
  y += 5;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);

  const colW = {
    receipt: 26,
    date: 34,
    cashier: 26,
    method: 26,
    items: 20,
    total: 30
  };

  let txX = margin + 2;
  doc.text(isSw ? 'NAMBA YA RISITI' : 'RECEIPT NO', txX, y + 3.8);
  txX += colW.receipt;
  doc.text(isSw ? 'TAREHE NA MUDA' : 'DATE & TIME', txX, y + 3.8);
  txX += colW.date;
  doc.text(isSw ? 'KESHIA' : 'CASHIER', txX, y + 3.8);
  txX += colW.cashier;
  doc.text(isSw ? 'NJIA YA MALIPO' : 'PAYMENT METHOD', txX, y + 3.8);
  txX += colW.method;
  doc.text(isSw ? 'BIDHAA' : 'ITEMS', txX, y + 3.8);
  txX += colW.items;
  doc.text(isSw ? 'KIASI (TZS)' : 'AMOUNT', pageWidth - margin - 2, y + 3.8, { align: 'right' });

  y += 5.5;

  // Render transactions (with page breaking if needed)
  const maxTxToShow = Math.min(data.transactions.length, 30);
  data.transactions.slice(0, maxTxToShow).forEach((tx, idx) => {
    if (y + 6 > pageHeight - 20) {
      doc.addPage();
      y = margin;

      // Repeat Table Header
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, contentWidth, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);

      let subX = margin + 2;
      doc.text(isSw ? 'NAMBA YA RISITI' : 'RECEIPT NO', subX, y + 3.8);
      subX += colW.receipt;
      doc.text(isSw ? 'TAREHE NA MUDA' : 'DATE & TIME', subX, y + 3.8);
      subX += colW.date;
      doc.text(isSw ? 'KESHIA' : 'CASHIER', subX, y + 3.8);
      subX += colW.cashier;
      doc.text(isSw ? 'NJIA YA MALIPO' : 'PAYMENT METHOD', subX, y + 3.8);
      subX += colW.method;
      doc.text(isSw ? 'BIDHAA' : 'ITEMS', subX, y + 3.8);
      subX += colW.items;
      doc.text(isSw ? 'KIASI (TZS)' : 'AMOUNT', pageWidth - margin - 2, y + 3.8, { align: 'right' });
      y += 5.5;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85);

    let rowX = margin + 2;
    doc.text(tx.receiptNumber, rowX, y + 3.5);

    rowX += colW.receipt;
    const formattedDate = new Date(tx.timestamp).toLocaleString(isSw ? 'sw-TZ' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(formattedDate, rowX, y + 3.5);

    rowX += colW.date;
    doc.text(tx.cashierName || 'Admin', rowX, y + 3.5);

    rowX += colW.cashier;
    doc.text(tx.paymentMethod, rowX, y + 3.5);

    rowX += colW.method;
    doc.text(`${tx.itemsCount} ${isSw ? 'vitu' : 'items'}`, rowX, y + 3.5);

    rowX += colW.items;
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.currencySymbol} ${tx.total.toLocaleString()}`, pageWidth - margin - 2, y + 3.5, { align: 'right' });

    y += 5;
  });

  if (data.transactions.length > maxTxToShow) {
    y += 2;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      isSw 
        ? `...na miamala mingine ${data.transactions.length - maxTxToShow} (Pakua faili la Excel/CSV ili kuona data kamili bila kikomo).`
        : `...and ${data.transactions.length - maxTxToShow} additional transactions (Download Excel/CSV for complete dataset).`,
      margin + 2,
      y + 3
    );
    y += 6;
  }

  // --- FOOTERS & PAGE NUMBERS ---
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `LedgerBox POS & Store • ${data.periodTitle} • ${data.storeName}`,
      margin,
      pageHeight - 9
    );

    doc.text(
      `${isSw ? 'Ukurasa' : 'Page'} ${i} ${isSw ? 'wa' : 'of'} ${pageCount}`,
      pageWidth - margin,
      pageHeight - 9,
      { align: 'right' }
    );
  }

  const sanitizedStore = (data.storeName || 'LedgerBox').replace(/[^a-zA-Z0-9]/g, '_');
  const sanitizedPeriod = data.periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${sanitizedStore}_${sanitizedPeriod}_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Exports complete transactions list to CSV / Excel readable file
 */
export function exportTransactionsToCsv(
  transactions: Array<{
    receiptNumber: string;
    timestamp: string;
    cashierName: string;
    paymentMethod: string;
    itemsSummary: string;
    subtotal: number;
    discount: number;
    total: number;
    customerName?: string;
  }>,
  storeName: string,
  periodName: string
): void {
  const headers = [
    'Namba ya Risiti (Receipt No)',
    'Tarehe & Muda (Timestamp)',
    'Keshia (Cashier)',
    'Mteja (Customer)',
    'Njia ya Malipo (Payment Method)',
    'Muhtasari wa Bidhaa (Items)',
    'Jumla Ndogo (Subtotal)',
    'Punguzo (Discount)',
    'Jumla Kuu (Total Amount)'
  ];

  const rows = transactions.map(t => [
    `"${t.receiptNumber}"`,
    `"${new Date(t.timestamp).toLocaleString('sw-TZ')}"`,
    `"${t.cashierName || 'Admin'}"`,
    `"${t.customerName || '-'}"`,
    `"${t.paymentMethod}"`,
    `"${(t.itemsSummary || '').replace(/"/g, '""')}"`,
    t.subtotal || t.total,
    t.discount || 0,
    t.total
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
    [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const sanitizedPeriod = periodName.replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `${storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Miamala_${sanitizedPeriod}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports daily aggregated date-by-date breakdown to CSV / Excel
 */
export function exportDailySummaryToCsv(
  dailyBreakdown: Array<{
    dateStr: string;
    formattedDate: string;
    transactionCount: number;
    unitsCount: number;
    cashSales: number;
    mobileSales: number;
    creditSales: number;
    totalSales: number;
    netProfit: number;
  }>,
  storeName: string,
  periodName: string
): void {
  const headers = [
    'Tarehe (Date)',
    'Tarehe Iliyosomwa (Formatted Date)',
    'Idadi ya Miamala (Txn Count)',
    'Idadi ya Vipande (Units Sold)',
    'Mauzo ya Taslimu (Cash Sales)',
    'Mauzo ya Simu/Mitandao (Mobile Sales)',
    'Mauzo ya Mkopo (Credit Sales)',
    'Jumla ya Mauzo ya Siku (Daily Total Sales)',
    'Faida Halisi ya Siku (Daily Net Profit)'
  ];

  const rows = dailyBreakdown.map(d => [
    `"${d.dateStr}"`,
    `"${d.formattedDate}"`,
    d.transactionCount,
    d.unitsCount,
    d.cashSales,
    d.mobileSales,
    d.creditSales,
    d.totalSales,
    d.netProfit
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
    [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const sanitizedPeriod = periodName.replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `${storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Mauzo_Ya_Kila_Tarehe_${sanitizedPeriod}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports itemized list of items sold on credit (Vitu Vilivyouzwa kwa Mkopo) to CSV / Excel
 */
export function exportCreditItemsToCsv(
  creditItems: Array<{
    receiptNumber: string;
    timestamp: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    totalItemValue: number;
    customerName: string;
    customerPhone: string;
    cashierName: string;
    dueDate?: string;
    status: string;
    downPayment: number;
    unpaidDebtPortion: number;
  }>,
  storeName: string,
  periodName: string
): void {
  const headers = [
    'Namba ya Risiti (Receipt No)',
    'Tarehe & Muda (Timestamp)',
    'Jina la Bidhaa (Product)',
    'Idadi (Quantity)',
    'Bei ya Kipande (Unit Price)',
    'Gharama ya Kununulia (Cost Price)',
    'Thamani ya Mkopo (Item Credit Value)',
    'Mteja (Customer)',
    'Simu ya Mteja (Customer Phone)',
    'Keshia (Cashier)',
    'Malipo ya Awali (Down Payment)',
    'Salio Linalodaiwa (Unpaid Portion)',
    'Tarehe ya Marejesho (Due Date)',
    'Hali ya Deni (Debt Status)'
  ];

  const rows = creditItems.map(item => [
    `"${item.receiptNumber}"`,
    `"${new Date(item.timestamp).toLocaleString('sw-TZ')}"`,
    `"${(item.productName || '').replace(/"/g, '""')}"`,
    item.quantity,
    item.unitPrice,
    item.costPrice,
    item.totalItemValue,
    `"${(item.customerName || '-').replace(/"/g, '""')}"`,
    `"${item.customerPhone || '-'}"`,
    `"${item.cashierName || 'Admin'}"`,
    item.downPayment,
    item.unpaidDebtPortion,
    `"${item.dueDate || '-'}"`,
    `"${item.status}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
    [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const sanitizedPeriod = periodName.replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `${storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Vitu_Vilivyouzwa_Kwa_Mkopo_${sanitizedPeriod}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


