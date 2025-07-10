import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { decryptData, getOrCreateAesKeyIv } from "../lib/encrypt";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const STATUS_LABELS = [
  "Menunggu Verifikasi",
  "Aktif",
  "Ditolak"
];

// Fungsi utilitas untuk fetch dan dekripsi JSON terenkripsi dari Pinata
async function fetchAndDecryptJsonFromPinata(cid) {
  const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
  const encrypted = await res.text();
  const { key, iv, keyHex, ivHex } = getOrCreateAesKeyIv();
  console.log("[DECRYPT] CID:", cid);
  console.log("[DECRYPT] Encrypted string:", encrypted);
  console.log("[DECRYPT] KeyHex:", keyHex, "IVHex:", ivHex);
  try {
    const plain = decryptData(encrypted, key, iv);
    console.log("[DECRYPT] Plaintext:", plain);
    const obj = JSON.parse(plain);
    console.log("[DECRYPT] JSON:", obj);
    return obj;
  } catch (e) {
    console.error("[DECRYPT] Error:", e);
    return null;
  }
}

export default function MonitoringLSP() {
  const [lspList, setLspList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    fetchLSP();
  }, []);

  useEffect(() => {
    if (!search) setFiltered(lspList);
    else {
      const s = search.toLowerCase();
      setFiltered(
        lspList.filter(lsp =>
          (lsp.metadata?.nama_lsp || "").toLowerCase().includes(s) ||
          (lsp.metadata?.email_kontak || "").toLowerCase().includes(s) ||
          lsp.address.toLowerCase().includes(s) ||
          STATUS_LABELS[lsp.status]?.toLowerCase().includes(s)
        )
      );
    }
  }, [search, lspList]);

  async function fetchLSP() {
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      const filter = contract.filters.LSPDidaftarkan();
      const events = await contract.queryFilter(filter, 0, "latest");
      const list = [];
      for (const ev of events) {
        const addr = ev.args.lsp;
        const lspData = await contract.getLSP(addr);
        const status = await contract.getStatusLSP(addr);
        let metadata = null;
        try {
          metadata = await fetchAndDecryptJsonFromPinata(lspData[0]);
        } catch {
          metadata = null;
        }
        list.push({
          address: addr,
          metadataCID: lspData[0],
          status: Number(status),
          suratIzinCID: lspData[2],
          alasanTolak: lspData[3],
          metadata,
        });
      }
      setLspList(list);
    } catch (err) {
      setLspList([]);
    }
    setLoading(false);
  }

  return (
    <div>
      <h2 style={{marginBottom:24, color:'#111'}}>Monitoring LSP</h2>
      <input
        type="text"
        placeholder="Cari nama, email, wallet, atau status..."
        value={search}
        onChange={e=>setSearch(e.target.value)}
        style={{padding:8,marginBottom:18,borderRadius:6,border:'1px solid #bbb',width:320,maxWidth:'100%'}}
      />
      {loading ? (
        <div>Loading data...</div>
      ) : filtered.length === 0 ? (
        <div style={{marginTop:48, display:'flex', justifyContent:'center'}}>
          <div style={{background:'#fff', borderRadius:16, boxShadow:'0 2px 12px #0001', padding:'40px 48px', textAlign:'center', minWidth:320}}>
            <div style={{fontSize:54, marginBottom:12}}>🏢</div>
            <div style={{fontWeight:700, fontSize:22, color:'#222', marginBottom:8}}>Belum Ada LSP</div>
            <div style={{fontSize:16, color:'#444'}}>Saat ini belum ada LSP yang terdaftar atau sesuai pencarian.<br/>Silakan cek kembali nanti.</div>
          </div>
        </div>
      ) : (
        <table style={{width:'100%',background:'#fff',borderRadius:12,boxShadow:'0 2px 8px #0001',overflow:'hidden',color:'#111'}}>
          <thead style={{background:'#f5f5f5',color:'#111'}}>
            <tr>
              <th style={{padding:8}}>Wallet</th>
              <th style={{padding:8}}>Nama LSP</th>
              <th style={{padding:8}}>Email</th>
              <th style={{padding:8}}>Status</th>
              <th style={{padding:8}}>CID Surat Izin</th>
              <th style={{padding:8}}>Alasan Tolak</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(lsp => (
              <tr key={lsp.address}>
                <td style={{fontFamily:'monospace',padding:8}}>{lsp.address}</td>
                <td style={{padding:8}}>{lsp.metadata?.nama_lsp || <i>Unknown</i>}</td>
                <td style={{padding:8}}>{lsp.metadata?.email_kontak || <i>-</i>}</td>
                <td style={{padding:8}}>{STATUS_LABELS[lsp.status] || '-'}</td>
                <td style={{padding:8,fontFamily:'monospace'}}>{lsp.suratIzinCID || <i>-</i>}</td>
                <td style={{padding:8}}>{lsp.alasanTolak || <i>-</i>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 