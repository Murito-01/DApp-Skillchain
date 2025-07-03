import "./Home.css";
import { useWallet } from "../contexts/WalletContext";

export default function Home() {
  const { isConnected, connectWallet, loading } = useWallet();
  return (
    <div className="home-hero">
      <img src="/assets/hero-illustration.svg" alt="SkillChain" className="home-hero-img" />
      <h1 className="home-hero-title">Selamat Datang di SkillChain</h1>
      <p className="home-hero-desc">
        Platform terdesentralisasi untuk pendaftaran dan verifikasi sertifikasi profesi berbasis blockchain.
      </p>
      {!isConnected && (
        <button className="connect-wallet-btn" onClick={connectWallet} disabled={loading} style={{marginTop: 32}}>
          {loading ? "Menghubungkan..." : "🔗 Hubungkan Wallet"}
        </button>
      )}
    </div>
  );
}