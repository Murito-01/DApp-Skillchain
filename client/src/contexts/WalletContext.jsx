import { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import contractABI from "../abi/MainContract.json";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const WalletContext = createContext();

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
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      let pesertaInfo;
      try {
        pesertaInfo = await contract.getPesertaInfo(address);
      } catch {
        pesertaInfo = null;
      }
      if (pesertaInfo && pesertaInfo.terdaftar) {
        setRole("peserta");
      } else {
        setRole("");
      }
    } catch {
      setRole("");
    }
  };

  return (
    <WalletContext.Provider value={{ account, isConnected, role, connectWallet, loading, setRole }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
} 