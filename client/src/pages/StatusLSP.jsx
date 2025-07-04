import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { useWallet } from "../contexts/WalletContext";
import "./DaftarLSP.css";

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

  useEffect(() => {
    if (isConnected && account) {
      fetchStatus();
    }
    // eslint-disable-next-line
  }, [isConnected, account]);

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
        setRole("lsp"); // Sudah diverifikasi
      } else if (statusNumber === -1 || statusNumber === 0 || statusNumber === 2) {
        setRole("lsp-candidate"); // Belum diverifikasi atau ditolak
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

  return (
    <div className="daftar-container" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh'}}>
      <h2 style={{marginBottom:32}}>Status LSP</h2>
      <div className="wallet-section" style={{marginBottom:24}}>
        {isConnected ? (
          <div className="wallet-info" style={{fontSize:16}}>
            <span>✅ Wallet Terhubung: {account.slice(0, 6)}...{account.slice(-4)}</span>
          </div>
        ) : (
          <div className="status-message error">Wallet belum terhubung</div>
        )}
      </div>
      <div style={{width:'100%',maxWidth:420}}>
        {loading ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:32,background:'#f5f5f5',borderRadius:16,boxShadow:'0 2px 8px #0001'}}>
            <div className="spinner" style={{marginBottom:16}}>
              <div style={{width:32,height:32,border:'4px solid #bbb',borderTop:'4px solid #4f46e5',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>
            </div>
            <div style={{fontWeight:500,fontSize:18}}>Mengambil status LSP...</div>
          </div>
        ) : lspStatus === 0 ? (
          <div style={{background:'#fffbe6',border:'1.5px solid #ffe58f',borderRadius:16,padding:32,boxShadow:'0 2px 8px #0001',textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:12}}>⏳</div>
            <div style={{fontWeight:600,fontSize:22,color:'#ad8b00'}}>Menunggu Verifikasi BNSP</div>
            <div style={{marginTop:8,fontSize:16}}>Data Anda sedang diverifikasi oleh BNSP.<br/>Mohon tunggu konfirmasi melalui sistem.</div>
            <div style={{marginTop:16,fontSize:14,color:'#ad8b00'}}>Tips: Pastikan data yang Anda ajukan sudah benar. Proses verifikasi biasanya memakan waktu 1x24 jam.</div>
          </div>
        ) : lspStatus === 1 ? (
          <div style={{background:'#f6ffed',border:'1.5px solid #b7eb8f',borderRadius:16,padding:32,boxShadow:'0 2px 8px #0001',textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{fontWeight:600,fontSize:22,color:'#389e0d'}}>Terverifikasi</div>
            <div style={{marginTop:8,fontSize:16}}>Selamat! LSP Anda sudah terverifikasi dan dapat beroperasi.</div>
            <div style={{marginTop:16,fontSize:14,color:'#389e0d'}}>Anda dapat mulai melakukan aktivitas sebagai LSP di platform ini.</div>
            {suratIzinCID && (
              <div style={{marginTop:18,fontSize:15}}>
                <b style={{color:'#111'}}>CID Surat Izin:</b> <span style={{fontFamily:'monospace',color:'#222'}}>{suratIzinCID}</span>
                <div style={{marginTop:12}}>
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${suratIzinCID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    style={{
                      display: 'inline-block',
                      marginTop: 8,
                      padding: '8px 18px',
                      background: '#4f46e5',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 500,
                      textDecoration: 'none',
                      fontSize: 15,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px #0001'
                    }}
                  >
                    Unduh Surat Izin
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : lspStatus === 2 ? (
          <div style={{background:'#fff1f0',border:'1.5px solid #ffa39e',borderRadius:16,padding:32,boxShadow:'0 2px 8px #0001',textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:12}}>❌</div>
            <div style={{fontWeight:600,fontSize:22,color:'#cf1322'}}>Ditolak</div>
            <div style={{marginTop:8,fontSize:16}}>Maaf, pengajuan LSP Anda <b>ditolak</b> oleh BNSP.</div>
            <div style={{marginTop:16,fontSize:14,color:'#cf1322'}}>Silakan hubungi admin untuk info lebih lanjut atau ajukan ulang dengan data yang benar.</div>
          </div>
        ) : lspStatus === -1 ? (
          <div style={{background:'#f0f5ff',border:'1.5px solid #adc6ff',borderRadius:16,padding:32,boxShadow:'0 2px 8px #0001',textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:12}}>ℹ️</div>
            <div style={{fontWeight:600,fontSize:22,color:'#2f54eb'}}>Belum Pernah Daftar</div>
            <div style={{marginTop:8,fontSize:16}}>Anda belum pernah mengajukan pendaftaran sebagai LSP.</div>
            <div style={{marginTop:16,fontSize:14,color:'#2f54eb'}}>Gunakan menu <b>Ajukan</b> untuk mendaftar sebagai LSP.</div>
          </div>
        ) : null}
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }
      `}</style>
    </div>
  );
} 