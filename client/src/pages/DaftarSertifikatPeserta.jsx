import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { useWallet } from "../contexts/WalletContext";

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

  useEffect(() => {
    fetchSertifikat();
    // eslint-disable-next-line
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

  return (
    <div>
      <h2 style={{marginBottom:24, color:'#111'}}>Daftar Sertifikat</h2>
      <div style={{overflowX:'auto',background:'#fff',borderRadius:16,boxShadow:'0 2px 12px #0001',padding:0}}>
        <table style={{width:'100%',borderCollapse:'separate',borderSpacing:0,fontSize:15,minWidth:900,color:'#111'}}>
          <thead style={{position:'sticky',top:0,zIndex:2,background:'#f5f5f5',color:'#111'}}>
            <tr>
              <th style={{padding:'14px 10px',fontWeight:700,textAlign:'left',borderBottom:'2px solid #f0f0f0',color:'#111'}}>Skema</th>
              <th style={{padding:'14px 10px',fontWeight:700,textAlign:'left',borderBottom:'2px solid #f0f0f0',color:'#111'}}>Status</th>
              <th style={{padding:'14px 10px',fontWeight:700,textAlign:'left',borderBottom:'2px solid #f0f0f0',color:'#111'}}>Tanggal Pengajuan</th>
              <th style={{padding:'14px 10px',fontWeight:700,textAlign:'left',borderBottom:'2px solid #f0f0f0',color:'#111'}}>Tanggal Selesai</th>
              <th style={{padding:'14px 10px',fontWeight:700,textAlign:'left',borderBottom:'2px solid #f0f0f0',color:'#111'}}>LSP Penilai</th>
              <th style={{padding:'14px 10px',fontWeight:700,textAlign:'left',borderBottom:'2px solid #f0f0f0',color:'#111'}}>CID Sertifikat</th>
              <th style={{padding:'14px 10px',fontWeight:700,textAlign:'left',borderBottom:'2px solid #f0f0f0',color:'#111'}}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#888'}}>Memuat data...</td></tr>
            ) : sertifikatList.length === 0 ? (
              <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#888'}}>Tidak ada sertifikat ditemukan.</td></tr>
            ) : sertifikatList.map((srt, i) => {
              const statusLabel = (() => {
                if (srt.lulus) return {text:'Lulus', color:'#fff', bg:'#52c41a'};
                return {text:'Tidak Lulus', color:'#fff', bg:'#ff4d4f'};
              })();
              return (
                <tr key={i} style={{background:i%2===0?'#fcfcff':'#f7f8fa',transition:'background 0.18s',color:'#111'}}
                  onMouseOver={e=>e.currentTarget.style.background='#e8eafd'}
                  onMouseOut={e=>e.currentTarget.style.background=i%2===0?'#fcfcff':'#f7f8fa'}>
                  <td style={{padding:'13px 10px',color:'#111'}}>{SKEMA_LABELS[srt.skema] || '-'}</td>
                  <td style={{padding:'13px 10px'}}>
                    <span style={{display:'inline-block',padding:'3px 14px',borderRadius:12,fontWeight:600,fontSize:14,background:statusLabel.bg,color:statusLabel.color}}>
                      {statusLabel.text}
                    </span>
                  </td>
                  <td style={{padding:'13px 10px',color:'#111'}}>{srt.tanggalPengajuan ? srt.tanggalPengajuan.toLocaleString('id-ID') : '-'}</td>
                  <td style={{padding:'13px 10px',color:'#111'}}>{srt.tanggalSelesai ? srt.tanggalSelesai.toLocaleString('id-ID') : '-'}</td>
                  <td style={{fontFamily:'monospace',padding:'13px 10px',maxWidth:180,wordBreak:'break-all',fontSize:15,color:'#111'}}>{srt.lspPenilai && srt.lspPenilai !== '0x0000000000000000000000000000000000000000' ? srt.lspPenilai : '-'}</td>
                  <td style={{fontFamily:'monospace',padding:'13px 10px',maxWidth:220,wordBreak:'break-all',fontSize:15,color:'#111'}}>{srt.sertifikatCID && srt.sertifikatCID !== '' ? srt.sertifikatCID : '-'}</td>
                  <td style={{padding:'13px 10px',color:'#111'}}>
                    {srt.sertifikatCID && srt.sertifikatCID !== '' ? (
                      <>
                        <button
                          style={{
                            marginRight:8,
                            padding:'4px 12px',
                            borderRadius:6,
                            border:'none',
                            background:'#4f46e5',
                            color:'#fff',
                            fontSize:14,
                            fontWeight:500,
                            cursor:'pointer',
                            transition:'background 0.18s',
                          }}
                          onClick={()=>navigator.clipboard.writeText(srt.sertifikatCID)}
                          onMouseOver={e=>e.currentTarget.style.background='#3730a3'}
                          onMouseOut={e=>e.currentTarget.style.background='#4f46e5'}
                        >Copy CID</button>
                        <a href={`https://ipfs.io/ipfs/${srt.sertifikatCID}`} target="_blank" rel="noopener noreferrer" download
                          style={{padding:'4px 12px',borderRadius:6,border:'none',background:'#4f46e5',color:'#fff',fontSize:14,fontWeight:500,textDecoration:'none',transition:'background 0.18s',cursor:'pointer'}}
                          onMouseOver={e=>e.currentTarget.style.background='#3730a3'}
                          onMouseOut={e=>e.currentTarget.style.background='#4f46e5'}
                        >Unduh</a>
                      </>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 