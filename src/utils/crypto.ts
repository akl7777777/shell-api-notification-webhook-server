import crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature for webhook verification
 * This matches the signature generation in your Go implementation
 */
export function generateSignature(secret: string, payload: string | Buffer): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifySignature(secret: string, payload: string | Buffer, signature: string): boolean {
  if (!secret || !signature) {
    return false;
  }
  
  const expectedSignature = generateSignature(secret, payload);
  
  // Use crypto.timingSafeEqual to prevent timing attacks
  try {
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');
    
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Extract signature from Authorization header or X-Webhook-Signature header
 */
export function extractSignature(authHeader?: string, signatureHeader?: string): string | null {
  if (signatureHeader) {
    return signatureHeader;
  }
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In your implementation, the Authorization header contains the secret, not the signature
    // The actual signature is in X-Webhook-Signature header
    return null;
  }
  
  return null;
}
