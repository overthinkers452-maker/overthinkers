import { Platform } from "react-native";

export interface ExportPayload {
  profile: Record<string, unknown>;
  thoughts: Record<string, unknown>[];
  settings: Record<string, unknown>;
  exportedAt: string;
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildJSON(payload: ExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function buildCSV(payload: ExportPayload): string {
  const rows = payload.thoughts;
  if (rows.length === 0) return "id,content,postingMode,createdAt\n";
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

async function downloadWeb(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadNative(filename: string, content: string) {
  const FileSystem = await import("expo-file-system/legacy");
  const Sharing = await import("expo-sharing");
  const uri = (FileSystem.cacheDirectory ?? "") + filename;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: filename.endsWith(".csv") ? "text/csv" : "application/json" });
  }
}

export async function exportData(payload: ExportPayload, format: "json" | "csv"): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    const content = buildJSON(payload);
    const filename = `overthinkers-export-${stamp}.json`;
    if (Platform.OS === "web") return downloadWeb(filename, content, "application/json");
    return downloadNative(filename, content);
  } else {
    const content = buildCSV(payload);
    const filename = `overthinkers-thoughts-${stamp}.csv`;
    if (Platform.OS === "web") return downloadWeb(filename, content, "text/csv");
    return downloadNative(filename, content);
  }
}
