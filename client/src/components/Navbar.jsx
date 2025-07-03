import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import { useWallet } from "../contexts/WalletContext";

export default function Navbar() {
  const location = useLocation();
  const { isConnected, role, account } = useWallet();

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">SkillChain</Link>
      </div>
      <div className="navbar-wallet-center">
        {isConnected && (
          <span>🔗 {account.slice(0, 6)}...{account.slice(-4)}</span>
        )}
      </div>
      <div className="navbar-links">
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>Home</Link>
        <Link to="/verifikasi" className={location.pathname === "/verifikasi" ? "active" : ""}>Verifikasi</Link>
        {isConnected && !role && (
          <Link to="/daftar" className={location.pathname === "/daftar" ? "active" : ""}>Daftar</Link>
        )}
        {isConnected && role === "peserta" && (
          <Link to="/profile" className={location.pathname === "/profile" ? "active" : ""}>Profil</Link>
        )}
      </div>
    </nav>
  );
} 