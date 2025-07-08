import { useState, useEffect } from "react";
import PesertaProfile from "./PesertaProfile";
import DaftarSertifikatPeserta from "./DaftarSertifikatPeserta";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { useWallet } from "../contexts/WalletContext";
import "./PesertaDashboard.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const SKEMA_SERTIFIKASI = {
  0: "Okupasi PJOI Pengendalian Pencemaran Udara",
  1: "Okupasi PJ Pengendalian Pencemaran Udara",
  2: "Okupasi PJO Pengolahan Air Limbah",
  3: "Okupasi PJ Pengendalian Pencemaran Air"
};

function AjukanSertifikasiPage() {
  const { account } = useWallet ? useWallet() : { account: undefined };
  const [selectedSkema, setSelectedSkema] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [sertifikasiAktif, setSertifikasiAktif] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchStatusAktif();
    // eslint-disable-next-line
  }, [account]);

  async function fetchStatusAktif() {
    setStatus("");
    try {
      if (!window.ethereum || !account) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      const pesertaInfo = await contract.getPesertaInfo(account);
      setProfile(pesertaInfo);
      if (pesertaInfo.sertifikasiAktif && pesertaInfo.sertifikasiAktif !== "0x0000000000000000000000000000000000000000") {
        const sertifikasiData = await contract.getSertifikasi(pesertaInfo.sertifikasiAktif);
        setSertifikasiAktif(sertifikasiData);
      } else {
        setSertifikasiAktif(null);
      }
    } catch (err) {
      setStatus("❌ " + (err.reason || err.message));
    }
  }

  const ajukanSertifikasi = async () => {
    if (!window.ethereum) {
      setStatus("❌ MetaMask tidak terdeteksi");
      return;
    }
    setIsSubmitting(true);
    setStatus("Mengirim pengajuan sertifikasi...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
      const tx = await contract.ajukanSertifikasi(selectedSkema);
      setStatus("Menunggu konfirmasi transaksi...\nHash: " + tx.hash);
      await tx.wait();
      setStatus("✅ Sertifikasi berhasil diajukan!");
      await fetchStatusAktif();
    } catch (err) {
      if (err.code === 4001) {
        setStatus("❌ Transaksi dibatalkan oleh user.");
      } else {
        setStatus("❌ Error: " + (err.reason || err.message));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  function formatTimestamp(timestamp) {
    if (!timestamp || timestamp === 0) return "-";
    return new Date(Number(timestamp) * 1000).toLocaleString('id-ID');
  }

  return (
    <div style={{padding:32}}>
      <h2 style={{marginBottom:24, color:'#111'}}>Ajukan Sertifikasi</h2>
      <div style={{background:'#fff',borderRadius:16,padding:32,boxShadow:'0 2px 12px #0001',color:'#111',maxWidth:520}}>
        {status && <div style={{marginBottom:18,fontWeight:500,color:status.startsWith('❌')?'#cf1322':status.startsWith('✅')?'#389e0d':'#222'}}>{status}</div>}
        {sertifikasiAktif ? (
          <div>
            <h3 style={{marginBottom:12}}>Status Sertifikasi</h3>
            <hr style={{border:'none',borderTop:'2px solid #2563eb',margin:'0 0 18px 0'}} />
            <div style={{marginBottom:10}}>
              <span style={{fontWeight:600}}>Status:</span>{' '}
              <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                <span style={{display:'inline-block',width:13,height:13,borderRadius:'50%',background:'#fde047',border:'1.5px solid #facc15',marginRight:6}}></span>
                <span style={{fontWeight:500,color:'#ad8b00'}}>Sedang Berlangsung</span>
              </span>
            </div>
            <div style={{marginBottom:10}}><span style={{fontWeight:600}}>Skema:</span> {SKEMA_SERTIFIKASI[sertifikasiAktif.skema]}</div>
            <div style={{marginBottom:10}}><span style={{fontWeight:600}}>Tanggal Pengajuan:</span> {formatTimestamp(sertifikasiAktif.tanggalPengajuan)}</div>
            <div style={{marginBottom:10}}><span style={{fontWeight:600}}>Tanggal Selesai:</span> {sertifikasiAktif.tanggalSelesai ? formatTimestamp(sertifikasiAktif.tanggalSelesai) : '-'}</div>
            <div style={{marginBottom:10}}><span style={{fontWeight:600}}>LSP Penilai:</span> {sertifikasiAktif.lspPenilai !== '0x0000000000000000000000000000000000000000' ? sertifikasiAktif.lspPenilai : '-'}</div>
          </div>
        ) : (
          <>
            <h3 style={{marginBottom:12}}>Pilih Skema Sertifikasi</h3>
            <hr style={{border:'none',borderTop:'2px solid #2563eb',margin:'0 0 18px 0'}} />
            <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:24}}>
              {Object.entries(SKEMA_SERTIFIKASI).map(([key, value]) => (
                <label key={key} style={{display:'flex',alignItems:'center',gap:10,fontSize:16,cursor:'pointer'}}>
                  <input
                    type="radio"
                    name="skema"
                    value={key}
                    checked={selectedSkema === parseInt(key)}
                    onChange={e => setSelectedSkema(parseInt(e.target.value))}
                    style={{accentColor:'#2563eb',width:18,height:18}}
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>
            <button
              onClick={ajukanSertifikasi}
              disabled={isSubmitting}
              style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 22px',background:'#22c55e',color:'#fff',fontWeight:600,fontSize:17,border:'none',borderRadius:8,cursor:isSubmitting?'not-allowed':'pointer',boxShadow:'0 2px 8px #0001'}}
            >
              <span role="img" aria-label="sertifikat">📄</span> Ajukan Sertifikasi
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const MENU = [
  { key: "profil", label: "Profil", icon: "👤" },
  { key: "ajukan", label: "Ajukan Sertifikasi", icon: "📝" },
  { key: "daftar", label: "Daftar Sertifikat", icon: "📜" },
];

export default function PesertaDashboard() {
  const [activeMenu, setActiveMenu] = useState("profil");

  return (
    <div className="bnsp-sidebar-layout">
      <aside className="bnsp-sidebar bnsp-sidebar-card">
        <div className="bnsp-sidebar-title">Peserta Dashboard</div>
        <nav className="bnsp-sidebar-menu">
          {MENU.map(m => (
            <button
              key={m.key}
              className={"bnsp-sidebar-menu-item" + (activeMenu === m.key ? " active" : "")}
              onClick={() => setActiveMenu(m.key)}
            >
              <span className="bnsp-sidebar-menu-icon">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="bnsp-sidebar-content">
        {activeMenu === "profil" && <PesertaProfile />}
        {activeMenu === "ajukan" && <AjukanSertifikasiPage />}
        {activeMenu === "daftar" && <DaftarSertifikatPeserta />}
      </main>
    </div>
  );
} 