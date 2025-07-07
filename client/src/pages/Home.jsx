import "./Home.css";
import { useWallet } from "../contexts/WalletContext";

export default function Home() {
  const { isConnected, connectWallet, loading } = useWallet();
  return (
    <div className="home-root">
      <header className="home-header">
        <h1 className="home-title-main">SkillChain - Sistem Sertifikasi Digital</h1>
        <div className="home-subtitle">Sistem sertifikasi dan verifikasi sertifikat terdesentralisasi berbasis blockchain</div>
      </header>
      <div className="home-center-container">
        <div className="home-card">
          <div className="home-gateway-title">Gateway</div>
          <div className="home-gateway-desc">
            {isConnected ? "Anda sudah terhubung" : "Silakan hubungkan wallet Anda untuk melanjutkan."}
          </div>
          {!isConnected && (
            <button className="connect-wallet-btn" onClick={connectWallet} disabled={loading}>
              {loading ? "Menghubungkan..." : "Hubungkan Wallet"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}