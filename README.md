# Skillchain - Sistem Sertifikasi Kompetensi Berbasis Blockchain 🎓⛓️

Skillchain adalah sebuah Decentralized Application (dApp) yang dibangun untuk mengelola dan memverifikasi sertifikasi kompetensi profesional secara transparan, aman, dan terdesentralisasi. Sistem ini melibatkan beberapa aktor utama seperti Badan Nasional Sertifikasi Profesi (BNSP), Lembaga Sertifikasi Profesi (LSP), dan peserta sertifikasi.

## 🌟 Fitur Utama

- **Manajemen Institusi (BNSP & LSP)**
  - Otoritas tertinggi dipegang oleh BNSP (Deployer Kontrak).
  - Pendaftaran dan verifikasi LSP terakreditasi oleh BNSP.
  - Dashboard khusus untuk pemantauan dan pengelolaan.
  
- **Manajemen Peserta & Sertifikasi**
  - Pendaftaran peserta pelatihan dan sertifikasi kompetensi.
  - LSP dapat mengelola data peserta dan menerbitkan kelulusan/sertifikat.
  - Penyimpanan metadata sertifikat secara terdesentralisasi menggunakan IPFS (Web3.Storage / NFT.Storage).

- **Verifikasi Publik**
  - Siapa saja (publik) dapat melakukan verifikasi keaslian sertifikat langsung ke blockchain tanpa perlu login.
  - Memastikan data sertifikasi tidak dapat diubah (Immutable) dan terverifikasi secara on-chain.

## 🛠️ Teknologi yang Digunakan

### Smart Contract / Backend
- **Solidity (^0.8.28)**: Bahasa pemrograman untuk penulisan Smart Contract.
- **Hardhat**: Environment untuk kompilasi, testing, dan deployment Smart Contract.
- **Ethers.js**: Library untuk interaksi dengan Ethereum Virtual Machine (EVM).

### Frontend / Client
- **React (^19)**: Library utama untuk membangun antarmuka pengguna (UI).
- **Vite**: Build tool yang cepat untuk React.
- **React Router DOM**: Navigasi halaman pada dApp.
- **Web3.Storage / NFT.Storage**: Penyimpanan file/metadata ke jaringan IPFS.

## 📂 Struktur Proyek

```
skillchain/
├── contracts/          # Smart Contracts (MainContract, BNSP, LSP, Peserta, dll)
├── scripts/            # Script deployment (deploy.js)
├── test/               # Script pengujian Smart Contract
├── client/
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── contexts/   # React Context (contoh: WalletContext)
│   │   ├── pages/      # Halaman aplikasi (Dashboard BNSP, LSP, Peserta, Verifikasi)
│   │   └── abi/        # File ABI hasil kompilasi Smart Contract
│   └── package.json    # Dependencies frontend
└── hardhat.config.js   # Konfigurasi Hardhat
```

## 🚀 Panduan Instalasi dan Setup

### Prasyarat Asumsi
- Node.js (direkomendasikan v18+).
- Ekstensi Wallet di browser (contoh: MetaMask).

### 1. Kloning Repositori & Instalasi
Instal dependencies untuk Smart Contract di folder root:
```bash
git clone https://github.com/username_anda/skillchain.git
cd skillchain
npm install
```

### 2. Kompilasi & Deploy Smart Contract
- Lakukan kompilasi untuk memastikan kontrak berjalan tanpa error:
```bash
npx hardhat compile
```
- Jalankan node Hardhat lokal:
```bash
npx hardhat node
```
- Deploy kontrak utama ke local node (tambahkan flag network yang dibutuhkan jika mendeploy ke testnet/mainnet):
```bash
npx hardhat run scripts/deploy.js --network localhost
```
- *(Opsional)* Jika menggunakan task integrasi ABI yang sudah disediakan di `hardhat.config.js`:
```bash
npx hardhat export-abi
```

### 3. Setup Frontend
Buka terminal baru, masuk ke direktori frontend dan instal dependensi:
```bash
cd client
npm install
```
Jika diatur, buat file `.env` di folder `client` untuk memasukkan `VITE_CONTRACT_ADDRESS` yang didapatkan dari proses deploy.

Jalankan server pengembangan:
```bash
npm run dev
```
Aplikasi frontend akan dapat diakses melalui `http://localhost:5173`.

## 📜 Lisensi
Lisensi proyek ini menyesuaikan dengan kebijakan Anda (sebagai default, diset pada `ISC` di `package.json`).

---
✨ *Crafted for the future of decentralized certification.*
