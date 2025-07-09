import { useState } from "react";
import { ethers } from "ethers";
import "./VerifikasiSertifikat.css";
import MainContract from "../abi/MainContract.json";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

function VerifikasiSertifikat() {
  const [cid, setCid] = useState("");
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

      // Verifikasi menggunakan CID
      const [isValid, sertifikasiID] = await contract.verifikasiKelulusanByCID(cid);
      let detail = null;
      let metadata = "";
      let skemaNama = "";

      if (isValid && sertifikasiID !== "0x0000000000000000000000000000000000000000") {
        detail = await contract.getDetailSertifikasi(sertifikasiID);
        metadata = await contract.getPesertaMetadata(detail.peserta);
        skemaNama = await contract.getSkemaNama(detail.skema);
      }

      if (!isValid) {
        setHasil({
          valid: false,
          cid: cid
        });
      } else {
        setHasil({
          valid: true,
          peserta: detail.peserta,
          sertifikatCID: detail.sertifikatCID,
          metadataCID: metadata,
          skema: skemaNama,
          tanggalSelesai: new Date(Number(detail.tanggalSelesai) * 1000).toLocaleDateString(),
          sertifikasiID: sertifikasiID,
          cid: cid
        });
      }
    } catch (err) {
      setError("Terjadi kesalahan. Pastikan CID valid dan MetaMask terhubung.");
      console.error(err);
    }

    setLoading(false);
  };

  const isInputValid = () => {
    return cid.trim().length > 0;
  };

  return (
    <div className="verifikasi-wrapper">
      <div className="verifikasi-container">
        <h2>Verifikasi Sertifikat</h2>
        <input
          type="text"
          placeholder="Masukkan CID Sertifikat (contoh: QmX...)"
          value={cid}
          onChange={(e) => setCid(e.target.value)}
        />
        <button onClick={handleVerifikasi} disabled={loading || !isInputValid()}>
          {loading ? "Memeriksa..." : "Verifikasi"}
        </button>

        {error && <p className="error-message">{error}</p>}

        {hasil && (
          <div className="hasil-verifikasi">
            {hasil.valid ? (
              <>
                <div className="status-box">
                  <svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" fill="#43a047"/><path d="M6 10.5l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Status: <span>Sertifikasi Valid</span>
                </div>
                <div className="detail-row"><span className="detail-label">CID Sertifikat:</span><span className="detail-value">{hasil.cid}</span></div>
                <div className="detail-row"><span className="detail-label">ID Sertifikasi:</span><span className="detail-value">{hasil.sertifikasiID}</span></div>
                <div className="detail-row"><span className="detail-label">Alamat Peserta:</span><span className="detail-value">{hasil.peserta}</span></div>
                <div className="detail-row"><span className="detail-label">Skema:</span><span className="detail-value">{hasil.skema}</span></div>
                <div className="detail-row"><span className="detail-label">Sertifikat CID:</span><a className="detail-link" href={`https://ipfs.io/ipfs/${hasil.sertifikatCID}`} target="_blank" rel="noopener noreferrer">{hasil.sertifikatCID} <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M8.5 2.5h5v5" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 9l6-6" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 9.5v2A2.5 2.5 0 0 1 10.5 14h-6A2.5 2.5 0 0 1 2 11.5v-6A2.5 2.5 0 0 1 4.5 3H7" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></a></div>
                <div className="detail-row"><span className="detail-label">Metadata Peserta:</span><a className="detail-link" href={`https://ipfs.io/ipfs/${hasil.metadataCID}`} target="_blank" rel="noopener noreferrer">{hasil.metadataCID} <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M8.5 2.5h5v5" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 9l6-6" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 9.5v2A2.5 2.5 0 0 1 10.5 14h-6A2.5 2.5 0 0 1 2 11.5v-6A2.5 2.5 0 0 1 4.5 3H7" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></a></div>
                <div className="detail-row"><span className="detail-label">Tanggal Selesai:</span><span className="detail-value">{hasil.tanggalSelesai}</span></div>
                <a
                  href={`https://ipfs.io/ipfs/${hasil.sertifikatCID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lihat-sertifikat-btn"
                >
                  Lihat Sertifikat di IPFS
                </a>
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