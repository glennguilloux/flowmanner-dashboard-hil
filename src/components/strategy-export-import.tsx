"use client";

import { useState } from "react";
import { Download, Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";

type Props = {
  strategyId: string;
  onImported?: () => void;
};

export function StrategyExportImport({ strategyId, onImported }: Props) {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<
    { ok: boolean; message: string } | null
  >(null);
  const [yamlInput, setYamlInput] = useState("");
  const [showImport, setShowImport] = useState(false);

  const handleExport = () => {
    window.location.href = `/api/strategies/${strategyId}/export`;
  };

  const handleImport = async () => {
    if (!yamlInput.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/strategies/import", {
        method: "POST",
        headers: { "Content-Type": "application/x-yaml" },
        body: yamlInput,
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setImportResult({ ok: true, message: "Strategy imported successfully" });
        setYamlInput("");
        onImported?.();
      } else {
        setImportResult({
          ok: false,
          message: data.error ?? "Import failed",
        });
      }
    } catch (err) {
      setImportResult({
        ok: false,
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setYamlInput(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
        >
          <Download className="h-4 w-4" /> Export YAML
        </button>
        <button
          onClick={() => setShowImport(!showImport)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
        >
          <Upload className="h-4 w-4" /> Import YAML
        </button>
      </div>

      {showImport && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:bg-slate-900 dark:border-slate-700">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="file"
              accept=".yaml,.yml"
              onChange={handleFilePick}
              className="text-sm text-slate-600"
            />
          </div>
          <textarea
            value={yamlInput}
            onChange={(e) => setYamlInput(e.target.value)}
            placeholder="Paste YAML here..."
            className="h-48 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleImport}
              disabled={importing || !yamlInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import
            </button>
            {importResult && (
              <span
                className={`inline-flex items-center gap-1 text-sm ${
                  importResult.ok ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {importResult.ok ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {importResult.message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
