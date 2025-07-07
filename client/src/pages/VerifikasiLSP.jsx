import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import "./VerifikasiLSP.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;

export default function VerifikasiLSP() {
  const [pendingLSPs, setPendingLSPs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalCID, setModalCID] = useState("");
  const [modalLSP, setModalLSP] = useState(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCID, setUploadedCID] = useState("");

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
    setFile(null);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadedCID("");
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

  async function handleUploadSuratIzin(e) {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadedCID("");
    setFeedback("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "https://api.pinata.cloud/pinning/pinFileToIPFS");
      xhr.setRequestHeader("pinata_api_key", PINATA_API_KEY);
      xhr.setRequestHeader("pinata_secret_api_key", PINATA_SECRET_API_KEY);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setUploadedCID(data.IpfsHash);
          setModalCID(data.IpfsHash);
          setFeedback("✅ Upload berhasil!");
        } else {
          setFeedback("❌ Gagal upload ke Pinata");
        }
      };
      xhr.onerror = () => {
        setIsUploading(false);
        setFeedback("❌ Gagal upload ke Pinata");
      };
      xhr.send(formData);
    } catch (err) {
      setIsUploading(false);
      setFeedback("❌ " + (err.message || "Gagal upload ke Pinata"));
    }
  }

  function handleCopyCID() {
    if (uploadedCID) {
      navigator.clipboard.writeText(uploadedCID);
      setFeedback("CID berhasil dicopy ke clipboard!");
    }
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
            {/* Upload Surat Izin */}
            <div style={{marginTop:18,marginBottom:10}}>
              <label style={{fontWeight:600,fontSize:15,color:"#222"}}>Upload Surat Izin (PDF/JPG/PNG)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e=>setFile(e.target.files[0])}
                disabled={isUploading || !!uploadedCID}
                style={{marginTop:6,marginBottom:8,fontSize:15}}
              />
              {file && !uploadedCID && (
                <div style={{fontSize:14,color:"#333",marginBottom:6}}><b>File:</b> {file.name} ({(file.size/1024).toFixed(1)} KB)</div>
              )}
              {isUploading && (
                <div style={{marginBottom:8}}>
                  <div style={{height:8,background:"#eee",borderRadius:6,overflow:"hidden"}}>
                    <div style={{width:`${uploadProgress}%`,height:8,background:"#4f46e5",transition:"width .3s"}}></div>
                  </div>
                  <div style={{fontSize:12,marginTop:2,color:"#111"}}>{uploadProgress}%</div>
                </div>
              )}
              {!uploadedCID && (
                <button
                  type="button"
                  onClick={handleUploadSuratIzin}
                  disabled={isUploading || !file}
                  style={{padding:"10px 0",background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:16,cursor:isUploading?"not-allowed":"pointer",opacity:isUploading?0.6:1,marginTop:6,boxShadow:"0 2px 8px #0001",width:'100%'}}
                >
                  {isUploading ? "Mengupload..." : "Upload Surat Izin"}
                </button>
              )}
            </div>
            {/* Tampilkan CID hasil upload */}
            {uploadedCID && (
              <div style={{marginTop:18,marginBottom:10,padding:10,background:'#f6ffed',borderRadius:8,border:'1.5px solid #b7eb8f'}}>
                <div style={{fontSize:15,marginBottom:6}}><b>CID Surat Izin:</b></div>
                <div style={{fontFamily:'monospace',fontSize:15,wordBreak:'break-all',marginBottom:8}}>{uploadedCID}</div>
                <button type="button" onClick={handleCopyCID} style={{padding:"7px 18px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontWeight:600,fontSize:15,boxShadow:"0 2px 8px #0001"}}>Copy CID</button>
                <a href={`https://ipfs.io/ipfs/${uploadedCID}`} target="_blank" rel="noopener noreferrer" style={{marginLeft:12,fontSize:15,color:'#4f46e5',textDecoration:'underline',fontWeight:600}}>Lihat</a>
              </div>
            )}
            <div className="verif-lsp-modal-actions">
              <button
                type="submit"
                className="verif-lsp-modal-btn simpan"
                disabled={actionLoading!=='' || !uploadedCID}
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