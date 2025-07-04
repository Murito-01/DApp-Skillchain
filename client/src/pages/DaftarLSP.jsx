import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import "./DaftarLSP.css";
import { useWallet } from "../contexts/WalletContext";
import { useNavigate } from "react-router-dom";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;

const STATUS_LABELS = [
  "Belum Pernah Daftar",
  "Menunggu Verifikasi BNSP",
  "Aktif (Terverifikasi)",
  "Ditolak"
];

export default function DaftarLSP() {
  const [formData, setFormData] = useState({
    nama_lsp: "",
    alamat_kantor: "",
    no_izin: "",
    email_kontak: "",
    telepon: "",
    penanggung_jawab: "",
    website: "",
  });
  const [status, setStatus] = useState("");
  const [lspStatus, setLspStatus] = useState(null); // 0: belum, 1: menunggu, 2: aktif, 3: ditolak
  const { account, isConnected, setRole } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected && account) {
      checkLSPStatus(account);
    }
    // eslint-disable-next-line
  }, [isConnected, account]);

  const checkLSPStatus = async (address) => {
    try {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      const statusOnChain = await contract.getStatusLSP(address);
      setLspStatus(Number(statusOnChain));
    } catch (err) {
      setLspStatus(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setStatus("❌ MetaMask tidak terdeteksi. Silakan install MetaMask.");
        return;
      }
      setStatus("Meminta koneksi ke MetaMask...");
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      // WalletContext akan update account & isConnected
      setStatus("");
    } catch (error) {
      setStatus("❌ Gagal terhubung ke wallet: " + error.message);
    }
  };

  const uploadToPinata = async (jsonData) => {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      throw new Error("API Key/Secret Pinata tidak ditemukan di .env");
    }
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
      body: JSON.stringify({
        pinataContent: jsonData,
      }),
    });
    if (!res.ok) throw new Error("Gagal upload ke Pinata");
    const data = await res.json();
    return data.IpfsHash;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      setStatus("❌ Silakan hubungkan wallet terlebih dahulu");
      return;
    }
    if (lspStatus === 1) {
      setStatus("❌ Anda sudah mendaftar dan sedang menunggu verifikasi BNSP.");
      return;
    }
    if (lspStatus === 2) {
      setStatus("❌ Anda sudah terverifikasi sebagai LSP.");
      return;
    }
    if (lspStatus === 3) {
      setStatus("❌ Pendaftaran Anda ditolak oleh BNSP. Silakan hubungi admin.");
      return;
    }
    setStatus("Membuat file JSON...");
    try {
      const jsonString = JSON.stringify(formData, null, 2);
      setStatus("Upload ke IPFS (Pinata)...");
      const cid = await uploadToPinata(formData);
      setStatus("Mengirim transaksi ke blockchain...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
      const tx = await contract.daftarLSP(cid);
      setStatus("Menunggu konfirmasi transaksi... Hash: " + tx.hash);
      await tx.wait();
      setStatus("Pengajuan berhasil! Data Anda sedang menunggu verifikasi dari BNSP.");
      setLspStatus(1);
      setRole("lsp");
      setFormData({
        nama_lsp: "",
        alamat_kantor: "",
        no_izin: "",
        email_kontak: "",
        telepon: "",
        penanggung_jawab: "",
        website: "",
      });
      setTimeout(() => navigate("/status"), 1000);
    } catch (err) {
      if (err.code === 4001) {
        setStatus("❌ Transaksi dibatalkan oleh user.");
      } else if (err.reason && err.reason.includes("Sudah pernah daftar")) {
        setStatus("❌ Akun sudah terdaftar");
        await checkLSPStatus(account);
      } else if (err.message && err.message.includes("Sudah pernah daftar")) {
        setStatus("❌ Akun sudah terdaftar");
        await checkLSPStatus(account);
      } else {
        setStatus("❌ Terjadi kesalahan: " + (err.reason || err.message || "Unknown error"));
        await checkLSPStatus(account);
      }
    }
  };

  return (
    <div className="daftar-container">
      <h2>Form Pendaftaran LSP</h2>
      <div className="wallet-section">
        {!isConnected ? (
          <button onClick={connectWallet} className="connect-wallet-btn">
            🔗 Hubungkan MetaMask
          </button>
        ) : (
          <div className="wallet-info">
            <span>✅ Wallet Terhubung: {account.slice(0, 6)}...{account.slice(-4)}</span>
          </div>
        )}
      </div>
      {isConnected && (
        lspStatus === null ? (
          <div className="status-message info">Cek status pendaftaran LSP...</div>
        ) : lspStatus === 1 ? (
          <div className="status-message info">Pengajuan berhasil! Data Anda sedang menunggu verifikasi dari BNSP.</div>
        ) : lspStatus === 2 ? (
          <div className="status-message success">Selamat! Anda sudah terverifikasi sebagai LSP.</div>
        ) : lspStatus === 3 ? (
          <div className="status-message error">Pendaftaran Anda ditolak oleh BNSP. Silakan hubungi admin.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nama LSP</label>
              <input name="nama_lsp" value={formData.nama_lsp} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Alamat Kantor</label>
              <input name="alamat_kantor" value={formData.alamat_kantor} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Nomor Izin</label>
              <input name="no_izin" value={formData.no_izin} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email Kontak</label>
              <input name="email_kontak" type="email" value={formData.email_kontak} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Telepon</label>
              <input name="telepon" value={formData.telepon} onChange={handleChange} pattern="^08[0-9]{8,11}$" title="Nomor telepon harus diawali 08 dan 10-13 digit" required />
            </div>
            <div className="form-group">
              <label>Penanggung Jawab</label>
              <input name="penanggung_jawab" value={formData.penanggung_jawab} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Website (opsional)</label>
              <input name="website" value={formData.website} onChange={handleChange} type="url" placeholder="https://..." />
            </div>
            <button type="submit" className="submit-btn">Daftarkan LSP</button>
          </form>
        )
      )}
      {status && <div className="status-message">{status}</div>}
    </div>
  );
} 