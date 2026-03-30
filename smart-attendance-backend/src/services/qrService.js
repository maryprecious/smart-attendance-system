const crypto = require("crypto");
const QRCode = require("qrcode");

class QRService {
  static generateEncryptedQRPayload(data, encryptionKey) {
    try {
      const jsonString = JSON.stringify(data);
      const cipher = crypto.createCipher("aes-256-cbc", encryptionKey);
      let encrypted = cipher.update(jsonString, "utf8", "hex");
      encrypted += cipher.final("hex");
      return encrypted;
    } catch (err) {
      console.error("QR encryption error:", err);
      throw new Error("Failed to encrypt QR data");
    }
  }

  static decryptQRPayload(encryptedPayload, encryptionKey) {
    try {
      const decipher = crypto.createDecipher("aes-256-cbc", encryptionKey);
      let decrypted = decipher.update(encryptedPayload, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return JSON.parse(decrypted);
    } catch (err) {
      console.error("QR decryption error:", err);
      throw new Error("Failed to decrypt QR data");
    }
  }

  static async generateQRImage(payload) {
    try {
      const qrCode = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 300,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      return qrCode;
    } catch (err) {
      console.error("QR image generation error:", err);
      throw new Error("Failed to generate QR image");
    }
  }

  static async generateQRString(payload) {
    try {
      const qrCode = await QRCode.toString(payload, {
        errorCorrectionLevel: "H",
        type: "terminal",
      });
      return qrCode;
    } catch (err) {
      console.error("QR string generation error:", err);
      throw new Error("Failed to generate QR string");
    }
  }

  static calculateExpiry(expiryMinutes = 15) {
    return new Date(Date.now() + expiryMinutes * 60 * 1000);
  }

  static isExpired(expiryTime) {
    return new Date() > new Date(expiryTime);
  }

  static generateSessionId() {
    return `QR_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  }

  static generateRegenerationToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  static validatePayloadStructure(payload) {
    const required = ["sessionId", "createdAt", "expiresAt"];
    return required.every((field) => field in payload);
  }

  static async generateCompleteQRSession(
    qrSessionId,
    createdBy,
    expiryMinutes = 15,
    encryptionKey,
  ) {
    try {
      const now = new Date();
      const expiresAt = this.calculateExpiry(expiryMinutes);
      const regenerationToken = this.generateRegenerationToken();

      const payload = {
        sessionId: qrSessionId,
        createdBy,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        token: regenerationToken,
      };

      const encryptedPayload = this.generateEncryptedQRPayload(
        payload,
        encryptionKey,
      );

      const qrImage = await this.generateQRImage(encryptedPayload);

      return {
        success: true,
        sessionId: qrSessionId,
        qrData: encryptedPayload,
        qrImage,
        expiresAt,
        regenerationToken,
        payload,
      };
    } catch (err) {
      console.error("Complete QR session generation error:", err);
      throw err;
    }
  }
}

module.exports = QRService;
