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
    <div className="lsp-sidebar-layout">
      <aside className="lsp-sidebar lsp-sidebar-card">
        <div className="lsp-sidebar-title">LSP Dashboard</div>
        <nav className="lsp-sidebar-menu">
          {MENU.map(m => (
            <button
              key={m.key}
              className={"lsp-sidebar-menu-item" + (activeMenu === m.key ? " active" : "")}
              onClick={() => setActiveMenu(m.key)}
            >
              <span className="lsp-sidebar-menu-icon">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="lsp-sidebar-content">
        {activeMenu === "status" && <StatusLSP />}
        {activeMenu === "peserta" && <PesertaLSP />}
        {activeMenu === "profil" && <ProfilLSP />}
      </main>
    </div>
  );
} 