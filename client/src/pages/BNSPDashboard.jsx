import { useState } from "react";
import VerifikasiLSP from "./VerifikasiLSP";
import MonitoringPeserta from "./MonitoringPeserta";
import MonitoringLSP from "./MonitoringLSP";
import MonitoringSertifikat from "./MonitoringSertifikat";
import UploadSuratIzin from "./UploadSuratIzin";
import WhitelistLSP from "./WhitelistLSP";
import "./BNSPDashboard.css";

const MENU = [
  { key: "verif", label: "Verifikasi LSP" },
  { key: "peserta", label: "Monitoring Peserta" },
  { key: "lsp", label: "Monitoring LSP" },
  { key: "sertifikat", label: "Monitoring Sertifikat" },
  { key: "upload", label: "Upload Surat Izin" },
  { key: "whitelist", label: "Whitelist LSP" },
];

export default function BNSPDashboard() {
  const [activeMenu, setActiveMenu] = useState("verif");

  return (
    <div className="bnsp-sidebar-layout">
      <aside className="bnsp-sidebar">
        <div className="bnsp-sidebar-title">BNSP Admin</div>
        <nav className="bnsp-sidebar-menu">
          {MENU.map(m => (
            <button
              key={m.key}
              className={"bnsp-sidebar-menu-item" + (activeMenu === m.key ? " active" : "")}
              onClick={() => setActiveMenu(m.key)}
            >
              {m.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="bnsp-sidebar-content">
        {activeMenu === "verif" && <VerifikasiLSP />}
        {activeMenu === "peserta" && <MonitoringPeserta />}
        {activeMenu === "lsp" && <MonitoringLSP />}
        {activeMenu === "sertifikat" && <MonitoringSertifikat />}
        {activeMenu === "upload" && <UploadSuratIzin />}
        {activeMenu === "whitelist" && <WhitelistLSP />}
      </main>
    </div>
  );
} 