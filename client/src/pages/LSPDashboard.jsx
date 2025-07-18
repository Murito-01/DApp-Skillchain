import { useState } from "react";
import StatusLSP from "./StatusLSP";
import PesertaLSP from "./PesertaLSP";
import ProfilLSP from "./ProfilLSP";
import "./LSPDashboard.css";

const MENU = [
  { key: "status", label: "Status LSP", icon: "📄" },
  { key: "peserta", label: "Partisipan", icon: "👥" },
  { key: "profil", label: "Profil LSP", icon: "🏢" },
];

export default function LSPDashboard() {
  const [activeMenu, setActiveMenu] = useState("status");

  return (
    <div className="bnsp-sidebar-layout">
      <aside className="bnsp-sidebar bnsp-sidebar-card">
        <div className="bnsp-sidebar-title">LSP Dashboard</div>
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
        {activeMenu === "status" && <StatusLSP />}
        {activeMenu === "peserta" && <PesertaLSP />}
        {activeMenu === "profil" && <ProfilLSP />}
      </main>
    </div>
  );
} 