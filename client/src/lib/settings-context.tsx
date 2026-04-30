import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface Settings {
  autoPrint: boolean;
  soundEnabled: boolean;
  notifications: boolean;
  storeName: string;
  storePhone: string;
  storeAddress: string;
  telegramUsername: string;
  receiptFooter: string;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  autoPrint: true,
  soundEnabled: true,
  notifications: true,
  storeName: "Ixlos Books",
  storePhone: "+998 93 678 55 52",
  storeAddress: "Namangan, Uychi",
  telegramUsername: "ixlosbooksuz",
  receiptFooter: "Xaridingiz uchun rahmat!"
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// One-time migration: existing installs have explicit `autoPrint: false` in
// localStorage from when that was the default. We now want auto-print on by
// default. Force-enable it once, recording a marker so future toggles by the
// user are respected.
const AUTOPRINT_MIGRATION_KEY = "pos_settings_autoprint_migrated_v1";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem("pos_settings");
    let merged: Settings = defaultSettings;
    if (saved) {
      try {
        merged = { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        merged = defaultSettings;
      }
    }
    try {
      if (!localStorage.getItem(AUTOPRINT_MIGRATION_KEY)) {
        merged = { ...merged, autoPrint: true };
        localStorage.setItem(AUTOPRINT_MIGRATION_KEY, "1");
      }
    } catch {}
    return merged;
  });

  useEffect(() => {
    localStorage.setItem("pos_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
