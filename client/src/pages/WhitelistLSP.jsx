import { useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

function isAddress(addr) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export default function WhitelistLSP() {
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    if (!isAddress(wallet)) {
      setStatus("❌ Wallet address tidak valid");
      return;
    }
    setIsLoading(true);
    try {
      if (!window.ethereum) throw new Error("Wallet tidak terdeteksi");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
      const tx = await contract.addLSPToWhitelist(wallet);
      setStatus("Menunggu konfirmasi transaksi... " + tx.hash);
      await tx.wait();
      setStatus("✅ Wallet berhasil di-whitelist sebagai LSP!");
      setWallet("");
    } catch (err) {
      setStatus("❌ " + (err.reason || err.message));
    }
    setIsLoading(false);
  };

  return (
    <div style={{maxWidth:500,margin:"0 auto",background:"#fff",padding:32,borderRadius:20,boxShadow:"0 4px 24px #0002",color:"#111",fontFamily:"inherit"}}>
      <h2 style={{marginBottom:24,fontWeight:700,fontSize:26,color:"#111",textAlign:"center"}}>Whitelist LSP</h2>
      <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:18,background:'#fff',borderRadius:16,padding:24,boxShadow:'0 2px 8px #0001'}}>
        <label style={{fontWeight:600,fontSize:17,color:"#111"}}>Wallet Address</label>
        <input
          type="text"
          value={wallet}
          onChange={e=>setWallet(e.target.value)}
          placeholder="0x..."
          style={{padding:12,fontSize:17,borderRadius:8,border:"1.5px solid #ddd",color:"#111",background:'#fff'}}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{padding:"12px 0",background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:18,cursor:isLoading?"not-allowed":"pointer",opacity:isLoading?0.6:1,marginTop:8,boxShadow:"0 2px 8px #0001"}}
        >
          {isLoading ? "Memproses..." : "Tambah ke Whitelist"}
        </button>
      </form>
      {status && (
        <div style={{marginTop:22,padding:12,borderRadius:8,background:status.startsWith("✅")?"#f6ffed":status.startsWith("❌")?"#fff1f0":"#f5f5f5",color:"#111",fontWeight:500,fontSize:16,border:status.startsWith("✅")?"1.5px solid #b7eb8f":status.startsWith("❌")?"1.5px solid #ffa39e":"1.5px solid #eee"}}>
          {status}
        </div>
      )}
    </div>
  );
} 