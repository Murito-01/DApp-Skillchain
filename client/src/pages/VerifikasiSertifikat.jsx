import { useState } from "react";
import { ethers } from "ethers";
import "./VerifikasiSertifikat.css";
import MainContract from "../abi/MainContract.json";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

function VerifikasiSertifikat() {
  const [sertifikasiID, setSertifikasiID] = useState("");
  const [hasil, setHasil] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerifikasi = async () => {
    setLoading(true);
    setError("");
    setHasil(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        contractAddress,
        MainContract.abi,
        await provider
      );

      const isValid = await contract.verifikasiKelulusan(sertifikasiID);

      if (!isValid) {
        setHasil({
          valid: false,
        });
      } else {
        const detail = await contract.getDetailSertifikasi(sertifikasiID);
        const metadata = await contract.getPesertaMetadata(detail.peserta);
        const skemaNama = await contract.getSkemaNama(detail.skema);

        setHasil({
          valid: true,
          peserta: detail.peserta,
          sertifikatCID: detail.sertifikatCID,
          metadataCID: metadata,
          skema: skemaNama,
          tanggalSelesai: new Date(Number(detail.tanggalSelesai) * 1000).toLocaleDateString(),
        });
      }
    } catch (err) {
      setError("Terjadi kesalahan. Pastikan sertifikasi ID valid dan MetaMask terhubung.");
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="verifikasi-wrapper">
      <div className="verifikasi-container">
        <h2>Verifikasi Sertifikat</h2>
        <input
          type="text"
          placeholder="Masukkan Sertifikasi ID"
          value={sertifikasiID}
          onChange={(e) => setSertifikasiID(e.target.value)}
        />
        <button onClick={handleVerifikasi} disabled={loading || !sertifikasiID}>
          {loading ? "Memeriksa..." : "Verifikasi"}
        </button>

        {error && <p className="error-message">{error}</p>}

        {hasil && (
          <div className="hasil-verifikasi">
            {hasil.valid ? (
              <>
                <p><strong>Status:</strong> ✅ Sertifikasi Valid</p>
                <p><strong>Alamat Peserta:</strong> {hasil.peserta}</p>
                <p><strong>Skema:</strong> {hasil.skema}</p>
                <p><strong>Sertifikat CID:</strong> <a href={`https://ipfs.io/ipfs/${hasil.sertifikatCID}`} target="_blank" rel="noopener noreferrer">{hasil.sertifikatCID}</a></p>
                <p><strong>Metadata Peserta:</strong> <a href={`https://ipfs.io/ipfs/${hasil.metadataCID}`} target="_blank" rel="noopener noreferrer">{hasil.metadataCID}</a></p>
                <p><strong>Tanggal Selesai:</strong> {hasil.tanggalSelesai}</p>
              </>
            ) : (
              <p className="invalid">❌ Sertifikasi Tidak Valid / Tidak Lulus</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifikasiSertifikat;