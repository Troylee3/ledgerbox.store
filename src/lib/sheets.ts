import { Transaction, StoreSettings } from '../types';

/**
 * Creates a new Google Spreadsheet and returns its ID.
 */
export async function createSpreadsheet(accessToken: string, title: string): Promise<string> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const data = await response.json();
  return data.spreadsheetId;
}

/**
 * Appends a list of transaction rows to a Google Spreadsheet.
 */
export async function appendTransactionsToSheet(
  accessToken: string,
  spreadsheetId: string,
  transactions: Transaction[],
  settings: StoreSettings
): Promise<void> {
  // 1. First check if we need to initialize headers (read Sheet1!A1:B1)
  let hasHeaders = false;
  try {
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:B1`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.values && checkData.values.length > 0) {
        hasHeaders = true;
      }
    }
  } catch (err) {
    console.warn("Could not check headers, assuming not initialized", err);
  }

  // 2. Prepare headers if not present
  const rowsToAppend: any[][] = [];
  if (!hasHeaders) {
    rowsToAppend.push([
      "Receipt Number",
      "Timestamp / Date",
      "Cashier Name",
      "Items",
      "Subtotal",
      "Discount",
      "Total Amount",
      "Payment Method"
    ]);
  }

  // 3. Format transaction data
  transactions.forEach((tx) => {
    const itemsStr = tx.items
      .map((item) => `${item.product.name} (x${item.quantity})`)
      .join(', ');

    rowsToAppend.push([
      tx.receiptNumber,
      new Date(tx.timestamp).toLocaleString(),
      tx.cashierName,
      itemsStr,
      tx.subtotal,
      tx.discount,
      tx.total,
      tx.paymentMethod
    ]);
  });

  if (rowsToAppend.length === 0) return;

  // 4. Append to spreadsheet
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:H:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rowsToAppend
      })
    }
  );

  if (!appendRes.ok) {
    const errText = await appendRes.text();
    throw new Error(`Failed to append rows to spreadsheet: ${errText}`);
  }
}
