import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Derive 32-byte key from environment secret via SHA-256 hashing
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || 'default_hrms_super_secure_encryption_key_32_bytes_long';
  return crypto.createHash('sha256').update(secret).digest();
};

// Encrypt string or numeric data
export const encrypt = (text: string | number | undefined | null): string => {
  if (text === undefined || text === null) return '';
  const textStr = String(text);
  if (textStr.trim() === '') return '';

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // 16-byte initialization vector
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(textStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return combination of iv and encrypted text to permit decryption
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return textStr;
  }
};

// Decrypt encrypted payload
export const decrypt = (encryptedValue: string | undefined | null): string => {
  if (!encryptedValue || !encryptedValue.includes(':')) {
    return encryptedValue || '';
  }

  try {
    const [ivHex, encryptedText] = encryptedValue.split(':');
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex || '', 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText || '', 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Return the value as is if decryption fails (e.g. legacy cleartext records)
    return encryptedValue;
  }
};
