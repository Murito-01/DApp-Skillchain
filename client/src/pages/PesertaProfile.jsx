import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import "./PesertaProfile.css";
import { decryptData, getOrCreateAesKeyIv } from "../lib/encrypt";

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
        const encrypted = await res.text();
        const { key, iv } = getOrCreateAesKeyIv();
        const plaintext = decryptData(encrypted, key, iv);
        const data = JSON.parse(plaintext);
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
    <div className="profile-container" style={{marginTop: 0, paddingTop: 8}}>
      <h2 className="profile-title">Profil Peserta</h2>
      {status && <div className={"profile-status" + (status.startsWith("❌") ? " error" : status.startsWith("✅") ? " success" : "")}>{status}</div>}
      {profile ? (
        <div className="profile-sections-row" style={{marginTop: 0, justifyContent: 'center', alignItems: 'flex-start'}}>
          <div className="profile-section" style={{minWidth:340,maxWidth:520,margin:'0 auto'}}>
            <h3>Data Pribadi</h3>
            <div className="profile-row"><span className="profile-label">Alamat Wallet:</span><span className="profile-value">{account}</span></div>
            <div className="profile-row"><span className="profile-label">Nama Lengkap:</span><span className="profile-value">{profile.nama_lengkap}</span></div>
            <div className="profile-row"><span className="profile-label">NIK:</span><span className="profile-value">{profile.nik}</span></div>
            <div className="profile-row"><span className="profile-label">Tempat Lahir:</span><span className="profile-value">{profile.tempat_lahir}</span></div>
            <div className="profile-row"><span className="profile-label">Tanggal Lahir:</span><span className="profile-value">{profile.tanggal_lahir}</span></div>
            <div className="profile-row"><span className="profile-label">Jenis Kelamin:</span><span className="profile-value">{profile.jenis_kelamin}</span></div>
            <div className="profile-row"><span className="profile-label">Alamat KTP:</span><span className="profile-value">{profile.alamat_ktp}</span></div>
            <div className="profile-row"><span className="profile-label">Email:</span><span className="profile-value">{profile.email_peserta}</span></div>
            <div className="profile-row"><span className="profile-label">Nomor HP:</span><span className="profile-value">{profile.nomor_hp}</span></div>
            <div className="profile-row"><span className="profile-label">ID Sosial Media:</span><span className="profile-value">{profile.id_sosmed}</span></div>
          </div>
        </div>
      ) : null}
    </div>
  );
} 