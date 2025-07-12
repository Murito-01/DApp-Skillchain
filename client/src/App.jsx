// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DaftarPeserta from "./pages/DaftarPeserta";
import Home from "./pages/Home";
import VerifikasiSertifikat from "./pages/VerifikasiSertifikat";
import PesertaProfile from "./pages/PesertaProfile";
import Navbar from "./components/Navbar";
import { WalletProvider } from "./contexts/WalletContext";
import DaftarLSP from "./pages/DaftarLSP";
import StatusLSP from "./pages/StatusLSP";
import PesertaLSP from "./pages/PesertaLSP";
import BNSPDashboard from "./pages/BNSPDashboard";
import LSPDashboard from "./pages/LSPDashboard";
import PesertaDashboard from "./pages/PesertaDashboard";

function App() {
  return (
    <WalletProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/daftar" element={<DaftarPeserta />} />
          <Route path="/verifikasi" element={<VerifikasiSertifikat />} />
          <Route path="/profile" element={<PesertaProfile />} />
          <Route path="/bnsp" element={<BNSPDashboard />} />
          <Route path="/ajukan" element={<DaftarLSP />} />
          <Route path="/status" element={<StatusLSP />} />
          <Route path="/peserta-lsp" element={<PesertaLSP />} />
          <Route path="/lsp" element={<LSPDashboard />} />
          <Route path="/peserta" element={<PesertaDashboard />} />
        </Routes>
      </Router>
    </WalletProvider>
  );
}

export default App;