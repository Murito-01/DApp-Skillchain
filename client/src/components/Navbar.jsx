import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import { useWallet, ADDRESS_BNSP, LSP_WAITINGLIST } from "../contexts/WalletContext";

export default function Navbar() {
  const location = useLocation();
  const { isConnected, role, account, disconnectWallet, lspStatus } = useWallet();
  const isBNSP = isConnected && account && account.toLowerCase() === ADDRESS_BNSP.toLowerCase();

  // Waitinglist address LSP
  // const LSP_WAITINGLIST = [
  //   "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(),
  //   "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc".toLowerCase(),
  // ];
  // const isLSPWaitinglisted = isConnected && account && LSP_WAITINGLIST.includes(account.toLowerCase());

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
        {role === "bnsp" && (
          <Link to="/bnsp" className={location.pathname === "/bnsp" ? "active" : ""}>Dashboard</Link>
        )}
        {role === "lsp-candidate" && lspStatus === -1 && (
          <Link to="/ajukan" className={location.pathname === "/ajukan" ? "active" : ""}>Ajukan</Link>
        )}
        {role === "lsp-candidate" && lspStatus !== -1 && (
          <Link to="/status" className={location.pathname === "/status" ? "active" : ""}>Status</Link>
        )}
        {role === "lsp" && (
          <Link to="/status" className={location.pathname === "/status" ? "active" : ""}>Status</Link>
        )}
        {role === "lsp" && (
          <Link to="/peserta-lsp" className={location.pathname === "/peserta-lsp" ? "active" : ""}>Partisipan</Link>
        )}
        {isConnected && role === "" && (
          <Link to="/daftar" className={location.pathname === "/daftar" ? "active" : ""}>Daftar</Link>
        )}
        {isConnected && role === "peserta" && (
          <Link to="/profile" className={location.pathname === "/profile" ? "active" : ""}>Profil</Link>
        )}
      </div>
    </nav>
  );
} 