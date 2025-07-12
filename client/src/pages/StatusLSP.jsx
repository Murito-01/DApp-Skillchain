import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { useWallet } from "../contexts/WalletContext";
import "./StatusLSP.css";
import { decryptFileFromIPFS, getOrCreateAesKeyIv } from "../lib/encrypt";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const STATUS_LABELS = [
  "Belum Pernah Daftar",
  "Menunggu Verifikasi BNSP",
  "Aktif (Terverifikasi)",
  "Ditolak"
];

export default function StatusLSP() {
  const { account, isConnected, setRole } = useWallet();
  const [lspStatus, setLspStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suratIzinCID, setSuratIzinCID] = useState("");
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileBlobUrl, setFileBlobUrl] = useState("");
  const [fileType, setFileType] = useState("");

  // Setelah upload/verifikasi, fetchStatus() dipanggil ulang
  useEffect(() => {
    if (isConnected && account) {
      fetchStatus();
    }
  }, [isConnected, account]);

  // Tambahkan polling sederhana setelah upload/verifikasi
  const [polling, setPolling] = useState(false);
  async function pollStatusAfterAction() {
    setPolling(true);
    for (let i = 0; i < 6; i++) { // polling max 6x (30 detik)
      await new Promise(res => setTimeout(res, 5000));
      await fetchStatus();
      if (lspStatus === 1 && suratIzinCID) break;
    }
    setPolling(false);
  }

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      const statusOnChain = await contract.getStatusLSP(account);
      const statusNumber = Number(statusOnChain);
      setLspStatus(statusNumber);
      
      // Update role berdasarkan status
      if (statusNumber === 1) {
        setRole("lsp"); 
      } else if (statusNumber === -1 || statusNumber === 0 || statusNumber === 2) {
        setRole("lsp-candidate");
      }
      
      if (statusNumber === 1) {
        // Sudah terverifikasi, ambil CID surat izin
        const lspData = await contract.getLSP(account);
        setSuratIzinCID(lspData[2]);
      } else {
        setSuratIzinCID("");
      }
    } catch {
      setLspStatus(null);
      setSuratIzinCID("");
    }
    setLoading(false);
  };

  async function handleLihatSuratIzin(cid, filenameGuess = "surat_izin.pdf") {
    setShowFileModal(true);
    setFileBlobUrl("");
    setFileType("");
    try {
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      const encrypted = await res.text();
      const { keyHex, ivHex } = getOrCreateAesKeyIv();
      const bytes = decryptFileFromIPFS(encrypted, keyHex, ivHex);
      let type = "application/pdf";
      if (filenameGuess.endsWith(".jpg") || filenameGuess.endsWith(".jpeg")) type = "image/jpeg";
      if (filenameGuess.endsWith(".png")) type = "image/png";
      const blob = new Blob([bytes], { type });
      setFileBlobUrl(URL.createObjectURL(blob));
      setFileType(type);
    } catch (e) {
      alert("Gagal mendekripsi file: " + e.message);
      setShowFileModal(false);
    }
  }

  return (
    <div className="slsp-container">
      <h2 className="slsp-title">Status LSP</h2>
      <div className="slsp-wallet-section">
        {isConnected ? (
          <div className="slsp-wallet-info">
            <span>✅ Wallet Terhubung: {account.slice(0, 6)}...{account.slice(-4)}</span>
          </div>
        ) : (
          <div className="status-message error">Wallet belum terhubung</div>
        )}
      </div>
      <div className="slsp-content">
        {loading ? (
          <div className="slsp-loading">
            <div className="slsp-spinner">
              <div className="slsp-spinner-inner"></div>
            </div>
            <div className="slsp-loading-text">Mengambil status LSP...</div>
          </div>
        ) : lspStatus === 0 ? (
          <div className="slsp-status-card slsp-status-waiting">
            <div className="slsp-status-icon">⏳</div>
            <div className="slsp-status-title">Menunggu Verifikasi BNSP</div>
            <div className="slsp-status-desc">Data Anda sedang diverifikasi oleh BNSP.<br/>Mohon tunggu konfirmasi melalui sistem.</div>
            <div className="slsp-status-tips">Tips: Pastikan data yang Anda ajukan sudah benar. Proses verifikasi biasanya memakan waktu 1x24 jam.</div>
          </div>
        ) : lspStatus === 1 ? (
          <div className="slsp-status-card slsp-status-verified">
            <div className="slsp-status-icon">✅</div>
            <div className="slsp-status-title">Terverifikasi</div>
            <div className="slsp-status-desc">Selamat! LSP Anda sudah terverifikasi dan dapat beroperasi.</div>
            <div className="slsp-status-tips">Anda dapat mulai melakukan aktivitas sebagai LSP di platform ini.</div>
            {suratIzinCID && (
              <div className="slsp-surat-section">
                <span className="slsp-surat-cid">CID Surat Izin:</span> <span className="slsp-surat-cid-value">{suratIzinCID}</span>
                <div>
                  <button
                    onClick={() => handleLihatSuratIzin(suratIzinCID, "surat_izin.pdf")}
                    className="slsp-surat-btn"
                  >
                    Lihat/Unduh Surat Izin
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : lspStatus === 2 ? (
          <div className="slsp-status-card slsp-status-rejected">
            <div className="slsp-status-icon">❌</div>
            <div className="slsp-status-title">Ditolak</div>
            <div className="slsp-status-desc">Maaf, pengajuan LSP Anda <b>ditolak</b> oleh BNSP.</div>
            <div className="slsp-status-tips">Silakan hubungi admin untuk info lebih lanjut atau ajukan ulang dengan data yang benar.</div>
          </div>
        ) : lspStatus === -1 ? (
          <div className="slsp-status-card slsp-status-not-registered">
            <div className="slsp-status-icon">ℹ️</div>
            <div className="slsp-status-title">Belum Pernah Daftar</div>
            <div className="slsp-status-desc">Anda belum pernah mengajukan pendaftaran sebagai LSP.</div>
            <div className="slsp-status-tips">Gunakan menu <b>Ajukan</b> untuk mendaftar sebagai LSP.</div>
          </div>
        ) : null}
      </div>
      {polling && (
        <div className="slsp-polling">Menunggu konfirmasi blockchain... Data akan diperbarui otomatis.</div>
      )}
      {showFileModal && (
        <div className="slsp-modal-bg" onClick={()=>setShowFileModal(false)}>
          <div className="slsp-modal" onClick={e=>e.stopPropagation()}>
            <h3 className="slsp-modal-title">Lihat Surat Izin</h3>
            {fileBlobUrl ? (
              fileType.startsWith("image/") ? (
                <img src={fileBlobUrl} alt="Surat Izin" className="slsp-modal-image" />
              ) : (
                <iframe src={fileBlobUrl} className="slsp-modal-iframe" title="Surat Izin" />
              )
            ) : (
              <div>Loading file...</div>
            )}
            {fileBlobUrl && (
              <a href={fileBlobUrl} download="surat_izin" className="slsp-modal-download">Download File</a>
            )}
            <button onClick={()=>setShowFileModal(false)} className="slsp-modal-close">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
} 