import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
  AppConfig,
  FocusStatus,
  FocusSession,
  Tier,
  Page,
} from "../types";

interface AppContextType {
  // Navigation
  page: Page;
  setPage: (p: Page) => void;

  // Config
  config: AppConfig | null;
  setConfig: (c: AppConfig) => void;
  saveConfig: (c: AppConfig) => Promise<void>;

  // Tier
  tier: Tier;
  refreshTier: () => Promise<void>;

  // Focus
  focusStatus: FocusStatus | null;
  refreshFocusStatus: () => Promise<void>;
  startFocus: (duration: number) => Promise<void>;
  endFocus: (completed: boolean) => Promise<FocusSession>;

  // History
  history: FocusSession[];
  refreshHistory: () => Promise<void>;

  // Error/notification
  toast: { message: string; type: "success" | "error" | "info" } | null;
  showToast: (
    message: string,
    type?: "success" | "error" | "info"
  ) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>("dashboard");
  const [config, setConfigState] = useState<AppConfig | null>(null);
  const [tier, setTier] = useState<Tier>("free");
  const [focusStatus, setFocusStatus] = useState<FocusStatus | null>(null);
  const [history, setHistory] = useState<FocusSession[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3500);
    },
    []
  );

  const refreshFocusStatus = useCallback(async () => {
    try {
      const status = await invoke<FocusStatus>("get_focus_status");
      setFocusStatus(status);
    } catch (e) {
      console.error("refreshFocusStatus:", e);
    }
  }, []);

  const refreshTier = useCallback(async () => {
    try {
      const t = await invoke<string>("get_tier");
      setTier(t as Tier);
    } catch {
      setTier("free");
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const sessions = await invoke<FocusSession[]>("get_session_history");
      setHistory(sessions);
    } catch {
      setHistory([]);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await invoke<AppConfig>("get_config");
      setConfigState(cfg);
    } catch (e) {
      console.error("loadConfig:", e);
    }
  }, []);

  const saveConfig = useCallback(async (cfg: AppConfig) => {
    await invoke("save_config", { config: cfg });
    setConfigState(cfg);
  }, []);

  const setConfig = useCallback((c: AppConfig) => {
    setConfigState(c);
  }, []);

  const startFocus = useCallback(
    async (duration: number) => {
      await invoke("start_focus", { duration });
      await refreshFocusStatus();
    },
    [refreshFocusStatus]
  );

  const endFocus = useCallback(
    async (completed: boolean) => {
      const session = await invoke<FocusSession>("end_focus", { completed });
      await refreshFocusStatus();
      await refreshHistory();
      return session;
    },
    [refreshFocusStatus, refreshHistory]
  );

  // Bootstrap
  useEffect(() => {
    loadConfig();
    refreshTier();
    refreshFocusStatus();
    refreshHistory();
  }, [loadConfig, refreshTier, refreshFocusStatus, refreshHistory]);

  return (
    <AppContext.Provider
      value={{
        page,
        setPage,
        config,
        setConfig,
        saveConfig,
        tier,
        refreshTier,
        focusStatus,
        refreshFocusStatus,
        startFocus,
        endFocus,
        history,
        refreshHistory,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
