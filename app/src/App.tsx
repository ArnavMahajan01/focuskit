import { useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import BlockListPage from "./pages/BlockListPage";
import CleanupPage from "./pages/CleanupPage";
import SettingsPage from "./pages/SettingsPage";

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type}`} role="alert">
      {toast.message}
    </div>
  );
}

function MainContent() {
  const { page } = useApp();
  return (
    <main className="main-content">
      {page === "dashboard" && <Dashboard />}
      {page === "blocklist" && <BlockListPage />}
      {page === "cleanup" && <CleanupPage />}
      {page === "settings" && <SettingsPage />}
    </main>
  );
}

function AppShell() {
  // Prevent right-click context menu in production
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <MainContent />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
