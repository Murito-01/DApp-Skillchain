import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { decryptData, getOrCreateAesKeyIv, decryptFileFromIPFS } from "../lib/encrypt";

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
    <div>
      <h2 style={{marginBottom:24, color:'#111'}}>Monitoring LSP</h2>
      <input
        type="text"
        placeholder="Cari nama, email, wallet, atau status..."
        value={search}
        onChange={e=>setSearch(e.target.value)}
        style={{padding:8,marginBottom:18,borderRadius:6,border:'1px solid #bbb',width:320,maxWidth:'100%'}}
      />
      {loading ? (
        <div>Loading data...</div>
      ) : filtered.length === 0 ? (
        <div style={{marginTop:48, display:'flex', justifyContent:'center'}}>
          <div style={{background:'#fff', borderRadius:16, boxShadow:'0 2px 12px #0001', padding:'40px 48px', textAlign:'center', minWidth:320}}>
            <div style={{fontSize:54, marginBottom:12}}>🏢</div>
            <div style={{fontWeight:700, fontSize:22, color:'#222', marginBottom:8}}>Belum Ada LSP</div>
            <div style={{fontSize:16, color:'#444'}}>Saat ini belum ada LSP yang terdaftar atau sesuai pencarian.<br/>Silakan cek kembali nanti.<br/><span style={{color:'#ad8b00',fontSize:13}}></span></div>
          </div>
        </div>
      ) : (
        <table style={{width:'100%',background:'#fff',borderRadius:12,boxShadow:'0 2px 8px #0001',overflow:'hidden',color:'#111'}}>
          <thead style={{background:'#f5f5f5',color:'#111'}}>
            <tr>
              <th style={{padding:8, textAlign:'left'}}>Wallet</th>
              <th style={{padding:8, textAlign:'left'}}>Nama LSP</th>
              <th style={{padding:8, textAlign:'left'}}>Email</th>
              <th style={{padding:8, textAlign:'left'}}>Status</th>
              <th style={{padding:8, textAlign:'left'}}>CID Surat Izin</th>
              <th style={{padding:8, textAlign:'left'}}>Alasan Tolak</th>
              <th style={{padding:8, textAlign:'left'}}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(lsp => (
              <tr key={lsp.address}>
                <td style={{fontFamily:'monospace',padding:8}}>{lsp.address}</td>
                <td style={{padding:8}}>{lsp.metadata?.error ? <span style={{color:'#e11d48',fontStyle:'italic'}}>{lsp.metadata.error}</span> : (lsp.metadata?.nama_lsp || <i>Unknown</i>)}</td>
                <td style={{padding:8}}>{lsp.metadata?.error ? '-' : (lsp.metadata?.email_kontak || <i>-</i>)}</td>
                <td style={{padding:8}}>{STATUS_LABELS[lsp.status] || '-'}</td>
                <td style={{padding:8,fontFamily:'monospace'}}>{lsp.suratIzinCID || <i>-</i>}</td>
                <td style={{padding:8}}>{lsp.alasanTolak || <i>-</i>}</td>
                <td style={{padding:8}}>
                  <button style={{padding:'4px 12px',borderRadius:6,border:'none',background:'#4f46e5',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer'}} onClick={()=>{setShowModal(true);setModalData(lsp);}}>Detail</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showModal && modalData && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'#0008',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowModal(false)}>
          <div style={{background:'#fff',borderRadius:16,padding:'32px 36px',minWidth:320,maxWidth:440,boxShadow:'0 2px 24px #0003',position:'relative',color:'#222'}} onClick={e=>e.stopPropagation()}>
            <h2 style={{marginBottom:22, fontWeight:700, fontSize:24, textAlign:'center', letterSpacing:0.5}}>Detail LSP</h2>
            <ul style={{listStyle:'none',padding:0,margin:0}}>
              <li style={{marginBottom:12,overflowWrap:'break-word',wordBreak:'break-word',maxWidth:'100%'}}><span style={{fontWeight:600, color:'#4f46e5'}}>Wallet:</span> <span style={{fontFamily:'monospace'}}>{modalData.address}</span></li>
              {modalData.metadata && Object.entries(modalData.metadata).map(([k,v])=>{
                if(k==="akte_notaris_cid") return null;
                return <li key={k} style={{marginBottom:12,overflowWrap:'break-word',wordBreak:'break-word',maxWidth:'100%'}}><span style={{fontWeight:600, color:'#4f46e5'}}>{k.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}:</span> <span>{v}</span></li>;
              })}
              {modalData.metadata && modalData.metadata.akte_notaris_cid && (
                <li style={{marginBottom:12}}>
                  <span style={{fontWeight:600, color:'#4f46e5'}}>Akte Notaris:</span> 
                  <button style={{marginLeft:8,padding:'4px 14px',borderRadius:6,border:'none',background:'#4f46e5',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer'}} onClick={async()=>{
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
                  }}>Lihat Akte Notaris</button>
                </li>
              )}
            </ul>
            <button style={{marginTop:18,padding:'10px 28px',borderRadius:8,background:'#ef4444',color:'#fff',border:'none',fontWeight:700,cursor:'pointer',fontSize:16,display:'block',marginLeft:'auto',marginRight:'auto'}} onClick={()=>setShowModal(false)}>Tutup</button>
          </div>
        </div>
      )}
      {showFileModal && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'#0008',zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>{setShowFileModal(false);if(fileBlobUrl)URL.revokeObjectURL(fileBlobUrl);}}>
          <div style={{background:'#fff',borderRadius:16,padding:24,minWidth:320,maxWidth:600,boxShadow:'0 2px 24px #0003',position:'relative',color:'#222'}} onClick={e=>e.stopPropagation()}>
            <h3 style={{marginBottom:18}}>Akte Notaris</h3>
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
              <a href={fileBlobUrl} download="akte_notaris.pdf" style={{marginTop:18,display:"inline-block",fontWeight:600,color:'#4f46e5',textDecoration:'underline'}}>Download File</a>
            )}
            <button onClick={()=>{setShowFileModal(false);if(fileBlobUrl)URL.revokeObjectURL(fileBlobUrl);}} style={{marginLeft:10,marginTop:18,padding:'8px 18px',borderRadius:7,background:'#ef4444',color:'#fff',border:'none',fontWeight:600,cursor:'pointer'}}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
} 