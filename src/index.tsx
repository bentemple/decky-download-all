import { definePlugin, toaster } from "@decky/api";
import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  SliderField,
} from "@decky/ui";
import { useState, useEffect, FC } from "react";
import { FaDownload, FaCheck } from "react-icons/fa";

// Minimal type for download items (subset of SteamClient.Downloads types)
interface DownloadItem {
  appid: number;
  active: boolean;
  completed: boolean;
  paused: boolean;
  total_bytes: number;
  queue_index: number; // -1 if unscheduled, >= 0 if scheduled
}

type Mode = "all" | "scheduled" | "size-limit";

interface Settings {
  mode: Mode;
  maxSizeMB: number;
}

const STORAGE_KEY = "download-all-settings";
const DEFAULTS: Settings = { mode: "scheduled", maxSizeMB: 5000 };

// Load/save settings from localStorage
const loadSettings = (): Settings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
};

const saveSettings = (settings: Settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

// Shared state
let currentSettings = loadSettings();

// Main plugin UI in Quick Access Menu
const PluginContent: FC = () => {
  const [settings, setSettings] = useState(currentSettings);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  const update = (partial: Partial<Settings>) => {
    const newSettings = { ...settings, ...partial };
    setSettings(newSettings);
    currentSettings = newSettings;
    saveSettings(newSettings);
  };

  useEffect(() => {
    const reg = SteamClient.Downloads.RegisterForDownloadItems((_, items) => {
      setDownloads(items.filter((d) => !d.completed));
    });
    return () => reg.unregister();
  }, []);

  const handleDownloadAll = () => {
    let items = [...downloads];

    // Filter based on mode
    // Scheduled downloads have queue_index >= 0, unscheduled have queue_index === -1
    if (settings.mode === "scheduled") {
      items = items.filter((d) => d.queue_index >= 0);
    } else if (settings.mode === "size-limit") {
      const maxBytes = settings.maxSizeMB * 1024 * 1024;
      items = items.filter((d) => d.queue_index >= 0 && d.total_bytes <= maxBytes);
    }

    // Sort smallest first
    items.sort((a, b) => a.total_bytes - b.total_bytes);

    // Reorder queue (largest to smallest, moving to index 0)
    for (let i = items.length - 1; i >= 0; i--) {
      SteamClient.Downloads.SetQueueIndex(items[i].appid, 0);
    }

    toaster.toast({
      title: "Download All",
      body: `Queued ${items.length} downloads (smallest first)`,
    });
  };

  const modeOptions: { label: string; data: Mode }[] = [
    { label: "All Downloads", data: "all" },
    { label: "Scheduled Downloads", data: "scheduled" },
    { label: "Size Limit", data: "size-limit" },
  ];

  // Compute filtered download count based on current mode
  const getFilteredDownloads = () => {
    if (settings.mode === "scheduled") {
      return downloads.filter((d) => d.queue_index >= 0);
    } else if (settings.mode === "size-limit") {
      const maxBytes = settings.maxSizeMB * 1024 * 1024;
      return downloads.filter((d) => d.queue_index >= 0 && d.total_bytes <= maxBytes);
    }
    return downloads;
  };

  const filteredDownloads = getFilteredDownloads();
  const ignoredCount = downloads.length - filteredDownloads.length;

  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={handleDownloadAll}
            disabled={filteredDownloads.length === 0}
          >
            <FaDownload style={{ marginRight: "8px" }} />
            Download All ({filteredDownloads.length} pending)
          </ButtonItem>
        </PanelSectionRow>
        {ignoredCount > 0 && (
          <PanelSectionRow>
            <span style={{ fontSize: "12px", color: "#8b929a" }}>
              {ignoredCount} download{ignoredCount !== 1 ? "s" : ""} ignored by filter
            </span>
          </PanelSectionRow>
        )}
      </PanelSection>

      <PanelSection title="Download Behavior">
        {modeOptions.map((opt) => (
          <PanelSectionRow key={opt.data}>
            <ButtonItem
              layout="below"
              onClick={() => update({ mode: opt.data })}
            >
              {settings.mode === opt.data && <FaCheck style={{ marginRight: "8px" }} />}
              {opt.label}
            </ButtonItem>
          </PanelSectionRow>
        ))}

        {settings.mode === "size-limit" && (
          <PanelSectionRow>
            <SliderField
              label={`Max Size: ${settings.maxSizeMB} MB`}
              value={settings.maxSizeMB}
              min={100}
              max={10000}
              step={100}
              onChange={(v) => update({ maxSizeMB: v })}
            />
          </PanelSectionRow>
        )}
      </PanelSection>
    </>
  );
};

// Plugin entry
export default definePlugin(() => {
  return {
    name: "Download All Button",
    content: <PluginContent />,
    icon: <FaDownload />,
  };
});
