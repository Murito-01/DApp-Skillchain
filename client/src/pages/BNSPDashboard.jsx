import { useState } from "react";
import VerifikasiLSP from "./VerifikasiLSP";
import MonitoringPeserta from "./MonitoringPeserta";
import MonitoringLSP from "./MonitoringLSP";
import MonitoringSertifikat from "./MonitoringSertifikat";
import UploadSuratIzin from "./UploadSuratIzin";
import WaitinglistLSP from "./WaitinglistLSP";
import "./BNSPDashboard.css";

const MENU = [
  { key: "verif", label: "Verifikasi LSP", icon: "\ud83d\uddc2\ufe0f" },
  { key: "peserta", label: "Monitoring Peserta", icon: "\ud83d\udc65" },
  { key: "lsp", label: "Monitoring LSP", icon: "\ud83c\udfe2" },
  { key: "sertifikat", label: "Monitoring Sertifikat", icon: "\ud83d\udcc4" }
];

export default function BNSPDashboard() {
  const [activeMenu, setActiveMenu] = useState("verif");

  return (
    <div className="bnsp-sidebar-layout">
      <aside className="bnsp-sidebar bnsp-sidebar-card">
        <div className="bnsp-sidebar-title">BNSP Admin</div>
        <nav className="bnsp-sidebar-menu">
          {MENU.map(m => (
            <button
              key={m.key}
              className={"bnsp-sidebar-menu-item" + (activeMenu === m.key ? " active" : "")}
              onClick={() => setActiveMenu(m.key)}
            >
              <span className="bnsp-sidebar-menu-icon">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="bnsp-sidebar-content">
        {activeMenu === "verif" && <VerifikasiLSP />}
        {activeMenu === "peserta" && <MonitoringPeserta />}
        {activeMenu === "lsp" && <MonitoringLSP />}
        {activeMenu === "sertifikat" && <MonitoringSertifikat />}
      </main>
    </div>
  );
} 