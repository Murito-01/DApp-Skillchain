import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const SKEMA_LABELS = [
  "PJOI Pengendalian Pencemaran Udara",
  "PJ Pengendalian Pencemaran Udara",
  "PJO Pengolahan Air Limbah",
  "PJ Pengendalian Pencemaran Air"
];

export default function MonitoringSertifikat() {
  const [sertifikatList, setSertifikatList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    fetchSertifikat();
    // eslint-disable-next-line
  }, []);

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
      const list = [];
      for (const ev of events) {
        const peserta = ev.args.peserta;
        const sertifikasiID = ev.args.sertifikasiID;
        const s = await contract.getSertifikasi(sertifikasiID);
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
    <div>
      <h2 style={{marginBottom:24, color:'#111'}}>Monitoring Sertifikat</h2>
      <input
        type="text"
        placeholder="Cari wallet, skema, atau status..."
        value={search}
        onChange={e=>setSearch(e.target.value)}
        style={{padding:8,marginBottom:18,borderRadius:6,border:'1px solid #bbb',width:320,maxWidth:'100%'}}
      />
      {loading ? (
        <div>Loading data...</div>
      ) : filtered.length === 0 ? (
        <div style={{marginTop:24}}>Tidak ada sertifikat ditemukan.</div>
      ) : (
        <table style={{width:'100%',background:'#fff',borderRadius:12,boxShadow:'0 2px 8px #0001',overflow:'hidden',color:'#111'}}>
          <thead style={{background:'#f5f5f5',color:'#111'}}>
            <tr>
              <th style={{padding:8}}>Wallet Peserta</th>
              <th style={{padding:8}}>Skema</th>
              <th style={{padding:8}}>Status</th>
              <th style={{padding:8}}>Tanggal Pengajuan</th>
              <th style={{padding:8}}>Tanggal Selesai</th>
              <th style={{padding:8}}>LSP Penilai</th>
              <th style={{padding:8}}>CID Sertifikat</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((srt, i) => (
              <tr key={i}>
                <td style={{fontFamily:'monospace',padding:8}}>{srt.peserta}</td>
                <td style={{padding:8}}>{SKEMA_LABELS[srt.skema] || '-'}</td>
                <td style={{padding:8}}>{(() => {
                  if (!srt.tanggalSelesai) return 'Sedang Ujian';
                  if (srt.lulus) return 'Lulus';
                  return 'Tidak Lulus';
                })()}</td>
                <td style={{padding:8}}>{srt.tanggalPengajuan.toLocaleString('id-ID')}</td>
                <td style={{padding:8}}>{srt.tanggalSelesai ? srt.tanggalSelesai.toLocaleString('id-ID') : '-'}</td>
                <td style={{fontFamily:'monospace',padding:8}}>{srt.lspPenilai !== '0x0000000000000000000000000000000000000000' ? srt.lspPenilai : '-'}</td>
                <td style={{fontFamily:'monospace',padding:8}}>{srt.sertifikatCID || <i>-</i>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 