import { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const WalletContext = createContext();

// Address BNSP hardcode dari wallet 0 Hardhat
export const ADDRESS_BNSP = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// Whitelist LSP
export const LSP_WHITELIST = [
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase(),
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc".toLowerCase(),
];

export function WalletProvider({ children }) {
  const [account, setAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [role, setRole] = useState(""); // "peserta" | "lsp" | "lsp-candidate" | "bnsp"
  const [loading, setLoading] = useState(false);
  const [lspStatus, setLspStatus] = useState(null); // -1, 0, 1, 2

  // Fungsi connect wallet dan cek role peserta
  const connectWallet = async () => {
    if (!window.ethereum) return false;
    setLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        setRole(""); // Reset role ke kosong sebelum checkRole
        await checkRole(accounts[0]);
        setLoading(false);
        return true;
      }
    } catch (err) {
      setLoading(false);
      return false;
    }
    setLoading(false);
    return false;
  };

  // Fungsi untuk cek role peserta ke smart contract
  const checkRole = async (address) => {
    if (address.toLowerCase() === ADDRESS_BNSP.toLowerCase()) {
      setRole("bnsp");
      setLspStatus(null);
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      let pesertaInfo, lspStatusOnChain;
      try {
        pesertaInfo = await contract.getPesertaInfo(address);
        // PesertaInfo: [metadataCID, terdaftar, aktif, ...]
      } catch {
        pesertaInfo = null;
      }
      if (pesertaInfo && pesertaInfo[1]) {
        setRole("peserta");
        setLspStatus(null);
        return;
      }
      // Selalu cek status LSP ke smart contract
      try {
        lspStatusOnChain = await contract.getStatusLSP(address);
      } catch (err) {
        lspStatusOnChain = null;
      }
      const statusNum = Number(lspStatusOnChain);
      setLspStatus(statusNum);
      if (statusNum === 1) {
        setRole("lsp"); // Sudah diverifikasi/aktif
        return;
      } else if (statusNum === 0 || statusNum === 2) {
        setRole("lsp-candidate"); // Menunggu atau ditolak
        return;
      } else if (statusNum === -1) {
        // Cek whitelist manual di smart contract
        let isWhitelisted = false;
        try {
          isWhitelisted = await contract.lspWhitelist(address);
        } catch {}
        if (isWhitelisted) {
          setRole("lsp-candidate"); // Boleh ajukan
        } else {
          setRole(""); // Belum pernah daftar/di-whitelist, menu Daftar
        }
        return;
      }
      // Fallback: jika bukan peserta/lsp, set role ke string kosong
      setRole("");
    } catch {
      setRole("");
      setLspStatus(null);
    }
  };

  // Fungsi disconnect wallet
  const disconnectWallet = () => {
    setAccount("");
    setIsConnected(false);
    setRole("");
  };

  // Cek status peserta ke smart contract setiap kali account berubah dan wallet connect
  useEffect(() => {
    if (isConnected && account) {
      checkRole(account);
    } else {
      setRole("");
    }
    // eslint-disable-next-line
  }, [isConnected, account]);

  return (
    <WalletContext.Provider value={{ account, isConnected, role, connectWallet, disconnectWallet, loading, setRole, lspStatus, checkRole }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
} 