// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DaftarPeserta from "./pages/DaftarPeserta";
import Home from "./pages/Home";
import VerifikasiSertifikat from "./pages/VerifikasiSertifikat";
import PesertaProfile from "./pages/PesertaProfile";
import Navbar from "./components/Navbar";
import { WalletProvider } from "./contexts/WalletContext";

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
        </Routes>
      </Router>
    </WalletProvider>
  );
}

export default App;