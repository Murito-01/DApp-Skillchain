import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { useWallet } from "../contexts/WalletContext";
import { decryptData, getOrCreateAesKeyIv, encryptData, generateRandomFilename } from "../lib/encrypt";
import "./ProfilLSP.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;

export default function ProfilLSP() {
  const { account, isConnected } = useWallet();
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (isConnected && account) {
      fetchProfil();
    }
    // eslint-disable-next-line
  }, [isConnected, account]);

  async function fetchProfil() {
    setLoading(true);
    setStatus("");
    try {
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      const lspInfo = await contract.getLSP(account);
      const metadataCID = lspInfo[0];
      if (!metadataCID) throw new Error("Belum ada metadata LSP");
      // Fetch dan dekripsi metadata
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${metadataCID}`);
      const encrypted = await res.text();
      const { key, iv } = getOrCreateAesKeyIv();
      let data = null;
      try {
        const plaintext = decryptData(encrypted, key, iv);
        data = JSON.parse(plaintext);
      } catch {
        data = null;
      }
      setProfil({ ...data, metadataCID });
      setFormData(data);
    } catch (err) {
      setStatus("Gagal mengambil profil: " + (err.message || err));
      setProfil(null);
    }
    setLoading(false);
  }

  function handleEdit() {
    setEditMode(true);
    setFormData(profil);
    setStatus("");
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");
    try {
      // Enkripsi data baru
      const { key, iv } = getOrCreateAesKeyIv();
      const encrypted = encryptData(formData, key, iv);
      const randomJsonFilename = generateRandomFilename();
      // Upload ke Pinata
      const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
      const formDataPinata = new FormData();
      const file = new File([encrypted], randomJsonFilename, { type: "text/plain" });
      formDataPinata.append("file", file);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
        body: formDataPinata,
      });
      if (!res.ok) throw new Error("Gagal upload ke Pinata");
      const data = await res.json();
      const cid = data.IpfsHash;
      // Update ke smart contract
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
      const tx = await contract.updateMetadataLSP(cid);
      setStatus("Menunggu konfirmasi blockchain...");
      await tx.wait();
      setStatus("Profil berhasil diperbarui!");
      setEditMode(false);
      fetchProfil();
    } catch (err) {
      setStatus("Gagal update profil: " + (err.reason || err.message));
    }
  }

  if (!isConnected) {
    return <div style={{padding:40, textAlign:'center'}}>Silakan hubungkan wallet terlebih dahulu.</div>;
  }

  return (
    <div className="profil-lsp-container">
      <h2 className="profil-lsp-title">Profil LSP</h2>
      {loading ? (
        <div>Loading...</div>
      ) : profil ? (
        editMode ? (
          <form onSubmit={handleSubmit} className="profil-lsp-form">
            <div className="form-group">
              <label>Nama LSP</label>
              <input name="nama_lsp" value={formData.nama_lsp || ''} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Singkatan LSP</label>
              <input name="singkatan_lsp" value={formData.singkatan_lsp || ''} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Jenis LSP</label>
              <input name="jenis_lsp" value={formData.jenis_lsp || ''} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Alamat Kantor</label>
              <input name="alamat_kantor" value={formData.alamat_kantor || ''} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email Kontak</label>
              <input name="email_kontak" value={formData.email_kontak || ''} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Telepon</label>
              <input name="telepon" value={formData.telepon || ''} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Penanggung Jawab</label>
              <input name="penanggung_jawab" value={formData.penanggung_jawab || ''} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Website</label>
              <input name="website" value={formData.website || ''} onChange={handleChange} />
            </div>
            <div className="profil-lsp-btn-row">
              <button type="submit" className="profil-lsp-btn simpan">Simpan Perubahan</button>
              <button type="button" className="profil-lsp-btn cancel" onClick={()=>setEditMode(false)}>Batal</button>
            </div>
          </form>
        ) : (
          <div className="profil-lsp-info">
            <div className="profil-lsp-info-row"><span className="profil-lsp-label">Nama LSP</span><span className="profil-lsp-colon"> : </span><span className="profil-lsp-value">{profil.nama_lsp}</span></div>
            <div className="profil-lsp-info-row"><span className="profil-lsp-label">Singkatan</span><span className="profil-lsp-colon"> : </span><span className="profil-lsp-value">{profil.singkatan_lsp}</span></div>
            <div className="profil-lsp-info-row"><span className="profil-lsp-label">Jenis</span><span className="profil-lsp-colon"> : </span><span className="profil-lsp-value">{profil.jenis_lsp}</span></div>
            <div className="profil-lsp-info-row"><span className="profil-lsp-label">Alamat</span><span className="profil-lsp-colon"> : </span><span className="profil-lsp-value">{profil.alamat_kantor}</span></div>
            <div className="profil-lsp-info-row"><span className="profil-lsp-label">Email</span><span className="profil-lsp-colon"> : </span><span className="profil-lsp-value">{profil.email_kontak}</span></div>
            <div className="profil-lsp-info-row"><span className="profil-lsp-label">Telepon</span><span className="profil-lsp-colon"> : </span><span className="profil-lsp-value">{profil.telepon}</span></div>
            <div className="profil-lsp-info-row"><span className="profil-lsp-label">Penanggung Jawab</span><span className="profil-lsp-colon"> : </span><span className="profil-lsp-value">{profil.penanggung_jawab}</span></div>
            <div className="profil-lsp-info-row"><span className="profil-lsp-label">Website</span><span className="profil-lsp-colon"> : </span><span className="profil-lsp-value">{profil.website}</span></div>
            <div className="profil-lsp-btn-wrapper">
              <button className="profil-lsp-btn" onClick={handleEdit}>Edit Profil</button>
            </div>
          </div>
        )
      ) : (
        <div>Profil LSP tidak ditemukan.</div>
      )}
      {status && <div style={{marginTop:18, color: status.startsWith('Gagal') ? '#cf1322' : '#389e0d'}}>{status}</div>}
    </div>
  );
} 