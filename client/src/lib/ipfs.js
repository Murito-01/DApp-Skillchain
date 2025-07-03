import { NFTStorage, File } from 'nft.storage';
import Ajv from 'ajv';

function getAccessToken() {
  // Ambil token dari environment variable Vite
  const token = import.meta.env.VITE_WEB3STORAGE_TOKEN;
  if (!token) {
    throw new Error("❌ Token Web3Storage tidak ditemukan di .env. Pastikan VITE_WEB3STORAGE_TOKEN sudah diatur.");
  }
  return token;
}

function makeStorageClient() {
  return new Web3Storage({ token: getAccessToken() });
}

/**
 * Mengunggah objek JSON ke IPFS melalui Web3.Storage
 * @param {Object} objData - Data JSON yang ingin diunggah
 * @param {string} fileName - Nama file JSON yang dihasilkan
 * @returns {Promise<string>} CID dari file yang diunggah
 */
export async function uploadJSONToIPFS(objData, fileName = "metadata-peserta.json") {
  try {
    console.log("📦 Data yang akan diupload:", objData);
    
    // Konversi objek JavaScript ke JSON string
    const jsonString = JSON.stringify(objData, null, 2);

    // Bungkus ke dalam file .json dengan MIME type yang sesuai
    const file = new File([jsonString], fileName, { type: "application/json" });

    console.log("📦 Uploading file to IPFS:", file);

    // Upload ke Web3.Storage
    const client = makeStorageClient();
    const cid = await client.put([file]);

    console.log("✅ Upload berhasil. CID:", cid);
    return cid;
  } catch (error) {
    console.error("❌ Gagal upload ke IPFS:", error);
    throw new Error("Upload ke IPFS gagal.");
  }
}

// Load schema (misal dari public/metadata-peserta.schema.json)
const schema = await fetch('/metadata-peserta.schema.json').then(res => res.json());
const ajv = new Ajv();
const validate = ajv.compile(schema);

const formData = { ... }; // data dari form
if (!validate(formData)) {
  alert('Data tidak valid: ' + ajv.errorsText(validate.errors));
  return;
}

// Generate file JSON
const jsonString = JSON.stringify(formData, null, 2);
const file = new File([jsonString], 'metadata-peserta.json', { type: 'application/json' });

// Upload ke IPFS via NFT.Storage
const client = new NFTStorage({ token: 'ISI_TOKEN_NFT_STORAGE' });
const cid = await client.storeBlob(file); // storeBlob untuk file kecil/metadata

console.log('✅ CID:', cid);
// Lanjutkan proses smart contract...