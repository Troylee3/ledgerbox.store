/**
 * Service to handle downloading media files and sending template/text messages
 * using the Meta WhatsApp Cloud API.
 */

interface WhatsAppMediaResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
  messaging_product: string;
}

/**
 * Downloads binary media (Receipt image or document PDF) from the Meta WhatsApp Cloud API using Media ID.
 * 
 * @param mediaId Meta media identifier
 * @returns Object with Buffer of content and its standard MIME type
 */
export async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!token) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is missing in environment variables.");
  }

  // Step 1: Retrieve the download URL and MIME type from Meta Graph API
  const metaUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
  
  const response = await fetch(metaUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to retrieve media metadata from Meta: ${response.status} - ${errorText}`);
  }

  const mediaMetadata = (await response.json()) as WhatsAppMediaResponse;
  const downloadUrl = mediaMetadata.url;
  const mimeType = mediaMetadata.mime_type;

  if (!downloadUrl) {
    throw new Error(`No download URL returned from WhatsApp media metadata for id ${mediaId}`);
  }

  // Step 2: Download the actual file buffer from Meta CDN
  const fileResponse = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!fileResponse.ok) {
    throw new Error(`Failed to download binary payload from Meta CDN: ${fileResponse.statusText}`);
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer, mimeType };
}

/**
 * Sends a standard WhatsApp Text Message back to the customer.
 * 
 * @param toPhone Recipient phone number (fully qualified with country code, e.g. "255765432100")
 * @param messageBody Text content to send
 */
export async function sendWhatsAppMessage(
  toPhone: string,
  messageBody: string,
  overrideToken?: string,
  overridePhoneNumberId?: string
): Promise<void> {
  const token = overrideToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = overridePhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_CREDENTIALS_MISSING: Meta WhatsApp Access Token or Phone Number ID is missing.");
  }

  const postUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toPhone,
    type: "text",
    text: {
      preview_url: false,
      body: messageBody,
    },
  };

  const response = await fetch(postUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || errorText.includes('OAuthException') || errorText.includes('190') || errorText.includes('Authentication Error')) {
      console.info(`[WhatsApp API] Meta Access Token is unconfigured or expired (${response.status}). Direct wa.me fallback will be used.`);
      throw new Error(`Meta WhatsApp Token Expired (401). Please update WHATSAPP_ACCESS_TOKEN if direct Meta API dispatch is desired.`);
    }
    console.warn(`[WhatsApp API] Send message failed: ${response.status} - ${errorText}`);
    throw new Error(`WhatsApp API send failed: ${errorText}`);
  }

  console.log(`Successfully sent WhatsApp message to ${toPhone}`);
}
