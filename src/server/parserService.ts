import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini client lazily on the server.
// Must include the 'User-Agent': 'aistudio-build' header as specified in our development guidelines.
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export interface ExtractedBookkeepingData {
  merchantName: string;
  date: string;
  lineItems: {
    description: string;
    quantity: number;
    price: number;
  }[];
  taxAmount: number;
  totalAmount: number;
  currency: string;
}

/**
 * Parses financial document files (receipts, invoices, statements) using the Gemini 3.5 Flash API
 * with a strict JSON schema for guaranteed bookkeeping parameters.
 * 
 * @param fileBuffer Binary buffer of the receipt image or document (PDF, PNG, JPEG)
 * @param mimeType The file format MIME type (e.g., 'image/jpeg', 'image/png', 'application/pdf')
 * @returns Parsed structured data
 */
export async function parseFinancialDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedBookkeepingData> {
  const base64Data = fileBuffer.toString("base64");

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  const promptText = `
    Analyze this financial document (receipt, invoice, or statement) and extract key bookkeeping fields.
    If details are written in Kiswahili or another language, translate them clearly into accounting categories.
    Provide the output in structured JSON format with complete accuracy.
    If specific fields (like tax or individual line items) are missing, infer or calculate them or default to 0, but ensure the Total is captured correctly.
  `;

  try {
    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        imagePart,
        { text: promptText }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchantName: {
              type: Type.STRING,
              description: "The name of the vendor, store, supermarket or merchant (e.g., 'LedgerBox Supermarket').",
            },
            date: {
              type: Type.STRING,
              description: "The transaction date in YYYY-MM-DD format (infer from document or use current date if absent).",
            },
            lineItems: {
              type: Type.ARRAY,
              description: "Detailed list of bought items or services.",
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING, description: "Name of the item or service." },
                  quantity: { type: Type.NUMBER, description: "Quantity purchased." },
                  price: { type: Type.NUMBER, description: "Price per unit or subtotal for this item." },
                },
                required: ["description", "quantity", "price"],
              },
            },
            taxAmount: {
              type: Type.NUMBER,
              description: "Total tax or VAT amount. If none listed, use 0.",
            },
            totalAmount: {
              type: Type.NUMBER,
              description: "The grand total amount on the receipt.",
            },
            currency: {
              type: Type.STRING,
              description: "Three-letter currency code (e.g., 'TZS', 'USD', 'KES').",
            },
          },
          required: [
            "merchantName",
            "date",
            "lineItems",
            "taxAmount",
            "totalAmount",
            "currency",
          ],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from parsing model");
    }

    return JSON.parse(resultText) as ExtractedBookkeepingData;
  } catch (error) {
    console.error("Error during LedgerBox document parsing:", error);
    throw new Error(`OCR Parsing failed: ${(error as Error).message}`);
  }
}
