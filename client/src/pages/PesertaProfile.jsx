import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractABI from "../abi/MainContract.json";
import "./PesertaProfile.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function PesertaProfile() {
  const [account, setAccount] = useState("");
  const [metadataCID, setMetadataCID] = useState("");
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("");

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

  // Ambil CID metadata dari smart contract
  useEffect(() => {
    async function fetchCID() {
      if (!account) return;
      setStatus("Mengambil metadata dari blockchain...");
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const cid = await contract.getMetadataCID(account);
        if (!cid || cid === "" || cid === "0x") {
          setStatus("Data peserta tidak ditemukan. Silakan daftar terlebih dahulu.");
          setProfile(null);
          return;
        }
        setMetadataCID(cid);
        setStatus("Mengambil data dari IPFS...");
        // Fetch data dari IPFS
        const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Gagal fetch data dari IPFS");
        const data = await res.json();
        setProfile(data);
        setStatus("");
      } catch (err) {
        setStatus("❌ " + (err.reason || err.message));
      }
    }
    fetchCID();
  }, [account]);

  return (
    <div className="profile-container">
      <h2 className="profile-title">Profil Peserta</h2>
      {status && <div className={"profile-status" + (status.startsWith("❌") ? " error" : "")}>{status}</div>}
      {profile ? (
        <div>
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
      ) : !status && (
        <div>Data peserta tidak ditemukan atau belum mendaftar.</div>
      )}
    </div>
  );
} 