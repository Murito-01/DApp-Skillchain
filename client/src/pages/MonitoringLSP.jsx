import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const STATUS_LABELS = [
  "Menunggu Verifikasi",
  "Aktif",
  "Ditolak"
];

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
          const res = await fetch(`https://gateway.pinata.cloud/ipfs/${lspData[0]}`);
          metadata = await res.json();
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
        <div style={{marginTop:24}}>Tidak ada LSP ditemukan.</div>
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