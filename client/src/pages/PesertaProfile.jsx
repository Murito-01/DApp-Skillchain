import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import "./PesertaProfile.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

// Enum skema sertifikasi sesuai smart contract
const SKEMA_SERTIFIKASI = {
  0: "Okupasi PJOI Pengendalian Pencemaran Udara",
  1: "Okupasi PJ Pengendalian Pencemaran Udara", 
  2: "Okupasi PJO Pengolahan Air Limbah",
  3: "Okupasi PJ Pengendalian Pencemaran Air"
};

export default function PesertaProfile() {
  const [account, setAccount] = useState("");
  const [metadataCID, setMetadataCID] = useState("");
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("");
  const [sertifikasiAktif, setSertifikasiAktif] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSkema, setSelectedSkema] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sertifikatCID, setSertifikatCID] = useState("");
  const [loadingSertifikat, setLoadingSertifikat] = useState(false);

  // Ambil wallet yang sedang login
  useEffect(() => {
    async function getAccount() {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
      }
    }
    getAccount();
  }, []);

  // Ambil CID metadata dan data sertifikasi dari smart contract
  useEffect(() => {
    async function fetchData() {
      if (!account) return;
      setStatus("Mengambil data dari blockchain...");
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
        
        // Ambil data peserta
        const pesertaInfo = await contract.getPesertaInfo(account);
        if (!pesertaInfo.terdaftar) {
          setStatus("Data peserta tidak ditemukan. Silakan daftar terlebih dahulu.");
          setProfile(null);
          return;
        }
        
        setMetadataCID(pesertaInfo.metadataCID);
        
        // Cek sertifikasi aktif
        if (pesertaInfo.sertifikasiAktif !== "0x0000000000000000000000000000000000000000") {
          const sertifikasiData = await contract.getSertifikasi(pesertaInfo.sertifikasiAktif);
          setSertifikasiAktif(sertifikasiData);
        } else {
          setSertifikasiAktif(null);
        }
        
        setStatus("Mengambil data dari IPFS...");
        // Fetch data dari IPFS
        const url = `https://gateway.pinata.cloud/ipfs/${pesertaInfo.metadataCID}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Gagal fetch data dari IPFS");
        const data = await res.json();
        setProfile(data);
        setStatus("");
      } catch (err) {
        setStatus("❌ " + (err.reason || err.message));
      }
    }
    fetchData();
    // expose fetchData to be called after ajukan sertifikasi
    PesertaProfile.fetchData = fetchData;
  }, [account]);

  useEffect(() => {
    async function fetchSertifikatTerakhir() {
      if (!window.ethereum || !account) return;
      setLoadingSertifikat(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(import.meta.env.VITE_CONTRACT_ADDRESS, contractArtifact.abi, provider);
        const riwayat = await contract.lihatRiwayatSertifikasi(account);
        if (riwayat.length > 0) {
          const sertifikasiID = riwayat[riwayat.length - 1];
          const sertif = await contract.getSertifikasi(sertifikasiID);
          if (sertif.sertifikatCID && sertif.sertifikatCID.length > 0) {
            setSertifikatCID(sertif.sertifikatCID);
          } else if (sertif[2] && sertif[2].length > 0) {
            setSertifikatCID(sertif[2]);
          } else {
            setSertifikatCID("");
          }
        } else {
          setSertifikatCID("");
        }
      } catch {
        setSertifikatCID("");
      }
      setLoadingSertifikat(false);
    }
    fetchSertifikatTerakhir();
  }, [account]);

  // Fungsi ajukan sertifikasi
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
      console.log("Transaction hash:", tx.hash);
      setStatus("Menunggu konfirmasi transaksi...\nHash: " + tx.hash);
      
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
      
      setStatus("✅ Sertifikasi berhasil diajukan!");
      setShowModal(false);
      
      // Refresh data sertifikasi tanpa reload
      if (typeof PesertaProfile.fetchData === 'function') {
        await PesertaProfile.fetchData();
      }
      
    } catch (err) {
      console.error("Error submitting certification:", err);
      if (err.code === 4001) {
        setStatus("❌ Transaksi dibatalkan oleh user.");
      } else {
        setStatus("❌ Error: " + (err.reason || err.message));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp || timestamp === 0) return "-";
    return new Date(Number(timestamp) * 1000).toLocaleString('id-ID');
  };

  return (
    <div className="profile-container">
      <h2 className="profile-title">Profil Peserta</h2>
      {status && <div className={"profile-status" + (status.startsWith("❌") ? " error" : status.startsWith("✅") ? " success" : "")}>{status}</div>}
      
      {profile ? (
        <div className="profile-sections-row">
          <div className="profile-section">
            <h3>Data Pribadi</h3>
            <div className="profile-row"><span className="profile-label">Alamat Wallet:</span><span className="profile-value">{account}</span></div>
            <div className="profile-row"><span className="profile-label">CID Metadata:</span><span className="profile-value">{metadataCID}</span></div>
            <div className="profile-row"><span className="profile-label">Nama Lengkap:</span><span className="profile-value">{profile.nama_lengkap}</span></div>
            <div className="profile-row"><span className="profile-label">NIK:</span><span className="profile-value">{profile.nik}</span></div>
            <div className="profile-row"><span className="profile-label">Tempat Lahir:</span><span className="profile-value">{profile.tempat_lahir}</span></div>
            <div className="profile-row"><span className="profile-label">Tanggal Lahir:</span><span className="profile-value">{profile.tanggal_lahir}</span></div>
            <div className="profile-row"><span className="profile-label">Jenis Kelamin:</span><span className="profile-value">{profile.jenis_kelamin}</span></div>
            <div className="profile-row"><span className="profile-label">Alamat KTP:</span><span className="profile-value">{profile.alamat_ktp}</span></div>
            <div className="profile-row"><span className="profile-label">Email Student UII:</span><span className="profile-value">{profile.email_student_uii}</span></div>
            <div className="profile-row"><span className="profile-label">Nomor HP:</span><span className="profile-value">{profile.nomor_hp}</span></div>
            <div className="profile-row"><span className="profile-label">ID Sosial Media:</span><span className="profile-value">{profile.id_sosmed}</span></div>
          </div>

          <div className="profile-section">
            <h3>Status Sertifikasi</h3>
            {sertifikasiAktif ? (
              <div>
                <div className="profile-row">
                  <span className="profile-label">Status:</span>
                  <span className="profile-value">
                    {sertifikasiAktif.aktif ? "🟡 Sudah Terdaftar" : sertifikasiAktif.lulus ? "🟢 Lulus" : "🔴 Tidak Lulus"}
                  </span>
                </div>
                <div className="profile-row">
                  <span className="profile-label">Skema:</span>
                  <span className="profile-value">{SKEMA_SERTIFIKASI[sertifikasiAktif.skema]}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-label">Tanggal Pengajuan:</span>
                  <span className="profile-value">{formatTimestamp(sertifikasiAktif.tanggalPengajuan)}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-label">Tanggal Selesai:</span>
                  <span className="profile-value">{formatTimestamp(sertifikasiAktif.tanggalSelesai)}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-label">LSP Penilai:</span>
                  <span className="profile-value">{sertifikasiAktif.lspPenilai !== "0x0000000000000000000000000000000000000000" ? sertifikasiAktif.lspPenilai : "-"}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-label">Sertifikat CID:</span>
                  <span className="profile-value">{sertifikasiAktif.sertifikatCID && sertifikasiAktif.sertifikatCID !== "" ? sertifikasiAktif.sertifikatCID : "-"}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-label">Alasan Gagal:</span>
                  <span className="profile-value error">{sertifikasiAktif.alasanGagal && sertifikasiAktif.alasanGagal !== "" ? sertifikasiAktif.alasanGagal : "-"}</span>
                </div>
              </div>
            ) : (
              <div>
                <p>Belum ada sertifikasi yang diajukan.</p>
                <button 
                  onClick={() => setShowModal(true)} 
                  className="btn-ajukan-sertifikasi"
                >
                  📝 Ajukan Sertifikasi
                </button>
              </div>
            )}
          </div>
        </div>
      ) : !status && (
        <div>Data peserta tidak ditemukan atau belum mendaftar.</div>
      )}

      {/* Tambahkan section Sertifikat Terakhir jika ada */}
      {loadingSertifikat ? (
        <div style={{marginTop:24, textAlign:'center'}}>Memuat sertifikat terakhir...</div>
      ) : sertifikatCID ? (
        <div className="peserta-sertifikat-section">
          <h3>Sertifikat Terakhir</h3>
          <div className="sertifikat-cid-row">
            <span className="cid-text" title={sertifikatCID}>{sertifikatCID.slice(0, 10)}...{sertifikatCID.slice(-6)}</span>
            <button className="copy-btn" onClick={()=>navigator.clipboard.writeText(sertifikatCID)}>Copy CID</button>
            <a className="lihat-btn" href={`https://ipfs.io/ipfs/${sertifikatCID}`} target="_blank" rel="noopener noreferrer" download>Unduh Sertifikat</a>
          </div>
        </div>
      ) : null}

      {/* Modal Pilih Skema */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Pilih Skema Sertifikasi</h3>
            <div className="skema-options">
              {Object.entries(SKEMA_SERTIFIKASI).map(([key, value]) => (
                <label key={key} className="skema-option">
                  <input
                    type="radio"
                    name="skema"
                    value={key}
                    checked={selectedSkema === parseInt(key)}
                    onChange={(e) => setSelectedSkema(parseInt(e.target.value))}
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setShowModal(false)} 
                disabled={isSubmitting}
                className="btn-cancel"
              >
                Batal
              </button>
              <button 
                onClick={ajukanSertifikasi} 
                disabled={isSubmitting}
                className="btn-submit"
              >
                {isSubmitting ? "Mengirim..." : "Ajukan Sertifikasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 