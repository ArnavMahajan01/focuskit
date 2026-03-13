export interface AppConfig {
  license_key: string;
  focus_duration: number;
  blocked_sites: string[];
  cleanup_days: number;
  cleanup_confirm: boolean;
}

export interface FocusStatus {
  active: boolean;
  end_time: number | null;
  blocked_sites: string[];
  total_duration: number | null;
}

export interface FocusSession {
  id: string;
  start_time: number;
  duration: number;
  completed: boolean;
  sites_blocked: number;
}

export interface LicenseResult {
  valid: boolean;
  message: string;
  cached: boolean;
}

export interface CleanupScan {
  temp_count: number;
  temp_size: number;
  download_files: string[];
  download_size: number;
  cache_dirs: string[];
  cache_size: number;
}

export interface CleanupOptions {
  temp: boolean;
  downloads: boolean;
  cache: boolean;
}

export interface CleanupResult {
  files_removed: number;
  space_freed: number;
}

export type Tier = 'free' | 'pro';
export type Page = 'dashboard' | 'blocklist' | 'cleanup' | 'settings';
