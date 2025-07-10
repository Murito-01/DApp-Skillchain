import { useState } from "react";
import { getOrCreateAesKeyIv } from "../lib/encrypt";

export default function KeySettings() {
  const { keyHex, ivHex } = getOrCreateAesKeyIv();
  const [importKey, setImportKey] = useState("");
  const [importIv, setImportIv] = useState("");
  const [msg, setMsg] = useState("");

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setMsg("Disalin ke clipboard!");
    setTimeout(() => setMsg(""), 1500);
  };

  const handleBackup = () => {
    const blob = new Blob([
      JSON.stringify({ key: keyHex, iv: ivHex }, null, 2)
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lsp_aes_key_backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    e.preventDefault();
    if (!importKey || !importIv) {
      setMsg("Kunci dan IV harus diisi!");
      return;
    }
    localStorage.setItem("lsp_aes_key", importKey);
    localStorage.setItem("lsp_aes_iv", importIv);
    setMsg("Kunci berhasil diimpor! Reload halaman...");
    setTimeout(() => window.location.reload(), 1200);
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target.result);
        if (obj.key && obj.iv) {
          localStorage.setItem("lsp_aes_key", obj.key);
          localStorage.setItem("lsp_aes_iv", obj.iv);
          setMsg("Kunci berhasil diimpor! Reload halaman...");
          setTimeout(() => window.location.reload(), 1200);
        } else {
          setMsg("File tidak valid!");
        }
      } catch {
        setMsg("File tidak valid!");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{maxWidth:480,margin:"32px auto",background:"#fff",padding:32,borderRadius:12,boxShadow:"0 2px 12px #0001"}}>
      <h2 style={{marginBottom:24}}>Pengaturan Kunci Enkripsi</h2>
      <div style={{marginBottom:16}}>
        <b>Kunci AES256 (Hex):</b>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <input value={keyHex} readOnly style={{width:"100%",fontFamily:"monospace"}} />
          <button onClick={()=>handleCopy(keyHex)}>Copy</button>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <b>IV (Hex):</b>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <input value={ivHex} readOnly style={{width:"100%",fontFamily:"monospace"}} />
          <button onClick={()=>handleCopy(ivHex)}>Copy</button>
        </div>
      </div>
      <div style={{marginBottom:24}}>
        <button onClick={handleBackup}>Backup ke File</button>
      </div>
      <form onSubmit={handleImport} style={{marginBottom:16}}>
        <b>Impor Kunci Manual:</b>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <input placeholder="Kunci Hex" value={importKey} onChange={e=>setImportKey(e.target.value)} style={{fontFamily:"monospace",width:180}} />
          <input placeholder="IV Hex" value={importIv} onChange={e=>setImportIv(e.target.value)} style={{fontFamily:"monospace",width:120}} />
          <button type="submit">Impor</button>
        </div>
      </form>
      <div style={{marginBottom:16}}>
        <b>Impor dari File Backup:</b>
        <input type="file" accept="application/json" onChange={handleFileImport} />
      </div>
      {msg && <div style={{marginTop:12,color:"#1976d2",fontWeight:500}}>{msg}</div>}
    </div>
  );
} 