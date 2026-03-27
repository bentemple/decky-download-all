import { definePlugin, toaster } from "@decky/api";
import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  SliderField,
} from "@decky/ui";
import { useState, useEffect, FC } from "react";
import { FaDownload, FaCheck } from "react-icons/fa";
// Set to true to show debug info in the UI
const DEBUG = false;

// Minimal type for download items (based on actual runtime structure)
interface ProgressInfo {
  bytes_total: number;
  bytes_in_progress: number;
}

interface UpdateTypeInfo {
  has_update: boolean;
  completed_update: boolean;
  progress?: ProgressInfo[];
}

interface DownloadItem {
  appid: number;
  active: boolean;
  completed: boolean;
  paused: boolean;
  queue_index: number; // -1 if unscheduled, >= 0 if in queue
  deferred_time: number; // >0 if scheduled for later, 0 if not scheduled
  update_type_info?: UpdateTypeInfo[];
}

// Helper to get total bytes from nested structure (only pending updates)
const getTotalBytes = (d: DownloadItem): number => {
  let total = 0;
  for (const info of d.update_type_info || []) {
    if (info.has_update && !info.completed_update) {
      for (const prog of info.progress || []) {
        total += prog.bytes_total || 0;
      }
    }
  }
  return total;
};

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
      setDownloads(items.filter((d) => !d.completed) as DownloadItem[]);
    });
    return () => reg.unregister();
  }, []);

  // Items not yet in the queue
  const isUnqueued = (d: DownloadItem) => d.queue_index === -1;


  const handleDownloadAll = () => {
    // Start with items NOT in the queue
    let items = downloads.filter(isUnqueued);

    // Filter based on mode
    if (settings.mode === "scheduled") {
      // Only future-scheduled items
      items = items.filter((d) => d.deferred_time > 0);
    } else if (settings.mode === "size-limit") {
      // Future-scheduled items within size limit
      const maxBytes = settings.maxSizeMB * 1024 * 1024;
      items = items.filter((d) => d.deferred_time > 0 && getTotalBytes(d) <= maxBytes);
    }
    // "all" mode: include all unqueued items (no additional filter)

    if (items.length === 0) {
      toaster.toast({
        title: "Download All",
        body: "No downloads to queue",
      });
      return;
    }

    // Sort smallest first
    items.sort((a, b) => getTotalBytes(a) - getTotalBytes(b));

    // Find the end of the current queue
    const maxQueueIndex = Math.max(...downloads.map((d) => d.queue_index), -1);

    // Add items to queue, then position them (smallest first at end of existing queue)
    for (let i = 0; i < items.length; i++) {
      SteamClient.Downloads.QueueAppUpdate(items[i].appid);
      SteamClient.Downloads.SetQueueIndex(items[i].appid, maxQueueIndex + 1 + i);
    }

    // Resume downloading if paused
    SteamClient.Downloads.ResumeAppUpdate(downloads.find((d) => d.queue_index === 0)?.appid ?? items[0].appid);

    toaster.toast({
      title: "Download All",
      body: `Added ${items.length} downloads to queue (smallest first)`,
    });
  };

  const modeOptions: { label: string; data: Mode }[] = [
    { label: "All", data: "all" },
    { label: "Scheduled", data: "scheduled" },
    { label: "Scheduled With Size Limit", data: "size-limit" },
  ];

  // Compute items that will be added to queue based on current mode
  const getItemsToQueue = () => {
    let items = downloads.filter(isUnqueued);
    if (settings.mode === "scheduled") {
      return items.filter((d) => d.deferred_time > 0);
    } else if (settings.mode === "size-limit") {
      const maxBytes = settings.maxSizeMB * 1024 * 1024;
      return items.filter((d) => d.deferred_time > 0 && getTotalBytes(d) <= maxBytes);
    }
    return items; // "all" mode
  };

  const itemsToQueue = getItemsToQueue();
  const alreadyQueued = downloads.filter((d) => d.queue_index >= 0).length;
  const ignoredCount = downloads.filter(isUnqueued).length - itemsToQueue.length;

  // Debug: show all downloads' actual data
  const debugInfo = downloads.length > 0 ? JSON.stringify(downloads, null, 1) : "none";

  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={handleDownloadAll}
            disabled={itemsToQueue.length === 0}
          >
            <FaDownload style={{ marginRight: "8px" }} />
            Queue {itemsToQueue.length} Download{itemsToQueue.length !== 1 ? "s" : ""}
          </ButtonItem>
        </PanelSectionRow>
        {(alreadyQueued > 0 || ignoredCount > 0) && (
          <PanelSectionRow>
            <span style={{ fontSize: "12px", color: "#8b929a" }}>
              {alreadyQueued > 0 && `${alreadyQueued} Already Queued`}
              {alreadyQueued > 0 && ignoredCount > 0 && ", "}
              {ignoredCount > 0 && `${ignoredCount} Filtered Out by Download Behavior Configuration`}
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
        {DEBUG && (
          <PanelSectionRow>
            <pre style={{ fontSize: "9px", color: "#8b929a", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
              {debugInfo}
            </pre>
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
