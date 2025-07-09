import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import "./PesertaLSP.css";
import { useWallet } from "../contexts/WalletContext";
import { useNavigate } from "react-router-dom";

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
  const [kelulusan, setKelulusan] = useState("lulus");
  const [alasanGagal, setAlasanGagal] = useState("");

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
        if (info[1]) { // terdaftar
          let metadata = null;
          try {
            const res = await fetch(`https://gateway.pinata.cloud/ipfs/${info[0]}`);
            metadata = await res.json();
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
                  lulus: sertif.lulus !== undefined ? sertif.lulus : sertif[3]
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
      // Input nilai sekaligus status lulus/gagal
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
  }

  async function handleUploadSertifikat(e) {
    e.preventDefault();
    if (!sertifikatFile) {
      setUploadStatus("Gagal: File belum dipilih");
      return;
    }
    setUploading(true);
    setUploadStatus("");
    try {
      // Upload ke Pinata
      const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
      const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;
      const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
      const formData = new FormData();
      formData.append("file", sertifikatFile);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Gagal upload ke Pinata");
      const data = await res.json();
      const cid = data.IpfsHash;
      // Update ke smart contract
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
      const tx = await contract.updateKelulusan(uploadModal.sertifikasiID, cid);
      setUploadStatus("Menunggu konfirmasi blockchain...");
      await tx.wait();
      setUploadStatus("Berhasil upload dan update sertifikat!");
      // Tambahkan delay 1 detik agar node sync
      await new Promise(res => setTimeout(res, 1000));
      await fetchPeserta();
      setUploadModal(null);
    } catch (err) {
      setUploadStatus("Gagal: " + (err.reason || err.message));
    }
    setUploading(false);
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

  return (
    <div className="peserta-lsp-container">
      <h2 className="peserta-lsp-title">Daftar Peserta</h2>
      {feedback && <div style={{marginBottom:16, color:feedback.startsWith('Nilai')? '#389e0d':'#cf1322', fontWeight:500}}>{feedback}</div>}
      {loading ? (
        <div>Loading data...</div>
      ) : pesertaList.length === 0 ? (
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
        <table className="peserta-lsp-table">
          <thead>
            <tr>
              <th>Wallet</th>
              <th>Nama</th>
              <th>Email</th>
              <th>Nilai</th>
              <th>Sertifikat</th>
            </tr>
          </thead>
          <tbody>
            {pesertaList.map((peserta, idx) => {
              const nilai = peserta.nilai || {};
              const sudahAjukan = nilai.sertifikasiID && nilai.sertifikasiID !== "0x0000000000000000000000000000000000000000";
              const isLulus = nilai.sudahInput && nilai.lulus;
              const isGagal = nilai.sudahInput && !nilai.lulus;
              return (
                <tr key={peserta.address + "-" + nilai.sertifikasiID + "-" + idx}>
                  <td className="wallet-cell">{peserta.address}</td>
                  <td>{peserta.metadata?.nama_lengkap || <i>Unknown</i>}</td>
                  <td>{peserta.metadata?.email_student_uii || <i>-</i>}</td>
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
                  <td className="sertifikat-cell">
                    {!sudahAjukan ? (
                      <span className="empty-label">-</span>
                    ) : nilai.sudahInput ? (
                      isLulus ? (
                        nilai.sertifikatCID ? (
                          <div className="cid-cell" title={nilai.sertifikatCID}>
                            <span className="cid-text">{nilai.sertifikatCID.slice(0, 8)}...{nilai.sertifikatCID.slice(-6)}</span>
                            <button className="copy-btn" onClick={()=>navigator.clipboard.writeText(nilai.sertifikatCID)}>Copy CID</button>
                            <a className="lihat-btn" href={`https://ipfs.io/ipfs/${nilai.sertifikatCID}`} target="_blank" rel="noopener noreferrer">Lihat</a>
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
                <label>
                  <input type="radio" name="kelulusan" value="lulus" checked={kelulusan==="lulus"} onChange={()=>setKelulusan("lulus")} /> Lulus
                </label>
                <label>
                  <input type="radio" name="kelulusan" value="gagal" checked={kelulusan==="gagal"} onChange={()=>setKelulusan("gagal")} /> Gagal
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
            <input type="file" accept="application/pdf,image/*" required onChange={e=>setSertifikatFile(e.target.files[0])} />
            <div className="peserta-lsp-modal-btn-row">
              <button type="submit" className="peserta-lsp-modal-btn" disabled={uploading}>{uploading ? 'Mengupload...' : 'Upload'}</button>
              <button type="button" className="peserta-lsp-modal-btn-cancel" onClick={()=>setUploadModal(null)} disabled={uploading}>Batal</button>
            </div>
            {uploadStatus && <div style={{marginTop:12, color:uploadStatus.startsWith('Gagal')?'#cf1322':'#389e0d'}}>{uploadStatus}</div>}
          </form>
        </div>
      )}
    </div>
  );
} 