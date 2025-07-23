import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { decryptData, getOrCreateAesKeyIv } from "../lib/encrypt";
import "./MonitoringPeserta.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function MonitoringPeserta() {
  const [pesertaList, setPesertaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    fetchPeserta();
  }, []);

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
          list.push({
            address: addr,
            metadataCID: info[0],
            metadata,
            tanggalDaftar: new Date(Number(info[4]) * 1000),
          });
        }
      }
      setPesertaList(list);
    } catch (err) {
      setPesertaList([]);
    }
    setLoading(false);
  }

  return (
    <div className="mp-container">
      <h2 className="mp-title">Monitoring Peserta</h2>
      <input
        type="text"
        placeholder="Cari nama, email, atau wallet..."
        value={search}
        onChange={e=>setSearch(e.target.value)}
        className="mp-search"
      />
      {loading ? (
        <div>Loading data...</div>
      ) : filtered.length === 0 ? (
        <div style={{marginTop:48, display:'flex', justifyContent:'center'}}>
          <div className="mp-empty-row">
            <div className="mp-empty-icon">👥</div>
            <div className="mp-empty-title">Belum Ada Peserta</div>
            <div className="mp-empty-desc">Saat ini belum ada peserta yang terdaftar atau sesuai pencarian.<br/>Silakan cek kembali nanti.</div>
          </div>
        </div>
      ) : (
        <div className="mp-table-wrapper">
          <table className="mp-table">
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Nama</th>
                <th>Email</th>
                <th>Tanggal Daftar</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(peserta => (
                <tr key={peserta.address}>
                  <td className="mp-monospace">{peserta.address}</td>
                  <td>{peserta.metadata?.nama_lengkap || <i>Unknown</i>}</td>
                  <td>{peserta.metadata?.email_peserta || <i>-</i>}</td>
                  <td>{peserta.tanggalDaftar.toLocaleString('id-ID')}</td>
                  <td>
                    <button className="mp-btn" onClick={()=>{setShowModal(true);setModalData(peserta);}}>Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && modalData && (
        <div className="mp-modal-bg" onClick={()=>setShowModal(false)}>
          <div className="mp-modal" onClick={e=>e.stopPropagation()}>
            <h2 className="mp-modal-title">Detail Peserta</h2>
            <ul className="mp-modal-list">
              <li><span className="mp-modal-label">Wallet:</span> <span className="mp-modal-monospace">{modalData.address}</span></li>
              {modalData.metadata && Object.entries(modalData.metadata).map(([k,v])=>(
                <li key={k}><span className="mp-modal-label">{k.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}:</span> <span>{v}</span></li>
              ))}
            </ul>
            <button className="mp-modal-btn" onClick={()=>setShowModal(false)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
} 