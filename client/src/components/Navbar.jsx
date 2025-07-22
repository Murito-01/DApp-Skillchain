import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useWallet, ADDRESS_BNSP, LSP_WAITINGLIST } from "../contexts/WalletContext";
import { FaPowerOff } from "react-icons/fa";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected, role, account, disconnectWallet, lspStatus } = useWallet();
  const isBNSP = isConnected && account && account.toLowerCase() === ADDRESS_BNSP.toLowerCase();

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <h2>SkillChain</h2>
      </div>
      <div className="navbar-wallet-center">
        {isConnected && (
          <span><span className="navbar-wallet-label">Wallet:</span> <span className="navbar-wallet-address">{account.slice(0, 6)}...{account.slice(-4)}</span></span>
        )}
      </div>
      {isConnected && (
        <button
          className="navbar-disconnect-btn"
          onClick={() => { disconnectWallet(); navigate("/"); }}
        >
          <span style={{display:'inline-flex',alignItems:'center'}}>
            <FaPowerOff style={{fontSize:18,marginRight:4}} />
          </span>
          Putuskan
        </button>
      )}
      <div className="navbar-links">
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>Home</Link>
        <Link to="/verifikasi" className={location.pathname === "/verifikasi" ? "active" : ""}>Verifikasi</Link>
        {role === "bnsp" && (
          <Link to="/bnsp" className={location.pathname === "/bnsp" ? "active" : ""}>Dashboard BNSP</Link>
        )}
        {role === "lsp" && (
          <Link to="/lsp" className={location.pathname === "/lsp" ? "active" : ""}>Dashboard LSP</Link>
        )}
        {role === "lsp-candidate" && (
          <Link to="/status" className={location.pathname === "/status" ? "active" : ""}>Status</Link>
        )}
        {role === "peserta" && (
          <Link to="/peserta" className={location.pathname === "/peserta" ? "active" : ""}>Dashboard Peserta</Link>
        )}
        {isConnected && role === "" && (
          <>
            <Link to="/daftar" className={location.pathname === "/daftar" ? "active" : ""}>Daftar Peserta</Link>
            <Link to="/ajukan" className={location.pathname === "/ajukan" ? "active" : ""}>Daftar LSP</Link>
          </>
        )}
      </div>
    </nav>
  );
} 