import { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";
import { decryptData, getOrCreateAesKeyIv } from "../lib/encrypt";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function MonitoringPeserta() {
  const [pesertaList, setPesertaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    fetchPeserta();
  }, []);

  useEffect(() => {
    if (!search) setFiltered(pesertaList);
    else {
      const s = search.toLowerCase();
      setFiltered(
        pesertaList.filter(p =>
          (p.metadata?.nama_lengkap || "").toLowerCase().includes(s) ||
          (p.metadata?.email_student_uii || "").toLowerCase().includes(s) ||
          p.address.toLowerCase().includes(s)
        )
      );
    }
  }, [search, pesertaList]);

  async function fetchPeserta() {
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      const filter = contract.filters.PesertaTerdaftar();
      const events = await contract.queryFilter(filter, 0, "latest");
      const list = [];
      for (const ev of events) {
        const addr = ev.args.peserta;
        const info = await contract.getPesertaInfo(addr);
        if (info[1]) { // terdaftar
          let metadata = null;
          try {
            const res = await fetch(`https://gateway.pinata.cloud/ipfs/${info[0]}`);
            const encrypted = await res.text();
            const { key, iv } = getOrCreateAesKeyIv();
            const plaintext = decryptData(encrypted, key, iv);
            metadata = JSON.parse(plaintext);
          } catch {
            metadata = null;
          }
          list.push({
            address: addr,
            metadataCID: info[0],
            metadata,
            tanggalDaftar: new Date(Number(info[4]) * 1000),
          });
        }
      }
      setPesertaList(list);
    } catch (err) {
      setPesertaList([]);
    }
    setLoading(false);
  }

  return (
    <div>
      <h2 style={{marginBottom:24, color:'#111'}}>Monitoring Peserta</h2>
      <input
        type="text"
        placeholder="Cari nama, email, atau wallet..."
        value={search}
        onChange={e=>setSearch(e.target.value)}
        style={{padding:8,marginBottom:18,borderRadius:6,border:'1px solid #bbb',width:320,maxWidth:'100%'}}
      />
      {loading ? (
        <div>Loading data...</div>
      ) : filtered.length === 0 ? (
        <div style={{marginTop:48, display:'flex', justifyContent:'center'}}>
          <div style={{background:'#fff', borderRadius:16, boxShadow:'0 2px 12px #0001', padding:'40px 48px', textAlign:'center', minWidth:320}}>
            <div style={{fontSize:54, marginBottom:12}}>👥</div>
            <div style={{fontWeight:700, fontSize:22, color:'#222', marginBottom:8}}>Belum Ada Peserta</div>
            <div style={{fontSize:16, color:'#444'}}>Saat ini belum ada peserta yang terdaftar atau sesuai pencarian.<br/>Silakan cek kembali nanti.</div>
          </div>
        </div>
      ) : (
        <table style={{width:'100%',background:'#fff',borderRadius:12,boxShadow:'0 2px 8px #0001',overflow:'hidden',color:'#111'}}>
          <thead style={{background:'#f5f5f5',color:'#111'}}>
            <tr>
              <th style={{padding:8, textAlign:'left'}}>Wallet</th>
              <th style={{padding:8, textAlign:'left'}}>Nama</th>
              <th style={{padding:8, textAlign:'left'}}>Email</th>
              <th style={{padding:8, textAlign:'left'}}>Tanggal Daftar</th>
              <th style={{padding:8, textAlign:'left'}}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(peserta => (
              <tr key={peserta.address}>
                <td style={{fontFamily:'monospace',padding:8}}>{peserta.address}</td>
                <td style={{padding:8}}>{peserta.metadata?.nama_lengkap || <i>Unknown</i>}</td>
                <td style={{padding:8}}>{peserta.metadata?.email_student_uii || <i>-</i>}</td>
                <td style={{padding:8}}>{peserta.tanggalDaftar.toLocaleString('id-ID')}</td>
                <td style={{padding:8}}>
                  <button style={{padding:'4px 12px',borderRadius:6,border:'none',background:'#4f46e5',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer'}} onClick={()=>{setShowModal(true);setModalData(peserta);}}>Detail</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showModal && modalData && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'#0008',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowModal(false)}>
          <div style={{background:'#fff',borderRadius:16,padding:'32px 36px',minWidth:320,maxWidth:440,boxShadow:'0 2px 24px #0003',position:'relative',color:'#222'}} onClick={e=>e.stopPropagation()}>
            <h2 style={{marginBottom:22, fontWeight:700, fontSize:24, textAlign:'center', letterSpacing:0.5}}>Detail Peserta</h2>
            <ul style={{listStyle:'none',padding:0,margin:0}}>
              <li style={{marginBottom:12}}><span style={{fontWeight:600, color:'#4f46e5'}}>Wallet:</span> <span style={{fontFamily:'monospace'}}>{modalData.address}</span></li>
              {modalData.metadata && Object.entries(modalData.metadata).map(([k,v])=>(
                <li key={k} style={{marginBottom:12,wordBreak:'break-word'}}><span style={{fontWeight:600, color:'#4f46e5'}}>{k.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}:</span> <span>{v}</span></li>
              ))}
            </ul>
            <button style={{marginTop:18,padding:'10px 28px',borderRadius:8,background:'#ef4444',color:'#fff',border:'none',fontWeight:700,cursor:'pointer',fontSize:16,display:'block',marginLeft:'auto',marginRight:'auto'}} onClick={()=>setShowModal(false)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
} 