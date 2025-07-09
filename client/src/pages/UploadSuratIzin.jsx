import { useState } from "react";

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;

export default function UploadSuratIzin() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [cid, setCid] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setCid("");
    setStatus("");
    setProgress(0);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus("❌ Pilih file terlebih dahulu.");
      return;
    }
    setIsUploading(true);
    setStatus("Mengupload ke Pinata...");
    setCid("");
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "https://api.pinata.cloud/pinning/pinFileToIPFS");
      xhr.setRequestHeader("pinata_api_key", PINATA_API_KEY);
      xhr.setRequestHeader("pinata_secret_api_key", PINATA_SECRET_API_KEY);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setCid(data.IpfsHash);
          setStatus("✅ Upload berhasil!");
        } else {
          setStatus("❌ Gagal upload ke Pinata");
        }
      };
      xhr.onerror = () => {
        setIsUploading(false);
        setStatus("❌ Gagal upload ke Pinata");
      };
      xhr.send(formData);
    } catch (err) {
      setIsUploading(false);
      setStatus("❌ " + (err.message || "Gagal upload ke Pinata"));
    }
  };

  const handleCopy = () => {
    if (cid) {
      navigator.clipboard.writeText(cid);
      setStatus("CID berhasil dicopy ke clipboard!");
    }
  };

  return (
    <div style={{maxWidth:500,margin:"0 auto",background:"#fff",padding:32,borderRadius:20,boxShadow:"0 4px 24px #0002",color:"#111",fontFamily:"inherit"}}>
      <h2 style={{marginBottom:24,fontWeight:700,fontSize:26,color:"#111",textAlign:"center"}}>Upload Surat Izin LSP ke IPFS</h2>
      <form onSubmit={handleUpload} style={{display:"flex",flexDirection:"column",gap:18}}>
        <label style={{fontWeight:600,fontSize:17,color:"#111"}}>Pilih File Surat Izin (PDF/JPG/PNG)</label>
        <input 
          type="file" 
          accept=".pdf,.jpg,.jpeg,.png" 
          onChange={handleFileChange} 
          disabled={isUploading}
          style={{marginBottom:8,fontSize:16,color:"#111",background:"#f5f5f5",borderRadius:8,padding:8,border:"1.5px solid #ddd"}}
        />
        {file && (
          <div style={{marginBottom:8,fontSize:15,color:"#222",background:"#f6f6f6",padding:8,borderRadius:6}}>
            <b>File:</b> {file.name} ({(file.size/1024).toFixed(1)} KB)
          </div>
        )}
        {isUploading && (
          <div style={{marginBottom:8}}>
            <div style={{height:10,background:"#eee",borderRadius:6,overflow:"hidden"}}>
              <div style={{width:`${progress}%`,height:10,background:"#4f46e5",transition:"width .3s"}}></div>
            </div>
            <div style={{fontSize:13,marginTop:4,color:"#111"}}>{progress}%</div>
          </div>
        )}
        <button 
          type="submit" 
          disabled={isUploading || !file}
          style={{padding:"12px 0",background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:18,cursor:isUploading?"not-allowed":"pointer",opacity:isUploading?0.6:1,marginTop:8,boxShadow:"0 2px 8px #0001"}}
        >
          {isUploading ? "Mengupload..." : "Upload"}
        </button>
      </form>
      {status && (
        <div style={{marginTop:22,padding:12,borderRadius:8,background:status.startsWith("✅")?"#f6ffed":status.startsWith("❌")?"#fff1f0":"#f5f5f5",color:"#111",fontWeight:500,fontSize:16,border:status.startsWith("✅")?"1.5px solid #b7eb8f":status.startsWith("❌")?"1.5px solid #ffa39e":"1.5px solid #eee"}}>
          {status}
        </div>
      )}
      {cid && (
        <div style={{marginTop:28,padding:18,background:"#f6ffed",borderRadius:10,border:"1.5px solid #b7eb8f",color:"#111"}}>
          <div style={{fontSize:17,marginBottom:8}}><b>CID Hasil Upload:</b></div>
          <div style={{fontFamily:"monospace",fontSize:16,wordBreak:"break-all",marginBottom:10}}>{cid}</div>
          <button onClick={handleCopy} style={{padding:"8px 22px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontWeight:600,fontSize:16,boxShadow:"0 2px 8px #0001"}}>Copy CID</button>
        </div>
      )}
    </div>
  );
} 