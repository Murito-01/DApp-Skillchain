import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { useWallet } from "../contexts/WalletContext";
import "./MonitoringSertifikat.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const SKEMA_LABELS = [
  "PJOI Pengendalian Pencemaran Udara",
  "PJ Pengendalian Pencemaran Udara",
  "PJO Pengolahan Air Limbah",
  "PJ Pengendalian Pencemaran Air"
];

export default function MonitoringSertifikat({ hanyaPeserta = false }) {
  const { account } = useWallet ? useWallet() : { account: undefined };
  const [sertifikatList, setSertifikatList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    fetchSertifikat();
  }, [account]);

  useEffect(() => {
    if (!search) setFiltered(sertifikatList);
    else {
      const s = search.toLowerCase();
      setFiltered(
        sertifikatList.filter(srt =>
          srt.peserta.toLowerCase().includes(s) ||
          SKEMA_LABELS[srt.skema]?.toLowerCase().includes(s) ||
          (srt.lulus ? "lulus" : "tidak lulus").includes(s)
        )
      );
    }
  }, [search, sertifikatList]);

  async function fetchSertifikat() {
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      const filter = contract.filters.SertifikasiDiajukan();
      const events = await contract.queryFilter(filter, 0, "latest");
      let list = [];
      for (const ev of events) {
        const peserta = ev.args.peserta;
        const sertifikasiID = ev.args.sertifikasiID;
        const s = await contract.getSertifikasi(sertifikasiID);
        const sudahSelesai = !s.aktif;
        if (hanyaPeserta) {
          if (peserta.toLowerCase() !== account?.toLowerCase()) continue;
          if (!sudahSelesai) continue;
        }
        list.push({
          peserta: s.peserta,
          skema: Number(s.skema),
          lulus: s.lulus,
          tanggalPengajuan: new Date(Number(s.tanggalPengajuan) * 1000),
          tanggalSelesai: s.tanggalSelesai ? new Date(Number(s.tanggalSelesai) * 1000) : null,
          lspPenilai: s.lspPenilai,
          sertifikatCID: s.sertifikatCID,
        });
      }
      setSertifikatList(list);
    } catch (err) {
      setSertifikatList([]);
    }
    setLoading(false);
  }

  return (
    <div className="ms-container">
      <h2 className="ms-title">Monitoring Sertifikat</h2>
      <input
        type="text"
        placeholder="Cari wallet, skema, atau status..."
        value={search}
        onChange={e=>setSearch(e.target.value)}
        className="ms-search"
      />
      <div className="ms-table-wrapper">
        <table className="ms-table">
          <thead>
            <tr>
              <th>Wallet Peserta</th>
              <th>Skema</th>
              <th>Status</th>
              <th>Tanggal Pengajuan</th>
              <th>Tanggal Selesai</th>
              <th>LSP Penilai</th>
              <th>CID Sertifikat</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="ms-empty-cell">Tidak ada sertifikat ditemukan.</td></tr>
            ) : filtered.map((srt, i) => {
              const statusLabel = (() => {
                if (!srt.tanggalSelesai) return {text:'Sedang Ujian', className:'ms-status-sedang'};
                if (srt.lulus) return {text:'Lulus', className:'ms-status-lulus'};
                return {text:'Tidak Lulus', className:'ms-status-gagal'};
              })();
              return (
                <tr key={i}>
                  <td className="ms-monospace ms-wallet-cell">{srt.peserta || '-'}</td>
                  <td>{SKEMA_LABELS[srt.skema] || '-'}</td>
                  <td>
                    <span className={`ms-status-label ${statusLabel.className}`}>
                      {statusLabel.text}
                    </span>
                  </td>
                  <td>{srt.tanggalPengajuan ? srt.tanggalPengajuan.toLocaleString('id-ID') : '-'}</td>
                  <td>{srt.tanggalSelesai ? srt.tanggalSelesai.toLocaleString('id-ID') : '-'}</td>
                  <td className="ms-monospace ms-lsp-cell">{srt.lspPenilai && srt.lspPenilai !== '0x0000000000000000000000000000000000000000' ? srt.lspPenilai : '-'}</td>
                  <td className="ms-monospace ms-cid-cell">{srt.sertifikatCID && srt.sertifikatCID !== '' ? srt.sertifikatCID : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 