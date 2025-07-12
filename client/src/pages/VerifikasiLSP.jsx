import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import "./VerifikasiLSP.css";
import { decryptData, getOrCreateAesKeyIv, decryptFileFromIPFS, encryptData, generateRandomFilename } from "../lib/encrypt";
import CryptoJS from "crypto-js";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;

// Fungsi utilitas untuk fetch dan dekripsi JSON terenkripsi dari Pinata
async function fetchAndDecryptJsonFromPinata(cid) {
  if (!cid) return { error: 'CID kosong/null' };
  try {
    const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    const encrypted = await res.text();
    const { key, iv, keyHex, ivHex } = getOrCreateAesKeyIv();
    console.log('[DEBUG] CID:', cid, '| keyHex:', keyHex, '| ivHex:', ivHex, '| encrypted.length:', encrypted.length);
    try {
      const decryptedWordArray = CryptoJS.AES.decrypt(encrypted, key, { iv });
      const plaintext = decryptedWordArray.toString(CryptoJS.enc.Utf8);
      console.log('[DEBUG] plaintext:', plaintext);
      if (!plaintext) throw new Error('Malformed UTF-8 data');
      const obj = JSON.parse(plaintext);
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
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileBlobUrl, setFileBlobUrl] = useState("");
  const [fileType, setFileType] = useState("");

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
        const status = await contract.getStatusLSP(lspAddr);
        if (Number(status) === 0) {
          const lspData = await contract.getLSP(lspAddr);
          console.log('[DEBUG] getLSP result', { lspAddr, lspData });
          let metadata = null;
          try {
            metadata = await fetchAndDecryptJsonFromPinata(lspData[0]);
          } catch {
            metadata = null;
          }
          // Filter: hanya masukkan LSP yang metadata-nya berhasil didekripsi
          if (!metadata?.error) {
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
    console.log('[DEBUG] handleVerifikasi', {
      lspAddress: modalLSP?.address,
      modalCID,
      modalLSP
    });
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
      setFeedback("✅ LSP berhasil diverifikasi! Data akan diperbarui.");
      setShowModal(false);
      await fetchPendingLSPs();
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
      // 1. Baca file sebagai base64
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // 2. Enkripsi base64
      const { key, iv } = getOrCreateAesKeyIv();
      const encrypted = encryptData(fileBase64, key, iv);
      // 3. Buat file blob terenkripsi
      const encryptedBlob = new Blob([encrypted], { type: "text/plain" });
      // 4. Random filename
      const randomName = generateRandomFilename();
      // 5. Upload ke Pinata
      const formData = new FormData();
      formData.append("file", encryptedBlob, randomName);
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

  async function handleLihatAkteNotaris(cid, filenameGuess = "akte_notaris.pdf") {
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
          <colgroup>
            <col style={{width:'13%'}} />
            <col style={{width:'16%'}} />
            <col style={{width:'13%'}} />
            <col style={{width:'11%'}} />
            <col style={{width:'8%'}} />
            <col style={{width:'13%'}} />
            <col style={{width:'18%'}} />
            <col style={{textAlign:'center', minWidth:90, maxWidth:110}} />
          </colgroup>
          <thead>
            <tr>
              <th style={{textAlign:'left'}}>Wallet</th>
              <th style={{textAlign:'left'}}>Nama LSP</th>
              <th style={{textAlign:'left'}}>Email</th>
              <th style={{textAlign:'left'}}>Telepon</th>
              <th style={{textAlign:'left'}}>Jenis LSP</th>
              <th style={{textAlign:'left'}}>Website</th>
              <th style={{textAlign:'left'}}>CID Akte Notaris</th>
              <th style={{textAlign:'left', minWidth:90, maxWidth:110}}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pendingLSPs.map(lsp => (
              <tr key={lsp.address} className="verif-lsp-row">
                <td style={{fontFamily:'monospace', fontSize:13, textAlign:'center', maxWidth:120, wordBreak:'break-all', padding:'10px 8px'}}>{lsp.address}</td>
                <td style={{textAlign:'center', padding:'10px 8px'}}>{lsp.metadata?.error ? <span style={{color:'#e11d48',fontStyle:'italic'}}>{lsp.metadata.error}</span> : (lsp.metadata?.nama_lsp || <i>Unknown</i>)}</td>
                <td style={{textAlign:'center', padding:'10px 8px'}}>{lsp.metadata?.error ? '-' : (lsp.metadata?.email_kontak || <i>-</i>)}</td>
                <td style={{textAlign:'center', padding:'10px 8px'}}>{lsp.metadata?.error ? '-' : (lsp.metadata?.telepon || <i>-</i>)}</td>
                <td style={{textAlign:'center', padding:'10px 8px', color:'#22c55e', fontWeight:600}}>{lsp.metadata?.error ? '-' : (lsp.metadata?.jenis_lsp || <i>-</i>)}</td>
                <td style={{textAlign:'center', padding:'10px 8px'}}>{lsp.metadata?.error ? '-' : (lsp.metadata?.website ? (
                  <a href={lsp.metadata.website} target="_blank" rel="noopener noreferrer" style={{color:'#256d13',textDecoration:'underline',fontWeight:500}}>
                    {lsp.metadata.website.replace(/^https?:\/\//, '').split('/')[0]}
                  </a>
                ) : <i>-</i>)}</td>
                <td style={{textAlign:'center', padding:'10px 8px'}}>
                  {lsp.metadata?.akte_notaris_cid ? (
                    <span style={{background:'#e6ffed', color:'#111', padding:'2px 6px', borderRadius:4, display:'inline-block', position:'relative'}} title={lsp.metadata.akte_notaris_cid}>
                      {lsp.metadata.akte_notaris_cid.slice(0,8)}...{lsp.metadata.akte_notaris_cid.slice(-6)}
                      <button
                        style={{marginLeft:10, color:'#fff', textDecoration:'none', fontSize:14, verticalAlign:'middle', fontWeight:600, padding:'4px 16px', borderRadius:4, background:'#7c3aed', display:'inline-block', border:'none', cursor:'pointer'}}
                        onClick={() => handleLihatAkteNotaris(lsp.metadata.akte_notaris_cid, "akte_notaris.pdf")}
                      >
                        Lihat
                      </button>
                    </span>
                  ) : <i>-</i>}
                </td>
                <td style={{textAlign:'center', padding:'10px 4px', minWidth:90, maxWidth:110}}>
                  <button
                    className="verif-lsp-btn verif"
                    style={{padding:'0', width:36, height:36, minWidth:36, minHeight:36, maxWidth:36, maxHeight:36, borderRadius:8, fontSize:20, display:'inline-flex', alignItems:'center', justifyContent:'center', marginRight:6}}
                    onClick={()=>openVerifikasiModal(lsp)}
                    disabled={actionLoading!==''}
                    title="Verifikasi"
                  >
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 12.5L10 16.5L16 7.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    className="verif-lsp-btn tolak"
                    style={{padding:'0', width:36, height:36, minWidth:36, minHeight:36, maxWidth:36, maxHeight:36, borderRadius:8, fontSize:20, display:'inline-flex', alignItems:'center', justifyContent:'center'}}
                    onClick={()=>handleTolak(lsp.address)}
                    disabled={actionLoading!==''}
                    title="Tolak"
                  >
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="6" y1="6" x2="16" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                      <line x1="16" y1="6" x2="6" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
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
                <button type="button" onClick={handleCopyCID} style={{padding:"7px 18px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontWeight:600,fontSize:15,boxShadow:"0 2px 8px #0001"}}>Copy</button>
                <button type="button" onClick={()=>handleLihatAkteNotaris(uploadedCID, file ? file.name : "surat_izin.pdf")} style={{marginLeft:12,fontSize:15,color:'#fff',background:'#7c3aed',textDecoration:'none',fontWeight:600,padding:'7px 18px',borderRadius:7,border:'none',cursor:'pointer'}}>Lihat</button>
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
      {showFileModal && (
        <div className="verif-lsp-modal-bg" onClick={()=>setShowFileModal(false)}>
          <div className="verif-lsp-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:600}}>
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
            <button onClick={()=>setShowFileModal(false)} style={{marginLeft:10,marginTop:18,padding:'8px 18px',borderRadius:7,background:'#ef4444',color:'#fff',border:'none',fontWeight:600,cursor:'pointer'}}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
} 