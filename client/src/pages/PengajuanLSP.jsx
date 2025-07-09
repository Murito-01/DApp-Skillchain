import "./BNSPDashboard.css";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function BNSPDashboard() {
  const [pendingLSPs, setPendingLSPs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetchPendingLSPs();
  }, []);

  async function fetchPendingLSPs() {
    setLoading(true);
    setFeedback("");
    try {
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      const filter = contract.filters.LSPDidaftarkan();
      const events = await contract.queryFilter(filter, 0, "latest");
      const lspList = [];
      for (const ev of events) {
        const lspAddr = ev.args.lsp;
        // Cek status
        const status = await contract.getStatusLSP(lspAddr);
        if (Number(status) === 0) {
          // Ambil metadata
          const lspData = await contract.getLSP(lspAddr);
          let metadata = null;
          try {
            const res = await fetch(`https://gateway.pinata.cloud/ipfs/${lspData[0]}`);
            metadata = await res.json();
          } catch {
            metadata = null;
          }
          lspList.push({
            address: lspAddr,
            metadataCID: lspData[0],
            status: Number(status),
            suratIzinCID: lspData[2],
            alasanTolak: lspData[3],
            metadata,
          });
        }
      }
      setPendingLSPs(lspList);
    } catch (err) {
      setFeedback("Gagal mengambil data: " + (err.message || err));
    }
    setLoading(false);
  }

  // Verifikasi LSP
  async function handleVerifikasi(lspAddr) {
    const cid = prompt("Masukkan CID surat izin (IPFS):");
    if (!cid) return;
    setActionLoading(lspAddr+"-verif");
    setFeedback("");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
      const tx = await contract.verifikasiLSP(lspAddr, cid);
      setFeedback("Menunggu konfirmasi transaksi... " + tx.hash);
      await tx.wait();
      setFeedback("✅ LSP berhasil diverifikasi!");
      fetchPendingLSPs();
    } catch (err) {
      setFeedback("❌ Gagal verifikasi: " + (err.reason || err.message));
    }
    setActionLoading("");
  }

  // Tolak LSP
  async function handleTolak(lspAddr) {
    const alasan = prompt("Masukkan alasan penolakan:");
    if (!alasan) return;
    setActionLoading(lspAddr+"-tolak");
    setFeedback("");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
      const tx = await contract.tolakLSP(lspAddr, alasan);
      setFeedback("Menunggu konfirmasi transaksi... " + tx.hash);
      await tx.wait();
      setFeedback("✅ LSP berhasil ditolak!");
      fetchPendingLSPs();
    } catch (err) {
      setFeedback("❌ Gagal tolak: " + (err.reason || err.message));
    }
    setActionLoading("");
  }

  return (
    <div className="bnsp-dashboard-container">
      <div className="bnsp-title">Dashboard BNSP</div>
      <div className="bnsp-section">
        <div className="bnsp-section-title">LSP Menunggu Verifikasi</div>
        <hr className="bnsp-divider" />
        {feedback && <div style={{marginBottom:16, color:feedback.startsWith('✅')? '#389e0d':'#cf1322', fontWeight:500}}>{feedback}</div>}
        {loading ? (
          <div>Loading data...</div>
        ) : pendingLSPs.length === 0 ? (
          <div className="bnsp-card">Belum ada LSP yang mengajukan pendaftaran</div>
        ) : (
          <table style={{width:'100%',background:'#fff',borderRadius:12,boxShadow:'0 2px 8px #0001',overflow:'hidden',color:'#111'}}>
            <thead style={{background:'#f5f5f5',color:'#111'}}>
              <tr>
                <th style={{padding:8}}>Wallet</th>
                <th style={{padding:8}}>Nama LSP</th>
                <th style={{padding:8}}>Email</th>
                <th style={{padding:8}}>Aksi</th>
              </tr>
            </thead>
            <tbody style={{color:'#111'}}>
              {pendingLSPs.map(lsp => (
                <tr key={lsp.address} style={{borderBottom:'1px solid #eee'}}>
                  <td style={{padding:8,fontFamily:'monospace'}}>{lsp.address}</td>
                  <td style={{padding:8}}>{lsp.metadata?.nama_lsp || <i>Unknown</i>}</td>
                  <td style={{padding:8}}>{lsp.metadata?.email_kontak || <i>-</i>}</td>
                  <td style={{padding:8}}>
                    <button onClick={()=>handleVerifikasi(lsp.address)} disabled={actionLoading!==''} style={{marginRight:8,background:'#389e0d',color:'#fff',border:'none',padding:'6px 14px',borderRadius:6,cursor:'pointer'}}>Verifikasi</button>
                    <button onClick={()=>handleTolak(lsp.address)} disabled={actionLoading!==''} style={{background:'#cf1322',color:'#fff',border:'none',padding:'6px 14px',borderRadius:6,cursor:'pointer'}}>Tolak</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 