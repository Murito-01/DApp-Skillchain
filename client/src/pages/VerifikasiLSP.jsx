import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import "./VerifikasiLSP.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function VerifikasiLSP() {
  const [pendingLSPs, setPendingLSPs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalCID, setModalCID] = useState("");
  const [modalLSP, setModalLSP] = useState(null);

  useEffect(() => {
    fetchPendingLSPs();
    // eslint-disable-next-line
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
        const status = await contract.getStatusLSP(lspAddr);
        if (Number(status) === 0) {
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

  function openVerifikasiModal(lsp) {
    setModalLSP(lsp);
    setModalCID("");
    setShowModal(true);
    setFeedback("");
  }

  async function handleVerifikasi() {
    if (!modalCID) {
      setFeedback("❌ CID surat izin harus diisi.");
      return;
    }
    setActionLoading(modalLSP.address+"-verif");
    setFeedback("");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
      const tx = await contract.verifikasiLSP(modalLSP.address, modalCID);
      setFeedback("Menunggu konfirmasi transaksi... " + tx.hash);
      await tx.wait();
      setFeedback("✅ LSP berhasil diverifikasi!");
      setShowModal(false);
      fetchPendingLSPs();
    } catch (err) {
      setFeedback("❌ Gagal verifikasi: " + (err.reason || err.message));
    }
    setActionLoading("");
  }

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
    <div className="verif-lsp-container">
      <h2 className="verif-lsp-title">Verifikasi LSP</h2>
      {feedback && (
        <div className={`verif-lsp-feedback ${feedback.startsWith('✅') ? 'success' : 'error'}`}>{feedback}</div>
      )}
      {loading ? (
        <div>Loading data...</div>
      ) : pendingLSPs.length === 0 ? (
        <div className="verif-lsp-empty">
          <div className="verif-lsp-empty-icon">📭</div>
          <div className="verif-lsp-empty-title">Belum Ada Pengajuan LSP</div>
          <div className="verif-lsp-empty-desc">Saat ini belum ada LSP yang menunggu verifikasi.<br/>Silakan cek kembali nanti.</div>
        </div>
      ) : (
        <table className="verif-lsp-table">
          <thead>
            <tr>
              <th>Wallet</th>
              <th>Nama LSP</th>
              <th>Email</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pendingLSPs.map(lsp => (
              <tr key={lsp.address}>
                <td style={{fontFamily:'monospace'}}>{lsp.address}</td>
                <td>{lsp.metadata?.nama_lsp || <i>Unknown</i>}</td>
                <td>{lsp.metadata?.email_kontak || <i>-</i>}</td>
                <td>
                  <button
                    className="verif-lsp-btn verif"
                    onClick={()=>openVerifikasiModal(lsp)}
                    disabled={actionLoading!==''}
                  >
                    Verifikasi
                  </button>
                  <button
                    className="verif-lsp-btn tolak"
                    onClick={()=>handleTolak(lsp.address)}
                    disabled={actionLoading!==''}
                  >
                    Tolak
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Modal Verifikasi CID */}
      {showModal && (
        <div className="verif-lsp-modal-bg">
          <form
            onSubmit={e=>{e.preventDefault();handleVerifikasi();}}
            className="verif-lsp-modal"
          >
            <h3 className="verif-lsp-modal-title">Verifikasi LSP</h3>
            <div className="verif-lsp-modal-info">
              <span><b>Wallet:</b> <span style={{fontFamily:'monospace',fontSize:15}}>{modalLSP?.address}</span></span>
              <span><b>Nama LSP:</b> {modalLSP?.metadata?.nama_lsp || '-'}</span>
            </div>
            <label className="verif-lsp-modal-label">CID Surat Izin (IPFS)</label>
            <input
              type="text"
              value={modalCID}
              onChange={e=>setModalCID(e.target.value)}
              placeholder="Masukkan CID surat izin..."
              className="verif-lsp-modal-input"
              required
              autoFocus
            />
            <div className="verif-lsp-modal-actions">
              <button
                type="submit"
                className="verif-lsp-modal-btn simpan"
                disabled={actionLoading!==''}
              >
                Kirim
              </button>
              <button
                type="button"
                className="verif-lsp-modal-btn batal"
                onClick={()=>setShowModal(false)}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 