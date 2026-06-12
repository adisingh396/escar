import { createHmac, timingSafeEqual } from "crypto";
import type { SignatureProvider } from "@escar/shared";

interface SignatureResult {
  provider: SignatureProvider;
  valid: boolean;
}

// Detect provider from headers
function detectProvider(headers: Record<string, string>): SignatureProvider | null {
  const headerKeys = Object.keys(headers).map((k) => k.toLowerCase());

  if (headerKeys.includes("stripe-signature")) {
    return "stripe";
  }
  if (headerKeys.includes("x-hub-signature-256")) {
    return "github";
  }
  if (headerKeys.includes("x-shopify-hmac-sha256")) {
    return "shopify";
  }
  if (headerKeys.includes("x-slack-signature")) {
    return "slack";
  }
  if (headerKeys.includes("x-twilio-signature")) {
    return "twilio";
  }

  return null;
}

// Get header value case-insensitively
function getHeader(headers: Record<string, string>, name: string): string | undefined {
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  return undefined;
}

// Validate Stripe signature
// Format: t=timestamp,v1=signature
function validateStripe(
  body: string,
  secret: string,
  signatureHeader: string
): boolean {
  try {
    const parts = signatureHeader.split(",");
    let timestamp = "";
    let signature = "";

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key === "t") timestamp = value;
      if (key === "v1") signature = value;
    }

    if (!timestamp || !signature) return false;

    const payload = `${timestamp}.${body}`;
    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// Validate GitHub signature
// Format: sha256=signature
function validateGitHub(
  body: string,
  secret: string,
  signatureHeader: string
): boolean {
  try {
    if (!signatureHeader.startsWith("sha256=")) return false;

    const signature = signatureHeader.slice(7);
    const expectedSignature = createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// Validate Shopify signature
// Base64 encoded HMAC-SHA256
function validateShopify(
  body: string,
  secret: string,
  signatureHeader: string
): boolean {
  try {
    const expectedSignature = createHmac("sha256", secret)
      .update(body)
      .digest("base64");

    return timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// Validate Slack signature
// Format: v0=signature
function validateSlack(
  body: string,
  secret: string,
  signatureHeader: string,
  headers: Record<string, string>
): boolean {
  try {
    if (!signatureHeader.startsWith("v0=")) return false;

    const timestamp = getHeader(headers, "x-slack-request-timestamp");
    if (!timestamp) return false;

    const signature = signatureHeader.slice(3);
    const baseString = `v0:${timestamp}:${body}`;
    const expectedSignature = createHmac("sha256", secret)
      .update(baseString)
      .digest("hex");

    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// Validate Twilio signature
// Base64 encoded HMAC-SHA1
function validateTwilio(
  url: string,
  params: Record<string, string>,
  secret: string,
  signatureHeader: string
): boolean {
  try {
    // Twilio signature is based on URL + sorted params
    let data = url;
    const sortedKeys = Object.keys(params).sort();
    for (const key of sortedKeys) {
      data += key + params[key];
    }

    const expectedSignature = createHmac("sha1", secret)
      .update(data)
      .digest("base64");

    return timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export function validateSignature(
  headers: Record<string, string>,
  body: string,
  secret: string,
  requestUrl?: string
): SignatureResult | null {
  const provider = detectProvider(headers);

  if (!provider) {
    return null;
  }

  let valid = false;

  switch (provider) {
    case "stripe": {
      const sig = getHeader(headers, "stripe-signature");
      if (sig) valid = validateStripe(body, secret, sig);
      break;
    }
    case "github": {
      const sig = getHeader(headers, "x-hub-signature-256");
      if (sig) valid = validateGitHub(body, secret, sig);
      break;
    }
    case "shopify": {
      const sig = getHeader(headers, "x-shopify-hmac-sha256");
      if (sig) valid = validateShopify(body, secret, sig);
      break;
    }
    case "slack": {
      const sig = getHeader(headers, "x-slack-signature");
      if (sig) valid = validateSlack(body, secret, sig, headers);
      break;
    }
    case "twilio": {
      const sig = getHeader(headers, "x-twilio-signature");
      if (sig && requestUrl) {
        // For Twilio, we need to parse body as form params
        try {
          const params: Record<string, string> = {};
          const searchParams = new URLSearchParams(body);
          for (const [key, value] of searchParams) {
            params[key] = value;
          }
          valid = validateTwilio(requestUrl, params, secret, sig);
        } catch {
          valid = false;
        }
      }
      break;
    }
  }

  return { provider, valid };
}
