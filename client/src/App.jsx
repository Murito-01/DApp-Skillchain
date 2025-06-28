// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DaftarPeserta from "./pages/DaftarPeserta";
import Home from "./pages/Home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/daftar" element={<DaftarPeserta />} />
      </Routes>
    </Router>
  );
}

export default App;