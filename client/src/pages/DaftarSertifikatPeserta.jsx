import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { useWallet } from "../contexts/WalletContext";
import { decryptFileFromIPFS, getOrCreateAesKeyIv } from "../lib/encrypt";
import "./DaftarSertifikatPeserta.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const SKEMA_LABELS = [
  "PJOI Pengendalian Pencemaran Udara",
  "PJ Pengendalian Pencemaran Udara",
  "PJO Pengolahan Air Limbah",
  "PJ Pengendalian Pencemaran Air"
];

export default function DaftarSertifikatPeserta() {
  const { account } = useWallet ? useWallet() : { account: undefined };
  const [sertifikatList, setSertifikatList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nilaiModal, setNilaiModal] = useState(null);

  useEffect(() => {
    fetchSertifikat();
  }, [account]);

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
        if (peserta.toLowerCase() !== account?.toLowerCase()) continue;
        if (!sudahSelesai) continue;
        list.push({
          sertifikasiID,
          skema: Number(s.skema),
          lulus: s.lulus,
          tanggalPengajuan: s.tanggalPengajuan ? new Date(Number(s.tanggalPengajuan) * 1000) : null,
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

  async function handleLihatNilai(sertifikasiID) {
    if (!sertifikasiID || typeof sertifikasiID !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(sertifikasiID)) {
      alert('ID sertifikasi tidak valid.');
      return;
    }
    try {
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      const n = await contract.getNilaiPeserta(sertifikasiID);
      setNilaiModal({
        sertifikasiID,
        tulis: Number(n[0]),
        praktek: Number(n[1]),
        wawancara: Number(n[2]),
        sudahInput: n[3]
      });
    } catch (e) {
      alert('Gagal mengambil nilai: ' + (e.message || e));
    }
  }

  return (
    <div className="dsp-container">
      <h2 className="dsp-title">Daftar Sertifikat</h2>
      <div className="dsp-table-wrapper">
        <table className="dsp-table">
          <thead>
            <tr>
              <th>Skema</th>
              <th>Status</th>
              <th>Tanggal Pengajuan</th>
              <th>Tanggal Selesai</th>
              <th>LSP Penilai</th>
              <th>CID Sertifikat</th>
              <th>Nilai</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="dsp-empty-row">Memuat data...</td></tr>
            ) : sertifikatList.length === 0 ? (
              <tr><td colSpan={8} className="dsp-empty-row">Tidak ada sertifikat ditemukan.</td></tr>
            ) : sertifikatList.map((srt, i) => {
              const statusLabel = (() => {
                if (srt.lulus) return {text:'Lulus', className:'dsp-status-label dsp-status-lulus'};
                return {text:'Tidak Lulus', className:'dsp-status-label dsp-status-gagal'};
              })();
              return (
                <tr key={i}>
                  <td>{SKEMA_LABELS[srt.skema] || '-'}</td>
                  <td><span className={statusLabel.className}>{statusLabel.text}</span></td>
                  <td>{srt.tanggalPengajuan ? srt.tanggalPengajuan.toLocaleString('id-ID') : '-'}</td>
                  <td>{srt.tanggalSelesai ? srt.tanggalSelesai.toLocaleString('id-ID') : '-'}</td>
                  <td className="dsp-monospace">{srt.lspPenilai && srt.lspPenilai !== '0x0000000000000000000000000000000000000000' ? srt.lspPenilai : '-'}</td>
                  <td className="dsp-monospace">{srt.sertifikatCID && srt.sertifikatCID !== '' ? srt.sertifikatCID : '-'}</td>
                  <td>
                    {srt.sertifikasiID && typeof srt.sertifikasiID === 'string' && /^0x[a-fA-F0-9]{40}$/.test(srt.sertifikasiID) ? (
                      <button className="dsp-btn" onClick={()=>handleLihatNilai(srt.sertifikasiID)}>Lihat Nilai</button>
                    ) : (
                      <span style={{color:'#bbb'}}>Tidak tersedia</span>
                    )}
                  </td>
                  <td>
                    {srt.sertifikatCID && srt.sertifikatCID !== '' ? (
                      <>
                        <button
                          className="dsp-btn"
                          onClick={()=>navigator.clipboard.writeText(srt.sertifikatCID)}
                        >Copy</button>
                        <button
                          className="dsp-btn"
                          onClick={async()=>{
                            try {
                              const res = await fetch(`https://gateway.pinata.cloud/ipfs/${srt.sertifikatCID}`);
                              const encrypted = await res.text();
                              const { keyHex, ivHex } = getOrCreateAesKeyIv();
                              const bytes = decryptFileFromIPFS(encrypted, keyHex, ivHex);
                              const blob = new Blob([bytes], { type: "application/pdf" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'sertifikat.pdf';
                              document.body.appendChild(a);
                              a.click();
                              setTimeout(()=>{
                                URL.revokeObjectURL(url);
                                a.remove();
                              }, 1000);
                            } catch (e) {
                              alert('Gagal mendekripsi atau mengunduh file: ' + (e.message || e));
                            }
                          }}
                        >Unduh</button>
                      </>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {nilaiModal && (
        <div className="dsp-modal-bg" onClick={()=>setNilaiModal(null)}>
          <div className="dsp-modal-card" onClick={e=>e.stopPropagation()}>
            <h3 className="dsp-modal-title">Detail Nilai Sertifikasi</h3>
            <div className="dsp-nilai-list">
              <div className="dsp-nilai-item"><span className="dsp-nilai-label">Nilai Tulis</span><span className="dsp-nilai-value">{nilaiModal.tulis}</span></div>
              <div className="dsp-nilai-item"><span className="dsp-nilai-label">Nilai Praktek</span><span className="dsp-nilai-value">{nilaiModal.praktek}</span></div>
              <div className="dsp-nilai-item"><span className="dsp-nilai-label">Nilai Wawancara</span><span className="dsp-nilai-value">{nilaiModal.wawancara}</span></div>
            </div>
            <button className="dsp-modal-btn" onClick={()=>setNilaiModal(null)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
} 