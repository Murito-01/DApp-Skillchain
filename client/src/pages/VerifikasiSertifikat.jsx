import { useState } from "react";
import { ethers } from "ethers";
import "./VerifikasiSertifikat.css";
import MainContract from "../abi/MainContract.json";
import { decryptFileFromIPFS, getOrCreateAesKeyIv } from "../lib/encrypt";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

function VerifikasiSertifikat() {
  const [cid, setCid] = useState("");
  const [hasil, setHasil] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [fileBlobUrl, setFileBlobUrl] = useState("");
  const [fileType, setFileType] = useState("");

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

  async function handleLihatSertifikat(cid, filenameGuess = "sertifikat.pdf") {
    setShowModal(true);
    setFileBlobUrl("");
    setFileType("");
    try {
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      const encrypted = await res.text();
      const { keyHex, ivHex } = getOrCreateAesKeyIv();
      const bytes = decryptFileFromIPFS(encrypted, keyHex, ivHex);
      let type = "application/pdf";
      if (filenameGuess.endsWith(".jpg") || filenameGuess.endsWith(".jpeg")) type = "image/jpeg";
      if (filenameGuess.endsWith(".png")) type = "image/png";
      const blob = new Blob([bytes], { type });
      setFileBlobUrl(URL.createObjectURL(blob));
      setFileType(type);
    } catch (e) {
      alert("Gagal mendekripsi file: " + e.message);
      setShowModal(false);
    }
  }

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
                <div className="detail-row"><span className="detail-label">Skema:</span><span className="detail-value">{hasil.skema}</span></div>
                <div className="detail-row"><span className="detail-label">Sertifikat CID:</span><a className="detail-link" href={`https://ipfs.io/ipfs/${hasil.sertifikatCID}`} target="_blank" rel="noopener noreferrer">{hasil.sertifikatCID} <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M8.5 2.5h5v5" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 9l6-6" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 9.5v2A2.5 2.5 0 0 1 10.5 14h-6A2.5 2.5 0 0 1 2 11.5v-6A2.5 2.5 0 0 1 4.5 3H7" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></a></div>
                <div className="detail-row"><span className="detail-label">Metadata Peserta:</span><a className="detail-link" href={`https://ipfs.io/ipfs/${hasil.metadataCID}`} target="_blank" rel="noopener noreferrer">{hasil.metadataCID} <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M8.5 2.5h5v5" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 9l6-6" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 9.5v2A2.5 2.5 0 0 1 10.5 14h-6A2.5 2.5 0 0 1 2 11.5v-6A2.5 2.5 0 0 1 4.5 3H7" stroke="#3b5998" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></a></div>
                <div className="detail-row"><span className="detail-label">Tanggal Selesai:</span><span className="detail-value">{hasil.tanggalSelesai}</span></div>
                <div className="detail-row">
                  <button
                    className="lihat-sertifikat-btn"
                    style={{marginTop:10, padding:'8px 18px', borderRadius:7, background:'#4f46e5', color:'#fff', border:'none', fontWeight:600, fontSize:15, cursor:'pointer'}}
                    onClick={()=>handleLihatSertifikat(hasil.sertifikatCID, "sertifikat.pdf")}
                  >Lihat Sertifikat</button>
                </div>
              </>
            ) : (
              <p className="invalid">❌ Sertifikasi Tidak Valid / Tidak Lulus</p>
            )}
            {/* Modal Preview Sertifikat */}
            {showModal && (
              <div className="verif-lsp-modal-bg" onClick={()=>{setShowModal(false); if(fileBlobUrl) URL.revokeObjectURL(fileBlobUrl);}}>
                <div className="verif-lsp-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:600}}>
                  {fileBlobUrl ? (
                    fileType.startsWith("image/") ? (
                      <img src={fileBlobUrl} alt="Sertifikat" style={{maxWidth:"100%", maxHeight:400, marginTop:16}} />
                    ) : (
                      <iframe src={fileBlobUrl} style={{width:"100%",height:"400px", marginTop:16}} title="Sertifikat" />
                    )
                  ) : (
                    <div>Loading file...</div>
                  )}
                  {fileBlobUrl && (
                    <a href={fileBlobUrl} download="sertifikat.pdf" style={{marginTop:18,display:"inline-block",fontWeight:600,color:'#4f46e5',textDecoration:'underline'}}>Download File</a>
                  )}
                  <button onClick={()=>{setShowModal(false); if(fileBlobUrl) URL.revokeObjectURL(fileBlobUrl);}} style={{marginLeft:10,marginTop:18,padding:'8px 18px',borderRadius:7,background:'#ef4444',color:'#fff',border:'none',fontWeight:600,cursor:'pointer'}}>Tutup</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifikasiSertifikat;