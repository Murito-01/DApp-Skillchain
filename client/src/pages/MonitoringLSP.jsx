import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { decryptData, getOrCreateAesKeyIv, decryptFileFromIPFS } from "../lib/encrypt";
import "./MonitoringLSP.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const STATUS_LABELS = [
  "Menunggu Verifikasi",
  "Aktif",
  "Ditolak"
];

// Fungsi utilitas untuk fetch dan dekripsi JSON terenkripsi dari Pinata
async function fetchAndDecryptJsonFromPinata(cid) {
  if (!cid) return { error: 'CID kosong/null' };
  try {
    const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    const encrypted = await res.text();
    const { key, iv, keyHex, ivHex } = getOrCreateAesKeyIv();
    console.log('[DEBUG] CID:', cid, '| keyHex:', keyHex, '| ivHex:', ivHex, '| encrypted.length:', encrypted.length);
    try {
      const plain = decryptData(encrypted, key, iv);
      console.log('[DEBUG] plaintext:', plain);
      if (!plain) throw new Error('Malformed UTF-8 data');
      const obj = JSON.parse(plain);
      return obj;
    } catch (e) {
      console.error('[DECRYPT] Error:', e, '| encrypted:', encrypted, '| keyHex:', keyHex, '| ivHex:', ivHex);
      return { error: 'Gagal dekripsi' };
    }
  } catch (e) {
    console.error('[FETCH] Error:', e);
    return { error: 'Gagal fetch data IPFS' };
  }
}

export default function MonitoringLSP() {
  const [lspList, setLspList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileBlobUrl, setFileBlobUrl] = useState("");
  const [fileType, setFileType] = useState("");

  useEffect(() => {
    fetchLSP();
  }, []);

  useEffect(() => {
    if (!search) setFiltered(lspList);
    else {
      const s = search.toLowerCase();
      setFiltered(
        lspList.filter(lsp =>
          (lsp.metadata?.nama_lsp || "").toLowerCase().includes(s) ||
          (lsp.metadata?.email_kontak || "").toLowerCase().includes(s) ||
          lsp.address.toLowerCase().includes(s) ||
          STATUS_LABELS[lsp.status]?.toLowerCase().includes(s)
        )
      );
    }
  }, [search, lspList]);

  async function fetchLSP() {
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      const filter = contract.filters.LSPDidaftarkan();
      const events = await contract.queryFilter(filter, 0, "latest");
      const list = [];
      for (const ev of events) {
        const addr = ev.args.lsp;
        const lspData = await contract.getLSP(addr);
        const status = await contract.getStatusLSP(addr);
        let metadata = null;
        try {
          metadata = await fetchAndDecryptJsonFromPinata(lspData[0]);
        } catch {
          metadata = null;
        }
        // Filter: hanya masukkan LSP yang metadata-nya berhasil didekripsi
        if (!metadata?.error) {
          list.push({
            address: addr,
            metadataCID: lspData[0],
            status: Number(status),
            suratIzinCID: lspData[2],
            alasanTolak: lspData[3],
            metadata,
          });
        }
      }
      setLspList(list);
    } catch (err) {
      setLspList([]);
    }
    setLoading(false);
  }

  return (
    <div className="mlsp-container">
      <h2 className="mlsp-title">Monitoring LSP</h2>
      <input
        type="text"
        placeholder="Cari nama, email, wallet, atau status..."
        value={search}
        onChange={e=>setSearch(e.target.value)}
        className="mlsp-search"
      />
      {loading ? (
        <div>Loading data...</div>
      ) : filtered.length === 0 ? (
        <div style={{marginTop:48, display:'flex', justifyContent:'center'}}>
          <div className="mlsp-empty-card">
            <div className="mlsp-empty-icon">🏢</div>
            <div className="mlsp-empty-title">Belum Ada LSP</div>
            <div className="mlsp-empty-desc">Saat ini belum ada LSP yang terdaftar atau sesuai pencarian.<br/>Silakan cek kembali nanti.<br/><span style={{color:'#ad8b00',fontSize:13}}></span></div>
          </div>
        </div>
      ) : (
        <table className="mlsp-table">
          <thead>
            <tr>
              <th>Wallet</th>
              <th>Nama LSP</th>
              <th>Email</th>
              <th>Status</th>
              <th>CID Surat Izin</th>
              <th>Alasan Tolak</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(lsp => (
              <tr key={lsp.address}>
                <td className="mlsp-monospace">{lsp.address}</td>
                <td>{lsp.metadata?.error ? <span style={{color:'#e11d48',fontStyle:'italic'}}>{lsp.metadata.error}</span> : (lsp.metadata?.nama_lsp || <i>Unknown</i>)}</td>
                <td>{lsp.metadata?.error ? '-' : (lsp.metadata?.email_kontak || <i>-</i>)}</td>
                <td>{STATUS_LABELS[lsp.status] || '-'}</td>
                <td className="mlsp-monospace">{lsp.suratIzinCID || <i>-</i>}</td>
                <td>{lsp.alasanTolak || <i>-</i>}</td>
                <td>
                  <button className="mlsp-btn" onClick={()=>{setShowModal(true);setModalData(lsp);}}>Detail</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showModal && modalData && (
        <div className="mlsp-modal-bg" onClick={()=>setShowModal(false)}>
          <div className="mlsp-modal" onClick={e=>e.stopPropagation()}>
            <h2>Detail LSP</h2>
            <ul>
              <li><span className="mlsp-modal-label">Wallet:</span> <span className="mlsp-modal-monospace">{modalData.address}</span></li>
              {modalData.metadata && Object.entries(modalData.metadata).map(([k,v])=>{
                if(k==="akte_notaris_cid") return null;
                return <li key={k}><span className="mlsp-modal-label">{k.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}:</span> <span>{v}</span></li>;
              })}
              {modalData.metadata && modalData.metadata.akte_notaris_cid && (
                <li>
                  <span className="mlsp-modal-label">Akte Notaris:</span> 
                  <button className="mlsp-btn" style={{marginLeft:8}} onClick={async()=>{
                    setShowFileModal(true);
                    setFileBlobUrl("");
                    setFileType("");
                    try {
                      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${modalData.metadata.akte_notaris_cid}`);
                      const encrypted = await res.text();
                      const { keyHex, ivHex } = getOrCreateAesKeyIv();
                      const bytes = decryptFileFromIPFS(encrypted, keyHex, ivHex);
                      let type = "application/pdf";
                      if (modalData.metadata.akte_notaris_cid.endsWith(".jpg") || modalData.metadata.akte_notaris_cid.endsWith(".jpeg")) type = "image/jpeg";
                      if (modalData.metadata.akte_notaris_cid.endsWith(".png")) type = "image/png";
                      const blob = new Blob([bytes], { type });
                      setFileBlobUrl(URL.createObjectURL(blob));
                      setFileType(type);
                    } catch (e) {
                      alert("Gagal mendekripsi file: " + e.message);
                      setShowFileModal(false);
                    }
                  }}>Lihat</button>
                </li>
              )}
            </ul>
            <button className="mlsp-modal-btn" onClick={()=>setShowModal(false)}>Tutup</button>
          </div>
        </div>
      )}
      {showFileModal && (
        <div className="mlsp-modal-file-bg" onClick={()=>{setShowFileModal(false);if(fileBlobUrl)URL.revokeObjectURL(fileBlobUrl);}}>
          <div className="mlsp-modal-file" onClick={e=>e.stopPropagation()}>
            <h3>Akte Notaris</h3>
            {fileBlobUrl ? (
              fileType.startsWith("image/") ? (
                <img src={fileBlobUrl} alt="Akte Notaris" style={{maxWidth:"100%", maxHeight:400, marginTop:16}} />
              ) : (
                <iframe src={fileBlobUrl} style={{width:"100%",height:"400px", marginTop:16}} title="Akte Notaris" />
              )
            ) : (
              <div>Loading file...</div>
            )}
            {fileBlobUrl && (
              <a href={fileBlobUrl} download="akte_notaris" style={{marginTop:18,display:"inline-block",fontWeight:600,color:'#4f46e5',textDecoration:'underline'}}>Download File</a>
            )}
            <button className="mlsp-modal-btn" style={{marginTop:18,background:'#ef4444'}} onClick={()=>setShowFileModal(false)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
} 