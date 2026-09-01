import { google } from "googleapis";
import { ExtractedBookkeepingData } from "./parserService.js";

/**
 * Appends the extracted financial receipt transaction data directly to a Google Sheet.
 * If the sheet is completely empty, it first appends a stylized header row.
 * 
 * @param data The structured ledger entry
 * @param senderPhone The phone number of the WhatsApp user who sent the receipt
 */
export async function logToGoogleSheets(
  data: ExtractedBookkeepingData,
  senderPhone: string
): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!spreadsheetId || !email || !privateKey) {
    console.warn("Google Sheets environment variables are missing. Logging row to console instead.");
    console.log("Bookkeeping Data row would be added for sender:", senderPhone, data);
    return;
  }

  // Format private key properly to handle literal newline characters
  const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: formattedPrivateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // Range targeting (handles Sheet1 or Sheet 1)
  const primaryRange = "Sheet1!A:H";
  const fallbackRange = "Sheet 1!A:H";

  // Prepare line items summary string for the cell
  const itemsSummary = data.lineItems
    ? data.lineItems.map((item) => `${item.description} (x${item.quantity}) - ${item.price}`).join("; ")
    : "No items listed";

  const timestamp = new Date().toISOString();
  const tarehe = data.date || new Date().toISOString().split('T')[0];
  const muuzaji = data.merchantName || "Unknown Merchant";
  const kiasi = data.totalAmount || 0;
  const namba_risiti = (data as any).receiptNumber || `REC-${Date.now()}`;
  const ujumbe = itemsSummary;

  // New row structure aligned with user's structure: [tarehe, muuzaji, kiasi, namba_risiti, ujumbe, currency, senderPhone, timestamp]
  const rowValue = [
    tarehe,
    muuzaji,
    kiasi,
    namba_risiti,
    ujumbe,
    data.currency || "TZS",
    senderPhone,
    timestamp
  ];

  let targetRange = primaryRange;

  try {
    // Check if sheet has rows or headers
    let hasRows = false;
    try {
      const sheetInfo = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Sheet1!A1:B1",
      });
      hasRows = !!(sheetInfo.data.values && sheetInfo.data.values.length > 0);
    } catch {
      try {
        const altInfo = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "Sheet 1!A1:B1",
        });
        hasRows = !!(altInfo.data.values && altInfo.data.values.length > 0);
        targetRange = fallbackRange;
      } catch {
        hasRows = false;
      }
    }

    if (!hasRows) {
      // Add headers automatically if tab is empty
      const headerRow = [
        "Tarehe",
        "Muuzaji / Merchant",
        "Kiasi / Total Amount",
        "Namba ya Risiti",
        "Ujumbe / Bidhaa",
        "Mataji / Currency",
        "Simu ya Mteja (WhatsApp)",
        "Muda wa Kuandikwa (Timestamp)"
      ];

      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: targetRange,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: {
            values: [headerRow]
          },
        });
      } catch (e) {
        console.warn("Could not insert headers, proceeding to append row directly:", e);
      }
    }

    // Append the transaction row directly with insertDataOption: 'INSERT_ROWS'
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: targetRange,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [rowValue]
      },
    });

    console.log(`Successfully logged transaction from ${senderPhone} to Google Sheets (${targetRange})!`);
  } catch (error) {
    console.error("Failed to append ledger entry to Google Sheets API:", error);
    throw new Error(`Google Sheets logging failed: ${(error as Error).message}`);
  }
}
