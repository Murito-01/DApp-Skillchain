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
  const [nilaiMap, setNilaiMap] = useState({}); // { [pesertaAddr]: { tulis, praktek, wawancara, sudahInput, sertifikasiID } }
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { peserta, sertifikasiID, tipe: 'tulis'|'praktek'|'wawancara' }
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
    // eslint-disable-next-line
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
      const nilaiMapTemp = {};
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
          // Ambil riwayat sertifikasi dari contract.lihatRiwayatSertifikasi
          let sertifikasiID = null;
          let riwayat = [];
          try {
            riwayat = await contract.lihatRiwayatSertifikasi(addr);
            if (riwayat.length > 0) {
              sertifikasiID = riwayat[riwayat.length - 1]; // sertifikasi terakhir
            }
          } catch {}
          let nilai = { tulis: null, praktek: null, wawancara: null, sudahInput: false, sertifikasiID: sertifikasiID || "0x0000000000000000000000000000000000000000", sertifikatCID: "" };
          if (sertifikasiID && sertifikasiID !== "0x0000000000000000000000000000000000000000") {
            try {
              const n = await contract.getNilaiPeserta(sertifikasiID);
              const sertif = await contract.getSertifikasi(sertifikasiID);
              nilai = {
                tulis: Number(n[0]),
                praktek: Number(n[1]),
                wawancara: Number(n[2]),
                sudahInput: n[3],
                sertifikasiID,
                sertifikatCID: sertif.sertifikatCID || sertif[2]
              };
            } catch {}
          }
          nilaiMapTemp[addr] = nilai;
          list.push({
            address: addr,
            metadataCID: info[0],
            metadata,
          });
        }
      }
      setPesertaList(list);
      setNilaiMap(nilaiMapTemp);
    } catch (err) {
      setFeedback("Gagal mengambil data: " + (err.message || err));
    }
    setLoading(false);
  }

  function openInputModal(peserta) {
    const sertifikasiID = nilaiMap[peserta.address]?.sertifikasiID;
    setModal({ peserta, sertifikasiID });
    setInputTulis(0);
    setInputPraktek(0);
    setInputWawancara(0);
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
      const tx = await contract.inputNilaiPeserta(sertifikasiID, Number(inputTulis), Number(inputPraktek), Number(inputWawancara));
      setFeedback("Menunggu konfirmasi blockchain...");
      await tx.wait();
      setFeedback("Nilai berhasil diinput!");
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
        <div className="bnsp-card">Belum ada peserta.</div>
      ) : (
        <table className="peserta-lsp-table">
          <thead>
            <tr>
              <th>Wallet</th>
              <th>Nama</th>
              <th>Email</th>
              <th>Input Nilai</th>
              <th>Sertifikat</th>
            </tr>
          </thead>
          <tbody>
            {pesertaList.map(peserta => {
              const nilai = nilaiMap[peserta.address] || {};
              const sudahAjukan = nilai.sertifikasiID && nilai.sertifikasiID !== "0x0000000000000000000000000000000000000000";
              return (
                <tr key={peserta.address}>
                  <td className="wallet-cell">{peserta.address}</td>
                  <td>{peserta.metadata?.nama_lengkap || <i>Unknown</i>}</td>
                  <td>{peserta.metadata?.email_student_uii || <i>-</i>}</td>
                  <td className="status-cell">
                    {!sudahAjukan ? (
                      <span className="empty-label">Belum mengajukan</span>
                    ) : nilai.sudahInput ? (
                      <span className="status-label dinilai">Sudah dinilai</span>
                    ) : (
                      <button className="peserta-lsp-btn input-nilai-btn" onClick={()=>openInputModal(peserta)}>Input Nilai</button>
                    )}
                  </td>
                  <td className="sertifikat-cell">
                    {!sudahAjukan ? (
                      <span className="empty-label">-</span>
                    ) : nilai.sudahInput ? (
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