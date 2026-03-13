import { LayoutDashboard, List, Trash2, Settings, Zap, type LucideProps } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { Page } from "../types";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

const navItems: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "blocklist", label: "Block List", icon: List },
  { id: "cleanup", label: "Cleanup", icon: Trash2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const { page, setPage, tier } = useApp();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M12 6v6l4 2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="logo-text">FocusKit</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item${page === id ? " nav-item--active" : ""}`}
            onClick={() => setPage(id)}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Spacer */}
      <div className="sidebar-spacer" />

      {/* Tier badge / upgrade */}
      {tier === "free" ? (
        <button className="upgrade-btn" onClick={() => setPage("settings")}>
          <Zap size={14} />
          <span>Upgrade to Pro</span>
        </button>
      ) : (
        <div className="pro-badge">
          <Zap size={13} />
          <span>Pro</span>
        </div>
      )}
    </aside>
  );
}
