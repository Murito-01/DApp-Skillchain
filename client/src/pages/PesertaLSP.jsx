import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import "./PesertaLSP.css";
import { useWallet } from "../contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { decryptData, getOrCreateAesKeyIv, encryptData, generateRandomFilename, decryptFileFromIPFS } from "../lib/encrypt";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function PesertaLSP() {
  const { role, account, isConnected } = useWallet();
  const navigate = useNavigate();
  const [pesertaList, setPesertaList] = useState([]);
  const [nilaiMap, setNilaiMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [inputTulis, setInputTulis] = useState(0);
  const [inputPraktek, setInputPraktek] = useState(0);
  const [inputWawancara, setInputWawancara] = useState(0);
  const [uploadModal, setUploadModal] = useState(null);
  const [sertifikatFile, setSertifikatFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [kelulusan, setKelulusan] = useState("lulus");
  const [alasanGagal, setAlasanGagal] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [fileBlobUrl, setFileBlobUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
      return;
    }
    if (role !== "lsp") {
      navigate("/");
      return;
    }
    fetchPeserta();
  }, [isConnected, role, navigate]);

  useEffect(() => {
    if (!search) setFiltered(pesertaList);
    else {
      const s = search.toLowerCase();
      setFiltered(
        pesertaList.filter(p =>
          (p.metadata?.nama_lengkap || "").toLowerCase().includes(s) ||
          (p.metadata?.email_peserta || "").toLowerCase().includes(s) ||
          p.address.toLowerCase().includes(s)
        )
      );
    }
  }, [search, pesertaList]);

  async function fetchPeserta() {
    setLoading(true);
    setFeedback("");
    try {
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      const filter = contract.filters.PesertaTerdaftar();
      const events = await contract.queryFilter(filter, 0, "latest");
      const list = [];
      for (const ev of events) {
        const addr = ev.args.peserta;
        const info = await contract.getPesertaInfo(addr);
        if (info[1]) {
          let metadata = null;
          try {
            const res = await fetch(`https://gateway.pinata.cloud/ipfs/${info[0]}`);
            const encrypted = await res.text();
            const { key, iv } = getOrCreateAesKeyIv();
            const plaintext = decryptData(encrypted, key, iv);
            metadata = JSON.parse(plaintext);
          } catch {
            metadata = null;
          }
          let riwayat = [];
          try {
            riwayat = await contract.lihatRiwayatSertifikasi(addr);
          } catch {}
          for (const sertifikasiID of riwayat) {
            if (sertifikasiID && sertifikasiID !== "0x0000000000000000000000000000000000000000") {
              let nilai = { tulis: null, praktek: null, wawancara: null, sudahInput: false, sertifikasiID, sertifikatCID: "", lulus: null };
              try {
                const n = await contract.getNilaiPeserta(sertifikasiID);
                const sertif = await contract.getSertifikasi(sertifikasiID);
                nilai = {
                  tulis: Number(n[0]),
                  praktek: Number(n[1]),
                  wawancara: Number(n[2]),
                  sudahInput: n[3],
                  sertifikasiID,
                  sertifikatCID: sertif.sertifikatCID || sertif[2],
                  lulus: sertif.lulus !== undefined ? sertif.lulus : sertif[3],
                  skema: Number(sertif.skema !== undefined ? sertif.skema : sertif[1])
                };
              } catch {}
              list.push({
                address: addr,
                metadataCID: info[0],
                metadata,
                nilai
              });
            }
          }
        }
      }
      setPesertaList(list);
    } catch (err) {
      setFeedback("Gagal mengambil data: " + (err.message || err));
    }
    setLoading(false);
  }

  function openInputModal(peserta) {
    const sertifikasiID = peserta.nilai?.sertifikasiID;
    setModal({ peserta, sertifikasiID });
    setInputTulis(0);
    setInputPraktek(0);
    setInputWawancara(0);
    setKelulusan("lulus");
    setAlasanGagal("");
    setFeedback("");
  }

  async function handleSubmitNilai(e) {
    e.preventDefault();
    setActionLoading(true);
    setFeedback("");
    try {
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
      const { peserta, sertifikasiID } = modal;
      // Input nilai sekaligus status lulus/Gagal
      const txNilai = await contract.inputNilaiPeserta(
        sertifikasiID,
        Number(inputTulis),
        Number(inputPraktek),
        Number(inputWawancara),
        kelulusan === "lulus"
      );
      setFeedback("Menunggu konfirmasi blockchain (input nilai)...");
      await txNilai.wait();
      if (kelulusan === "lulus") {
        setFeedback("Nilai berhasil diinput! Peserta dinyatakan lulus. Silakan upload sertifikat.");
        // Upload sertifikat dilakukan di modal terpisah
      } else {
        // updateKegagalan tetap dipanggil untuk alasan gagal
        const txGagal = await contract.updateKegagalan(sertifikasiID, alasanGagal);
        setFeedback("Menunggu konfirmasi blockchain (update gagal)...");
        await txGagal.wait();
        setFeedback("Nilai berhasil diinput! Peserta dinyatakan gagal.");
      }
      await new Promise(res => setTimeout(res, 1000));
      await fetchPeserta();
      setModal(null);
    } catch (err) {
      setFeedback("Gagal input nilai: " + (err.reason || err.message));
    }
    setActionLoading(false);
  }

  function openUploadModal(peserta, sertifikasiID) {
    setUploadModal({ peserta, sertifikasiID });
    setSertifikatFile(null);
    setUploadStatus("");
    setUploadProgress(0);
  }

  async function handleUploadSertifikat(e) {
    e.preventDefault();
    if (!sertifikatFile) {
      setUploadStatus("Gagal: File belum dipilih");
      return;
    }
    setUploading(true);
    setUploadStatus("");
    setUploadProgress(0);
    try {
      // Enkripsi file sertifikat sebelum upload ke Pinata
      // 1. Baca file sebagai base64
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(sertifikatFile);
      });
      // 2. Enkripsi base64
      const { key, iv } = getOrCreateAesKeyIv();
      const encrypted = encryptData(fileBase64, key, iv);
      // 3. Buat file blob terenkripsi
      const encryptedBlob = new Blob([encrypted], { type: "text/plain" });
      // 4. Random filename
      const randomName = generateRandomFilename();
      // 5. Upload ke Pinata dengan XMLHttpRequest untuk progress tracking
      const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
      const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;
      const formData = new FormData();
      formData.append("file", encryptedBlob, randomName);
      
      const uploadResult = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "https://api.pinata.cloud/pinning/pinFileToIPFS");
        xhr.setRequestHeader("pinata_api_key", PINATA_API_KEY);
        xhr.setRequestHeader("pinata_secret_api_key", PINATA_SECRET_API_KEY);
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
            setUploadStatus(`Mengupload... ${progress}%`);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } else {
            reject(new Error("Gagal upload ke Pinata"));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error("Gagal upload ke Pinata"));
        };
        
        xhr.send(formData);
      });

      const cid = uploadResult.IpfsHash;
      setUploadStatus("Upload selesai, memperbarui blockchain...");
      
      // Update ke smart contract
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
      const tx = await contract.updateKelulusan(uploadModal.sertifikasiID, cid);
      setUploadStatus("Menunggu konfirmasi blockchain...");
      await tx.wait();
      setUploadStatus("Berhasil upload dan update sertifikat!");
      await new Promise(res => setTimeout(res, 1000));
      await fetchPeserta();
      setUploadModal(null);
    } catch (err) {
      setUploadStatus("Gagal: " + (err.reason || err.message));
      setUploadProgress(0);
    }
    setUploading(false);
  }

  async function handleLihatSertifikat(cid, filenameGuess = "sertifikat.pdf") {
    setShowModal(true);
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
      setShowModal(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="peserta-lsp-container">
        <div style={{textAlign: 'center', padding: '50px', color: '#cf1322'}}>
          <h2>❌ Akses Ditolak</h2>
          <p>Silakan hubungkan wallet terlebih dahulu.</p>
        </div>
      </div>
    );
  }
  if (role !== "lsp") {
    return (
      <div className="peserta-lsp-container">
        <div style={{textAlign: 'center', padding: '50px', color: '#cf1322'}}>
          <h2>❌ Akses Ditolak</h2>
          <p>Halaman ini hanya dapat diakses oleh LSP yang sudah diverifikasi.</p>
          <p>Status Anda saat ini: {role === "lsp-candidate" ? "Menunggu verifikasi" : "Tidak terdaftar"}</p>
        </div>
      </div>
    );
  }

  const SKEMA_LABELS = [
    "PJOI Pengendalian Pencemaran Udara",
    "PJ Pengendalian Pencemaran Udara",
    "PJO Pengolahan Air Limbah",
    "PJ Pengendalian Pencemaran Air"
  ];

  return (
    <div className={`peserta-lsp-container ${filtered.length > 0 ? 'has-table' : ''}`}>
      <h2 className="peserta-lsp-title">Daftar Peserta</h2>
      {feedback && <div style={{marginBottom:16, color:feedback.startsWith('Nilai')? '#389e0d':'#cf1322', fontWeight:500}}>{feedback}</div>}
      {loading ? (
        <div>Loading data...</div>
      ) : filtered.length === 0 ? (
        <div className="bnsp-card" style={{textAlign:'center', padding:'40px 20px', color:'#595959'}}>
          <div style={{fontSize:48, marginBottom:16}}>🎓</div>
          <h3 style={{color:'#3b3b99', marginBottom:8}}>Belum ada peserta yang mendaftar</h3>
          <p style={{marginBottom:8}}>
            Saat ini, belum ada peserta yang terdaftar untuk sertifikasi di LSP Anda.<br/>
            Peserta yang sudah mendaftar akan otomatis muncul di halaman ini.
          </p>
          <ul style={{textAlign:'left', display:'inline-block', margin:'16px auto 0', paddingLeft:20, color:'#888'}}>
            <li>Pastikan peserta sudah melakukan pendaftaran melalui aplikasi.</li>
            <li>Halaman ini akan terupdate otomatis jika ada peserta baru.</li>
            <li>Refresh halaman jika data belum muncul setelah beberapa saat.</li>
          </ul>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Cari nama, email, atau wallet..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
            className="peserta-lsp-search"
            style={{marginBottom:18, 
              width:'100%', 
              maxWidth:400, 
              padding:'8px 14px', 
              borderRadius:8, 
              border:'1.5px solid #c7d2fe', 
              fontSize:'1rem',
              background: 'white',
              color: 'black'}}
          />
          <table className="peserta-lsp-table">
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Nama</th>
                <th>Email</th>
                <th>Skema</th>
                <th>Nilai</th>
                <th>Aksi</th>
                <th>Sertifikat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((peserta, idx) => {
                const nilai = peserta.nilai || {};
                const sudahAjukan = nilai.sertifikasiID && nilai.sertifikasiID !== "0x0000000000000000000000000000000000000000";
                const isLulus = nilai.sudahInput && nilai.lulus;
                const isGagal = nilai.sudahInput && !nilai.lulus;
                return (
                  <tr key={peserta.address + "-" + nilai.sertifikasiID + "-" + idx}>
                    <td className="wallet-cell">{peserta.address}</td>
                    <td>{peserta.metadata?.nama_lengkap || <i>Unknown</i>}</td>
                    <td className="email-cell">{peserta.metadata?.email_peserta || <i>-</i>}</td>
                    <td className="skema-cell">{sudahAjukan && typeof nilai.skema !== 'undefined' ? SKEMA_LABELS[nilai.skema] || '-' : '-'}</td>
                    <td className="status-cell">
                      {!sudahAjukan ? (
                        <span className="empty-label">Belum mengajukan</span>
                      ) : nilai.sudahInput ? (
                        isLulus ? (
                          <span className="status-label dinilai" style={{color:'#389e0d', fontWeight:600}}>Lulus</span>
                        ) : (
                          <span className="status-label dinilai" style={{color:'#cf1322', fontWeight:600}}>Gagal</span>
                        )
                      ) : (
                        <button className="peserta-lsp-btn input-nilai-btn" onClick={()=>openInputModal(peserta)}>Input</button>
                      )}
                    </td>
                    <td className="aksi-cell">
                      <button className="peserta-lsp-btn detail-btn" onClick={()=>setShowDetailModal({peserta, nilai, isLulus, isGagal, sudahAjukan})}>Detail</button>
                    </td>
                    <td className="sertifikat-cell">
                      {!sudahAjukan ? (
                        <span className="empty-label">-</span>
                      ) : nilai.sudahInput ? (
                        isLulus ? (
                          nilai.sertifikatCID ? (
                            <div className="cid-cell" title={nilai.sertifikatCID}>
                              <span className="cid-text">{nilai.sertifikatCID.slice(0, 8)}...{nilai.sertifikatCID.slice(-6)}</span>
                              <button className="copy-btn" onClick={()=>navigator.clipboard.writeText(nilai.sertifikatCID)}>Copy</button>
                              <button className="lihat-btn" onClick={()=>handleLihatSertifikat(nilai.sertifikatCID, "sertifikat.pdf")}>Lihat</button>
                            </div>
                          ) : (
                            <button className="peserta-lsp-btn upload-sertifikat-btn" onClick={()=>openUploadModal(peserta, nilai.sertifikasiID)}>Upload Sertifikat</button>
                          )
                        ) : (
                          <span className="empty-label">-</span>
                        )
                      ) : (
                        <span className="empty-label">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      {/* Modal Input Nilai Sekaligus */}
      {modal && (
        <div className="peserta-lsp-modal-bg">
          <form className="peserta-lsp-modal" onSubmit={handleSubmitNilai}>
            <h3>Input Nilai Peserta</h3>
            <div><b>Wallet:</b> {modal.peserta.address}</div>
            <div><b>Nama:</b> {modal.peserta.metadata?.nama_lengkap || '-'}</div>
            <label>
              Nilai Tulis (0-100):
              <input type="number" min="0" max="100" required value={inputTulis} onChange={e=>setInputTulis(e.target.value)} />
            </label>
            <label>
              Nilai Praktek (0-100):
              <input type="number" min="0" max="100" required value={inputPraktek} onChange={e=>setInputPraktek(e.target.value)} />
            </label>
            <label>
              Nilai Wawancara (0-100):
              <input type="number" min="0" max="100" required value={inputWawancara} onChange={e=>setInputWawancara(e.target.value)} />
            </label>
            <div className="kelulusan-radio-row">
              <span className="kelulusan-radio-label">Status Kelulusan:</span>
              <div className="kelulusan-radio-options">
                <label className="radio-option">
                  <input type="radio" name="kelulusan" value="lulus" checked={kelulusan==="lulus"} onChange={()=>setKelulusan("lulus")} />
                  <span className="radio-text">Lulus</span>
                </label>
                <label className="radio-option">
                  <input type="radio" name="kelulusan" value="gagal" checked={kelulusan==="gagal"} onChange={()=>setKelulusan("gagal")} />
                  <span className="radio-text">Gagal</span>
                </label>
              </div>
            </div>
            {kelulusan === "gagal" && (
              <label>
                Alasan Gagal:
                <input type="text" required value={alasanGagal} onChange={e=>setAlasanGagal(e.target.value)} className="input-alasan-gagal" />
              </label>
            )}
            <div className="peserta-lsp-modal-btn-row">
              <button type="submit" className="peserta-lsp-modal-btn" disabled={actionLoading}>{actionLoading ? 'Menyimpan...' : 'Simpan'}</button>
              <button type="button" className="peserta-lsp-modal-btn-cancel" onClick={()=>setModal(null)} disabled={actionLoading}>Batal</button>
            </div>
          </form>
        </div>
      )}
      {/* Modal Upload Sertifikat */}
      {uploadModal && (
        <div className="peserta-lsp-modal-bg">
          <form className="peserta-lsp-modal" onSubmit={handleUploadSertifikat}>
            <h3>Upload Sertifikat Peserta</h3>
            <div><b>Wallet:</b> {uploadModal.peserta.address}</div>
            <div><b>Nama:</b> {uploadModal.peserta.metadata?.nama_lengkap || '-'}</div>
            <input 
              type="file" 
              accept="application/pdf,image/*" 
              required 
              onChange={e=>setSertifikatFile(e.target.files[0])} 
              disabled={uploading}
            />
            
            {/* Tampilkan info file yang dipilih */}
            {sertifikatFile && !uploading && (
              <div style={{fontSize:14,color:"#333",marginTop:8,marginBottom:8}}>
                <b>File:</b> {sertifikatFile.name} ({(sertifikatFile.size/1024).toFixed(1)} KB)
              </div>
            )}
            
            {/* Progress Bar */}
            {uploading && (
              <div style={{marginTop:12,marginBottom:12}}>
                <div style={{height:8,background:"#eee",borderRadius:6,overflow:"hidden"}}>
                  <div style={{
                    width:`${uploadProgress}%`,
                    height:8,
                    background:"#4f46e5",
                    transition:"width .3s"
                  }}></div>
                </div>
                <div style={{fontSize:12,marginTop:4,color:"#111"}}>{uploadProgress}%</div>
              </div>
            )}
            
            <div className="peserta-lsp-modal-btn-row">
              <button type="submit" className="peserta-lsp-modal-btn" disabled={uploading}>
                {uploading ? 'Mengupload...' : 'Upload'}
              </button>
              <button type="button" className="peserta-lsp-modal-btn-cancel" onClick={()=>setUploadModal(null)} disabled={uploading}>
                Batal
              </button>
            </div>
            {uploadStatus && (
              <div style={{
                marginTop:12, 
                color:uploadStatus.startsWith('Gagal')?'#cf1322':'#389e0d',
                fontSize:14,
                fontWeight:500
              }}>
                {uploadStatus}
              </div>
            )}
          </form>
        </div>
      )}
      {/* Modal Preview Sertifikat */}
      {showModal && (
        <div className="peserta-lsp-modal-bg" onClick={()=>{setShowModal(false); if(fileBlobUrl) URL.revokeObjectURL(fileBlobUrl);}}>
          <div className="peserta-lsp-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:600}}>
            {fileBlobUrl ? (
              fileType.startsWith("image/") ? (
                <img src={fileBlobUrl} alt="Sertifikat" style={{maxWidth:"100%", maxHeight:400, marginTop:16}} />
              ) : (
                <iframe src={fileBlobUrl} style={{width:"100%",height:"400px", marginTop:16}} title="Sertifikat" />
              )
            ) : (
              <div>Loading file...</div>
            )}
            {fileBlobUrl && (
              <a href={fileBlobUrl} download="sertifikat.pdf" style={{marginTop:18,display:"inline-block",fontWeight:600,color:'#4f46e5',textDecoration:'underline'}}>Download File</a>
            )}
            <button onClick={()=>{setShowModal(false); if(fileBlobUrl) URL.revokeObjectURL(fileBlobUrl);}} style={{marginLeft:10,marginTop:18,padding:'8px 18px',borderRadius:7,background:'#ef4444',color:'#fff',border:'none',fontWeight:600,cursor:'pointer'}}>Tutup</button>
          </div>
        </div>
      )}
      {/* Tambahkan modal detail peserta */}
      {showDetailModal && (
        <div className="peserta-lsp-modal-bg" onClick={e=>{if(e.target.className==='peserta-lsp-modal-bg')setShowDetailModal(null)}}>
          <div className="peserta-lsp-modal" style={{maxWidth:420}}>
            <h3>Detail Peserta</h3>
            <div><b>Nama:</b> {showDetailModal.peserta.metadata?.nama_lengkap || '-'}</div>
            <div><b>Email:</b> {showDetailModal.peserta.metadata?.email_peserta || '-'}</div>
            <div><b>Wallet:</b> <span style={{fontFamily:'monospace',fontSize:13}}>{showDetailModal.peserta.address}</span></div>
            <div><b>Skema:</b> {typeof showDetailModal.nilai.skema !== 'undefined' ? SKEMA_LABELS[showDetailModal.nilai.skema] || '-' : '-'}</div>
            <div><b>Status:</b> {showDetailModal.sudahAjukan ? (showDetailModal.nilai.sudahInput ? (showDetailModal.isLulus ? <span style={{color:'#389e0d',fontWeight:600}}>Lulus</span> : <span style={{color:'#cf1322',fontWeight:600}}>Gagal</span>) : <span style={{color:'#faad14',fontWeight:600}}>Belum Dinilai</span>) : <span style={{color:'#bbb'}}>Belum Mengajukan</span>}</div>
            <hr style={{margin:'14px 0 10px 0',border:'none',borderTop:'1.5px solid #eee'}}/>
            {showDetailModal.peserta.metadata && Object.entries(showDetailModal.peserta.metadata).filter(([k])=>!['nama_lengkap','email_peserta'].includes(k)).map(([k,v])=>(
              <div key={k}><b>{k.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}:</b> {v}</div>
            ))}
            <button className="peserta-lsp-btn" style={{marginTop:18}} onClick={()=>setShowDetailModal(null)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}