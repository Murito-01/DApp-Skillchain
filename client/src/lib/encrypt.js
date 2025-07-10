import CryptoJS from "crypto-js";
import { v4 as uuidv4 } from "uuid";

// Generate random 256-bit key dan 128-bit IV
export function generateRandomKeyIv() {
  const key = CryptoJS.lib.WordArray.random(32); // 256 bit
  const iv = CryptoJS.lib.WordArray.random(16); // 128 bit
  return { key, iv };
}

// Enkripsi data (string/JSON) dengan AES-256
export function encryptData(data, key, iv) {
  const plaintext = typeof data === "string" ? data : JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, { iv }).toString();
  return encrypted;
}

// Dekripsi data terenkripsi (base64 string) dengan AES-256
export function decryptData(encrypted, key, iv) {
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, { iv });
  const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
  return plaintext;
}

// Dekripsi file terenkripsi (PDF/JPG/PNG) dari IPFS
export function decryptFileFromIPFS(encrypted, keyHex, ivHex) {
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const decrypted = decryptData(encrypted, key, iv);
  // hasil decrypted = base64 string
  // konversi ke Uint8Array
  const binaryString = atob(decrypted);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Generate random filename (uuid + .enc)
export function generateRandomFilename() {
  return uuidv4() + ".enc";
}

// Key dan IV global (hex string, 32 byte untuk key, 16 byte untuk IV)
const GLOBAL_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 hex = 32 byte
const GLOBAL_IV = "abcdef9876543210abcdef9876543210"; // 32 hex = 16 byte

export function getOrCreateAesKeyIv() {
  return {
    key: CryptoJS.enc.Hex.parse(GLOBAL_KEY),
    iv: CryptoJS.enc.Hex.parse(GLOBAL_IV),
    keyHex: GLOBAL_KEY,
    ivHex: GLOBAL_IV,
  };
} 