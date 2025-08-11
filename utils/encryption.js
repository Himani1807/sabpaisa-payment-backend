const crypto = require('crypto');

class SabPaisaEncryption {
  static encrypt(authKey, authIV, plainText) {
    try {
      // Use createCipheriv with proper key and IV
      const key = Buffer.from(authKey.padEnd(16, '0').substring(0, 16), 'utf8');
      const iv = Buffer.from(authIV.padEnd(16, '0').substring(0, 16), 'utf8');
      
      const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
      cipher.setAutoPadding(true);
      let encrypted = cipher.update(plainText, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  static decrypt(authKey, authIV, encryptedText) {
    try {
      // Use createDecipheriv with proper key and IV
      const key = Buffer.from(authKey.padEnd(16, '0').substring(0, 16), 'utf8');
      const iv = Buffer.from(authIV.padEnd(16, '0').substring(0, 16), 'utf8');
      
      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
      decipher.setAutoPadding(true);
      let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
}

module.exports = SabPaisaEncryption;