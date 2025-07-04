import { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import contractArtifact from "../abi/MainContract.json";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const WalletContext = createContext();

// Address BNSP hardcode dari wallet 0 Hardhat
export const ADDRESS_BNSP = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

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
      try {
        lspStatus = await contract.getStatusLSP(address);
        console.log("LSP Status:", lspStatus);
      } catch (err) {
        lspStatus = null;
        console.error("Error getStatusLSP:", err);
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