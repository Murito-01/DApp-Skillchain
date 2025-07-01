// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DaftarPeserta from "./pages/DaftarPeserta";
import VerifikasiSertifikat from "./pages/VerifikasiSertifikat";
import Home from "./pages/Home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/daftar" element={<DaftarPeserta />} />
        <Route path="/verifikasi" element={<VerifikasiSertifikat />} />
      </Routes>
    </Router>
  );
}

export default App;