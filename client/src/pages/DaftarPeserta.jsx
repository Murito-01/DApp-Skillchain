import { useState } from "react";
import { ethers } from "ethers";
import contractABI from "../abi/MainContract.json";
import "./DaftarPeserta.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function DaftarPeserta() {
  const [formData, setFormData] = useState({
    nama_lengkap: "",
    nik: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    jenis_kelamin: "Laki-laki",
    alamat_ktp: "",
    email_student_uii: "",
    nomor_hp: "",
    id_sosmed: "",
  });

  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Menyimpan metadata...");

    try {
      const metadataJSON = JSON.stringify(formData);
      const metadataCID = await uploadToIPFS(metadataJSON);

      setStatus("Terhubung ke wallet...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

      setStatus("Mengirim transaksi ke blockchain...");

      const tx = await contract.daftarPeserta(metadataCID);
      await tx.wait();

      setStatus("Pendaftaran berhasil! 🎉");
    } catch (err) {
      console.error(err);
      setStatus("Terjadi kesalahan saat pendaftaran.");
    }
  };

  const uploadToIPFS = async (data) => {
    // Contoh placeholder CID statis (untuk testing offline)
    // Gantilah dengan integrasi ke IPFS sebenarnya
    console.log("Metadata yang diunggah ke IPFS:", data);
    return "bafkreigh2akisc...dummyCID"; 
  };

  return (
    <div className="daftar-container">
      <h2>Form Pendaftaran Peserta</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nama Lengkap</label>
          <input name="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>NIK (16 digit)</label>
          <input name="nik" value={formData.nik} onChange={handleChange} pattern="\d{16}" required />
        </div>
        <div className="form-group">
          <label>Tempat Lahir</label>
          <input name="tempat_lahir" value={formData.tempat_lahir} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Tanggal Lahir</label>
          <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Jenis Kelamin</label>
          <select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleChange}>
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </select>
        </div>
        <div className="form-group">
          <label>Alamat KTP</label>
          <textarea name="alamat_ktp" value={formData.alamat_ktp} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Email Student UII</label>
          <input type="email" name="email_student_uii" value={formData.email_student_uii} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Nomor HP</label>
          <input name="nomor_hp" value={formData.nomor_hp} onChange={handleChange} pattern="^08[0-9]{8,11}$" required />
        </div>
        <div className="form-group">
          <label>ID Sosial Media</label>
          <input name="id_sosmed" value={formData.id_sosmed} onChange={handleChange} required />
        </div>
        <button type="submit">Daftar</button>
      </form>
      <p>{status}</p>
    </div>
  );
}