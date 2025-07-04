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
  const [role, setRole] = useState(""); // "peserta" | "" (nanti bisa LSP/BNSP)
  const [loading, setLoading] = useState(false);

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
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      let pesertaInfo, lspStatus;
      try {
        pesertaInfo = await contract.getPesertaInfo(address);
        console.log("PesertaInfo:", pesertaInfo);
      } catch {
        pesertaInfo = null;
      }
      if (pesertaInfo && pesertaInfo[1]) {
        setRole("peserta");
        return;
      }
      // Cek whitelist LSP
      if (LSP_WHITELIST.includes(address.toLowerCase())) {
        try {
          lspStatus = await contract.getStatusLSP(address);
          console.log("LSP Status:", lspStatus);
        } catch (err) {
          lspStatus = null;
          console.error("Error getStatusLSP:", err);
        }
        if (Number(lspStatus) === -1) {
          setRole("lsp-candidate"); // Belum pernah daftar, boleh ajukan
          return;
        } else if ([0,1,2].includes(Number(lspStatus))) {
          setRole("lsp"); // Sudah daftar, bisa cek status
          return;
        }
      }
      // Fallback: jika bukan peserta/lsp, set role ke string kosong
      setRole("");
    } catch {
      setRole("");
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
    <WalletContext.Provider value={{ account, isConnected, role, connectWallet, disconnectWallet, loading, setRole }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
} 