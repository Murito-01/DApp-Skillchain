import { useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import "./DaftarPeserta.css";
import Ajv from "ajv";
import { useWallet } from "../contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { encryptData, getOrCreateAesKeyIv, generateRandomFilename } from "../lib/encrypt";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;

const skemaOptions = [
  "Okupasi PJOI Pengendalian Pencemaran Udara",
  "Okupasi PJ Pengendalian Pencemaran Udara", 
  "Okupasi PJO Pengolahan Air Limbah",
  "Okupasi PJ Pengendalian Pencemaran Air"
];

export default function DaftarPeserta() {
  const [formData, setFormData] = useState({
    nama_lengkap: "",
    nik: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    jenis_kelamin: "Laki-laki",
    alamat_ktp: "",
    email_student_uii: "",
    nomor_hp: "",
    id_sosmed: "",
  });

  const [status, setStatus] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState("");
  const { setRole } = useWallet();
  const navigate = useNavigate();

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

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        setStatus("");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setStatus("❌ Gagal terhubung ke wallet: " + error.message);
    }
  };

  const uploadToPinata = async (encryptedString, fileName = null) => {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      throw new Error("API Key/Secret Pinata tidak ditemukan di .env");
    }
    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
    const formData = new FormData();
    const file = new File([encryptedString], fileName || generateRandomFilename(), { type: "text/plain" });
    formData.append("file", file);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
      body: formData,
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

    setStatus("Validasi data...");

    try {
      const schema = await fetch("/metadata-peserta.schema.json").then(res => res.json());
      const ajv = new Ajv();
      const validate = ajv.compile(schema);
      if (!validate(formData)) {
        setStatus("❌ Data tidak valid: " + ajv.errorsText(validate.errors));
        return;
      }

      setStatus("Membuat file JSON terenkripsi...");
      const { key, iv } = getOrCreateAesKeyIv();
      const encryptedJson = encryptData(formData, key, iv);

      setStatus("Upload ke IPFS (Pinata)...");
      const randomJsonFilename = generateRandomFilename();
      const cid = await uploadToPinata(encryptedJson, randomJsonFilename);

      setStatus("Terhubung ke wallet...");
      if (!window.ethereum) {
        throw new Error("MetaMask tidak terdeteksi. Silakan install MetaMask.");
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

      setStatus("Mengirim transaksi ke blockchain...");
      const tx = await contract.daftarPeserta(cid);
      console.log("Transaction hash:", tx.hash);
      setStatus("Menunggu konfirmasi transaksi...\nHash: " + tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);

      setStatus("Pendaftaran berhasil! 🎉");
      setRole("peserta");
      setFormData({
        nama_lengkap: "",
        nik: "",
        tempat_lahir: "",
        tanggal_lahir: "",
        jenis_kelamin: "Laki-laki",
        alamat_ktp: "",
        email_student_uii: "",
        nomor_hp: "",
        id_sosmed: "",
      });
      setTimeout(() => navigate("/peserta"), 1000);
    } catch (err) {
      console.error("Error during registration:", err);
      if (err.message.includes("Pinata")) {
        setStatus("❌ Error: API Key/Secret Pinata tidak dikonfigurasi. Periksa file .env");
      } else if (err.message.includes("MetaMask")) {
        setStatus("❌ Error: " + err.message);
      } else if (err.code === 4001) {
        setStatus("❌ Transaksi dibatalkan oleh user.");
      } else if (err.message && err.message.includes("insufficient funds")) {
        setStatus("❌ Saldo tidak cukup untuk transaksi.");
      } else {
        setStatus("❌ Terjadi kesalahan: " + (err.message || "Unknown error"));
      }
    }
  };

  const ajukanSertifikasi = async (skema) => {
    const tx = await contract.ajukanSertifikasi(skema);
  };

  return (
    <div className="daftar-container">
      <h2>Form Pendaftaran Peserta</h2>
      
      {/* Wallet Connection Section */}
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

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nama Lengkap</label>
          <input
            name="nama_lengkap"
            value={formData.nama_lengkap}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>NIK (16 digit)</label>
          <input
            name="nik"
            value={formData.nik}
            onChange={handleChange}
            pattern="\d{16}"
            title="NIK harus 16 digit angka"
            required
          />
        </div>
        <div className="form-group">
          <label>Tempat Lahir</label>
          <input
            name="tempat_lahir"
            value={formData.tempat_lahir}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Tanggal Lahir</label>
          <input
            type="date"
            name="tanggal_lahir"
            value={formData.tanggal_lahir}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Jenis Kelamin</label>
          <select
            name="jenis_kelamin"
            value={formData.jenis_kelamin}
            onChange={handleChange}
          >
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </select>
        </div>
        <div className="form-group">
          <label>Alamat KTP</label>
          <textarea
            name="alamat_ktp"
            value={formData.alamat_ktp}
            onChange={handleChange}
            rows={3}
            required
          />
        </div>
        <div className="form-group">
          <label>Email Student UII</label>
          <input
            type="email"
            name="email_student_uii"
            value={formData.email_student_uii}
            onChange={handleChange}
            pattern=".*@students\.uii\.ac\.id$"
            title="Harus menggunakan email @students.uii.ac.id"
            required
          />
        </div>
        <div className="form-group">
          <label>Nomor HP</label>
          <input
            name="nomor_hp"
            value={formData.nomor_hp}
            onChange={handleChange}
            pattern="^08[0-9]{8,11}$"
            title="Format: 08xxxxxxxxx (10-13 digit)"
            required
          />
        </div>
        <div className="form-group">
          <label>ID Sosial Media</label>
          <input
            name="id_sosmed"
            value={formData.id_sosmed}
            onChange={handleChange}
            placeholder="@username atau link profil"
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={status.includes("...") || !isConnected}
          className={!isConnected ? "disabled-btn" : ""}
        >
          {status.includes("...") ? "Memproses..." : "Daftar"}
        </button>
      </form>
      {status && (
        <div className={`status-message ${status.includes("❌") ? "error" : status.includes("🎉") ? "success" : "info"}`}>
          {status}
        </div>
      )}
    </div>
  );
}