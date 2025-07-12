import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import "./DaftarLSP.css";
import { useWallet } from "../contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { encryptData, getOrCreateAesKeyIv, generateRandomFilename } from "../lib/encrypt";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;

export default function DaftarLSP() {
  const [formData, setFormData] = useState({
    nama_lsp: "",
    singkatan_lsp: "",
    jenis_lsp: "LSP P1",
    alamat_kantor: "",
    email_kontak: "",
    telepon: "",
    penanggung_jawab: "",
    website: "",
    akte_notaris_cid: "",
  });
  const [akteFile, setAkteFile] = useState(null);
  const [akteUploadProgress, setAkteUploadProgress] = useState(0);
  const [akteUploading, setAkteUploading] = useState(false);
  const [akteCID, setAkteCID] = useState("");
  const [akteUploadStatus, setAkteUploadStatus] = useState("");
  const [status, setStatus] = useState("");
  const [lspStatus, setLspStatus] = useState(null);
  const { account, isConnected, setRole, checkRole } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected && account) {
      checkLSPStatus(account);
    }
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
      setStatus("");
    } catch (error) {
      setStatus("❌ Gagal terhubung ke wallet: " + error.message);
    }
  };

  // Fungsi utilitas untuk konversi file ke base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Enkripsi dan upload file Akte Notaris
  async function encryptAndUploadAkte(file) {
    const base64 = await fileToBase64(file);
    const { key, iv } = getOrCreateAesKeyIv();
    const encrypted = encryptData(base64, key, iv);
    const blob = new Blob([encrypted], { type: "text/plain" });
    const randomFilename = generateRandomFilename();
    return await uploadAkteToPinata(blob, randomFilename);
  }

  // Modifikasi uploadToPinata agar menerima string terenkripsi dan upload sebagai text/plain
  const uploadToPinata = async (encryptedString, fileName = null) => {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      throw new Error("API Key/Secret Pinata tidak ditemukan di .env");
    }
    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
    const formData = new FormData();
    const file = new File([
      encryptedString
    ], fileName || generateRandomFilename(), { type: "text/plain" });
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

  // Modifikasi uploadAkteToPinata agar bisa menerima blob terenkripsi dan nama file custom
  const uploadAkteToPinata = async (file, fileName = null) => {
    return new Promise((resolve, reject) => {
      if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
        reject("API Key/Secret Pinata tidak ditemukan di .env");
        return;
      }
      const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
      const formData = new FormData();
      formData.append("file", file, fileName || generateRandomFilename());
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("pinata_api_key", PINATA_API_KEY);
      xhr.setRequestHeader("pinata_secret_api_key", PINATA_SECRET_API_KEY);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setAkteUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        setAkteUploading(false);
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setAkteCID(data.IpfsHash);
          setAkteUploadStatus("✅ Upload berhasil!");
          resolve(data.IpfsHash);
        } else {
          setAkteUploadStatus("❌ Gagal upload ke Pinata");
          reject("Gagal upload ke Pinata");
        }
      };
      xhr.onerror = () => {
        setAkteUploading(false);
        setAkteUploadStatus("❌ Gagal upload ke Pinata");
        reject("Gagal upload ke Pinata");
      };
      setAkteUploading(true);
      setAkteUploadProgress(0);
      setAkteUploadStatus("");
      xhr.send(formData);
    });
  };

  // Upload file terenkripsi
  const handleAkteFileChange = (e) => {
    const file = e.target.files[0];
    setAkteFile(file);
    setAkteCID("");
    setAkteUploadProgress(0);
    setAkteUploadStatus("");
    if (file) {
      encryptAndUploadAkte(file).catch(() => {});
    }
  };

  // Data JSON juga dienkripsi sebelum upload
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
    if (!akteFile || !akteCID) {
      setStatus("❌ Mohon upload dokumen Akte Notaris (PDF) dan tunggu hingga upload selesai.");
      return;
    }
    const { key, iv, keyHex, ivHex } = getOrCreateAesKeyIv();
    console.log("[DaftarLSP] Kunci saat submit:", keyHex, "IV:", ivHex, "(WordArray)", key, iv);
    setStatus("Membuat file JSON terenkripsi...");
    try {
      const dataToUpload = { ...formData, akte_notaris_cid: akteCID };
      const encryptedJson = encryptData(dataToUpload, key, iv);
      console.log("[DaftarLSP] Panjang ciphertext:", encryptedJson.length);
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      if (encryptedJson.length % 4 !== 0 || !base64Regex.test(encryptedJson)) {
        console.error("[DaftarLSP] Ciphertext bukan base64 valid:", encryptedJson);
        setStatus("❌ Ciphertext tidak valid base64!");
        return;
      }
      setStatus("Upload ke IPFS (Pinata)...");
      const randomJsonFilename = generateRandomFilename();
      console.log("[DaftarLSP] Mulai upload metadata ke Pinata...");
      let cid = null;
      try {
        cid = await uploadToPinata(encryptedJson, randomJsonFilename);
        console.log("[DaftarLSP] CID metadata yang didapat dari Pinata:", cid);
      } catch (uploadErr) {
        console.error("[DaftarLSP] Gagal upload metadata ke Pinata:", uploadErr);
        setStatus("❌ Gagal upload metadata ke Pinata. Coba lagi.");
        return;
      }
      if (!cid) {
        setStatus("❌ Upload ke Pinata gagal, CID kosong!");
        return;
      }
      setStatus("Mengirim transaksi ke blockchain...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
      const tx = await contract.daftarLSP(cid);
      setStatus("Menunggu konfirmasi transaksi... Hash: " + tx.hash);
      await tx.wait();
      setStatus("Pengajuan berhasil! Data Anda sedang menunggu verifikasi dari BNSP.");
      setLspStatus(0);
      setRole("lsp-candidate");
      if (account && checkRole) {
        await checkRole(account);
      }
      setFormData({
        nama_lsp: "",
        singkatan_lsp: "",
        jenis_lsp: "LSP P1",
        alamat_kantor: "",
        email_kontak: "",
        telepon: "",
        penanggung_jawab: "",
        website: "",
        akte_notaris_cid: "",
      });
      setAkteFile(null);
      setAkteCID("");
      setAkteUploadProgress(0);
      setAkteUploadStatus("");
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
              <label>Nama LSP (Lengkap)</label>
              <input name="nama_lsp" value={formData.nama_lsp} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Nama Singkatan LSP</label>
              <input name="singkatan_lsp" value={formData.singkatan_lsp} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Jenis LSP</label>
              <select name="jenis_lsp" value={formData.jenis_lsp} onChange={handleChange} required>
                <option value="LSP P1">LSP P1</option>
                <option value="LSP P2">LSP P2</option>
                <option value="LSP P3">LSP P3</option>
              </select>
            </div>
            <div className="form-group">
              <label>Alamat Kantor LSP</label>
              <input name="alamat_kantor" value={formData.alamat_kantor} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email Resmi LSP</label>
              <input name="email_kontak" type="email" value={formData.email_kontak} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Telepon Resmi</label>
              <input name="telepon" value={formData.telepon} onChange={handleChange} pattern="^08[0-9]{8,11}$" title="Nomor telepon harus diawali 08 dan 10-13 digit" required />
            </div>
            <div className="form-group">
              <label>Nama Lengkap Penanggung Jawab</label>
              <input name="penanggung_jawab" value={formData.penanggung_jawab} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Website Resmi</label>
              <input name="website" value={formData.website} onChange={handleChange} type="url" placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>Upload Akte Notaris (PDF)</label>
              <input type="file" accept="application/pdf" onChange={handleAkteFileChange} required />
              {akteUploading && (
                <div style={{marginTop:8}}>
                  <div style={{height:8,background:"#eee",borderRadius:6,overflow:"hidden"}}>
                    <div style={{width:`${akteUploadProgress}%`,height:8,background:"#4f46e5",transition:"width .3s"}}></div>
                  </div>
                  <div style={{fontSize:12,marginTop:2,color:"#111"}}>{akteUploadProgress}%</div>
                </div>
              )}
              {akteUploadStatus && (
                <div style={{marginTop:8, color: akteUploadStatus.startsWith('✅') ? '#389e0d' : '#cf1322'}}>{akteUploadStatus}</div>
              )}
              {akteCID && (
                <div style={{marginTop:8, fontSize:13, background:'#e6f0ff', padding:'6px 10px', borderRadius:6, color:'#111', display:'inline-block'}}>
                  <b>CID Akte Notaris:</b> <span style={{fontFamily:'monospace', color:'#111'}}>{akteCID}</span>
                  <button type="button" style={{marginLeft:8}} onClick={()=>{navigator.clipboard.writeText(akteCID)}}>Copy CID</button>
                </div>
              )}
            </div>
            <button type="submit" className="submit-btn">Daftarkan LSP</button>
          </form>
        )
      )}
      {status && <div className="status-message">{status}</div>}
    </div>
  );
} 