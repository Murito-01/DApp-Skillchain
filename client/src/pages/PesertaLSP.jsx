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
  const [loading, setLoading] = useState(false);
  const [selectedPeserta, setSelectedPeserta] = useState(null);
  const [nilai, setNilai] = useState({ tulis: "", praktek: "", wawancara: "" });
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    // Validasi akses - hanya LSP yang sudah diverifikasi yang bisa akses
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
      // Ambil semua peserta dari event PesertaTerdaftar
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
          list.push({
            address: addr,
            metadataCID: info[0],
            metadata,
          });
        }
      }
      setPesertaList(list);
    } catch (err) {
      setFeedback("Gagal mengambil data: " + (err.message || err));
    }
    setLoading(false);
  }

  function openInputNilai(peserta) {
    setSelectedPeserta(peserta);
    setNilai({ tulis: "", praktek: "", wawancara: "" });
    setFeedback("");
  }

  async function handleSubmitNilai(e) {
    e.preventDefault();
    setFeedback("");
    // TODO: Panggil smart contract untuk simpan nilai
    setFeedback("(Simulasi) Nilai berhasil disimpan!");
    setSelectedPeserta(null);
  }

  // Jika tidak terhubung atau bukan LSP yang diverifikasi, tampilkan pesan error
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
      {feedback && <div style={{marginBottom:16, color:feedback.startsWith('(')? '#389e0d':'#cf1322', fontWeight:500}}>{feedback}</div>}
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
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pesertaList.map(peserta => (
              <tr key={peserta.address}>
                <td style={{fontFamily:'monospace'}}>{peserta.address}</td>
                <td>{peserta.metadata?.nama_lengkap || <i>Unknown</i>}</td>
                <td>{peserta.metadata?.email_student_uii || <i>-</i>}</td>
                <td>
                  <button className="peserta-lsp-btn" onClick={()=>openInputNilai(peserta)}>Input Nilai</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Modal Input Nilai */}
      {selectedPeserta && (
        <div className="peserta-lsp-modal-bg">
          <form className="peserta-lsp-modal" onSubmit={handleSubmitNilai}>
            <h3>Input Nilai Peserta</h3>
            <div><b>Wallet:</b> {selectedPeserta.address}</div>
            <div><b>Nama:</b> {selectedPeserta.metadata?.nama_lengkap || '-'}</div>
            <label>Ujian Tulis
              <input type="number" min="0" max="100" required value={nilai.tulis} onChange={e=>setNilai({...nilai, tulis:e.target.value})} />
            </label>
            <label>Ujian Praktek
              <input type="number" min="0" max="100" required value={nilai.praktek} onChange={e=>setNilai({...nilai, praktek:e.target.value})} />
            </label>
            <label>Ujian Wawancara
              <input type="number" min="0" max="100" required value={nilai.wawancara} onChange={e=>setNilai({...nilai, wawancara:e.target.value})} />
            </label>
            <div className="peserta-lsp-modal-btn-row">
              <button type="submit" className="peserta-lsp-modal-btn">Simpan</button>
              <button type="button" className="peserta-lsp-modal-btn-cancel" onClick={()=>setSelectedPeserta(null)}>Batal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 