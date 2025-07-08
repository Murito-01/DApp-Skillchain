import { useState } from "react";
import VerifikasiLSP from "./VerifikasiLSP";
import MonitoringPeserta from "./MonitoringPeserta";
import MonitoringLSP from "./MonitoringLSP";
import MonitoringSertifikat from "./MonitoringSertifikat";
import UploadSuratIzin from "./UploadSuratIzin";
import WaitinglistLSP from "./WaitinglistLSP";
import "./BNSPDashboard.css";

const MENU = [
  { key: "verif", label: "Verifikasi LSP", icon: "🗂️" },
  { key: "peserta", label: "Monitoring Peserta", icon: "👥" },
  { key: "lsp", label: "Monitoring LSP", icon: "🏢" },
  { key: "sertifikat", label: "Monitoring Sertifikat", icon: "📄" },
  { key: "waitinglist", label: "Waitinglist LSP", icon: "⏳" },
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
        {activeMenu === "waitinglist" && <WaitinglistLSP />}
      </main>
    </div>
  );
} 