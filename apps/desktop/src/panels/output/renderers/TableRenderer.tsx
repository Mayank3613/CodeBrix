import { useState, useMemo } from "react";
import type { TableOutputMessage, OutputMessage } from "@codebrix/types";
import type { RendererProps } from "../registry";
import { useWorkflowStore, useUiStore } from "../../../stores";
import { blockRegistry } from "../../../registry";
import {
  ChevronUp,
  ChevronDown,
  Search,
  Download,
  Table as TableIcon,
  ChevronsUpDown,
} from "lucide-react";

function BlockChip({ blockId }: { blockId: string }) {
  const block = useWorkflowStore((s) => s.graph.blocks[blockId]);
  const focusBlock = useUiStore((s) => s.focusBlock);
  const label = block?.label || (block?.definitionId ? blockRegistry.get(block.definitionId)?.name : null) || "Dataset";

  return (
    <button
      type="button"
      onClick={() => focusBlock(blockId)}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-300 font-mono text-[10px] cursor-pointer transition-colors"
      title={`Focus ${label} on canvas`}
    >
      <span>{label}</span>
    </button>
  );
}

export default function TableRenderer({
  messages,
  runState,
  executionResult,
}: RendererProps<OutputMessage>) {
  const tableOutputs = useMemo(
    () => messages.filter((m): m is TableOutputMessage => m.type === "table"),
    [messages]
  );

  const [selectedTableIdx, setSelectedTableIdx] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Sync selected index if table outputs change
  const currentTable = tableOutputs[selectedTableIdx] ?? tableOutputs[tableOutputs.length - 1];

  const graphBlocks = useWorkflowStore((s) => s.graph.blocks);

  // Infer if columns are numeric
  const numericColumns = useMemo(() => {
    if (!currentTable || currentTable.rows.length === 0) return new Set<number>();
    const numericSet = new Set<number>();
    currentTable.columns.forEach((_, colIdx) => {
      let isNum = true;
      let nonNullCount = 0;
      for (let r = 0; r < Math.min(currentTable.rows.length, 20); r++) {
        const val = currentTable.rows[r]?.[colIdx];
        if (val !== null && val !== undefined && val !== "") {
          nonNullCount++;
          if (typeof val !== "number" && isNaN(Number(val))) {
            isNum = false;
            break;
          }
        }
      }
      if (isNum && nonNullCount > 0) {
        numericSet.add(colIdx);
      }
    });
    return numericSet;
  }, [currentTable]);

  // Filtered and sorted rows
  const displayedRows = useMemo(() => {
    if (!currentTable) return [];
    let rows = currentTable.rows;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter((row) =>
        row.some((cell) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(q))
      );
    }

    if (sortCol !== null && sortCol < currentTable.columns.length) {
      const isNum = numericColumns.has(sortCol);
      rows = [...rows].sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (isNum) {
          const nA = Number(valA);
          const nB = Number(valB);
          return sortAsc ? nA - nB : nB - nA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [currentTable, searchTerm, sortCol, sortAsc, numericColumns]);

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortCol(null);
        setSortAsc(true);
      }
    } else {
      setSortCol(colIdx);
      setSortAsc(true);
    }
  };

  const handleExportCsv = () => {
    if (!currentTable) return;
    const headerRow = currentTable.columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(",");
    const dataRows = currentTable.rows.map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return "";
          return `"${String(cell).replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headerRow, ...dataRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const titleSlug = (currentTable.title || "dataset").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    link.setAttribute("download", `${titleSlug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentTable) {
    if (runState === "running") {
      return (
        <div className="text-amber-400 text-center py-8 flex flex-col items-center gap-2 font-mono text-xs">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
          <span className="font-sans text-xs">
            Loading dataset from Python process... preview will render once received.
          </span>
        </div>
      );
    }

    if (executionResult?.status === "failed") {
      return (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-center font-sans text-xs text-rose-300">
          Execution failed before dataset could be loaded. Check Console tab for traceback.
        </div>
      );
    }

    return (
      <div className="text-slate-500 text-center py-8 font-sans text-xs">
        No tabular dataset loaded yet. Connect a CSV Loader or dataset block and click{" "}
        <span className="text-emerald-400 font-semibold">"Run Pipeline"</span>.
      </div>
    );
  }

  const rowCount = currentTable.totalRows ?? currentTable.rows.length;
  const colCount = currentTable.totalColumns ?? currentTable.columns.length;

  // Resolve display name
  let tableDisplayName = currentTable.title || "Dataset Preview";
  if (currentTable.blockId && graphBlocks[currentTable.blockId]) {
    tableDisplayName = graphBlocks[currentTable.blockId].label || tableDisplayName;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-[var(--cb-radius-control)] border border-[var(--cb-border-subtle)] overflow-hidden bg-black/20 font-mono text-xs">
      {/* ── Table Header Toolbar ── */}
      <div className="px-3 py-2 bg-white/[0.02] border-b border-[var(--cb-border-subtle)] text-xs font-sans text-slate-300 flex flex-wrap justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {tableOutputs.length > 1 ? (
            <select
              value={selectedTableIdx}
              onChange={(e) => setSelectedTableIdx(Number(e.target.value))}
              className="bg-black/40 border border-[var(--cb-border-subtle)] text-[var(--cb-text-primary)] rounded-[var(--cb-radius-sm)] px-2 py-1 text-xs font-medium focus:outline-none focus:border-[var(--cb-accent)] cursor-pointer"
            >
              {tableOutputs.map((tbl, idx) => {
                let name = tbl.title || `Table ${idx + 1}`;
                if (tbl.blockId && graphBlocks[tbl.blockId]) {
                  name = `${graphBlocks[tbl.blockId].label || name}`;
                }
                return (
                  <option key={idx} value={idx}>
                    {name} ({tbl.totalRows ?? tbl.rows.length} rows)
                  </option>
                );
              })}
            </select>
          ) : (
            <div className="flex items-center gap-1.5">
              <TableIcon size={14} className="text-cyan-400" />
              <span className="font-semibold text-white">{tableDisplayName}</span>
            </div>
          )}

          {currentTable.blockId && <BlockChip blockId={currentTable.blockId} />}
        </div>

        {/* Search, Stats & CSV Export */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-2 text-[var(--cb-text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search rows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-6 pr-2 py-0.5 w-32 md:w-44 bg-black/40 border border-[var(--cb-border-subtle)] rounded-[var(--cb-radius-sm)] text-[11px] text-[var(--cb-text-primary)] placeholder:text-[var(--cb-text-muted)] focus:outline-none focus:border-[var(--cb-accent)]"
            />
          </div>

          <span className="text-[var(--cb-text-muted)] font-mono text-[11px] hidden sm:inline">
            {rowCount} rows × {colCount} cols
          </span>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2 py-1 rounded-[var(--cb-radius-sm)] bg-white/[0.04] hover:bg-white/10 border border-[var(--cb-border-subtle)] text-[var(--cb-text-secondary)] hover:text-white text-[11px] cursor-pointer transition-colors"
            title="Download table as CSV"
          >
            <Download size={12} />
            <span className="hidden md:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Scrollable Table with Sticky Header ── */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-[#0b101b] border-b border-[var(--cb-border-subtle)] text-[11px] text-[var(--cb-text-muted)] sticky top-0 z-10 shadow-xs">
              <th className="p-2 border-r border-[var(--cb-border-subtle)] w-10 text-center select-none bg-[#0b101b]">
                #
              </th>
              {currentTable.columns.map((col, idx) => {
                const isNum = numericColumns.has(idx);
                const isSorted = sortCol === idx;

                return (
                  <th
                    key={idx}
                    onClick={() => handleSort(idx)}
                    className={`p-2 border-r border-[var(--cb-border-subtle)] font-medium text-[var(--cb-text-secondary)] hover:text-white whitespace-nowrap cursor-pointer select-none bg-[#0b101b] transition-colors ${
                      isNum ? "text-right" : "text-left"
                    }`}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${isNum ? "flex-row-reverse" : ""}`}>
                      <span>{col}</span>
                      {isSorted ? (
                        sortAsc ? (
                          <ChevronUp size={12} className="text-cyan-400" />
                        ) : (
                          <ChevronDown size={12} className="text-cyan-400" />
                        )
                      ) : (
                        <ChevronsUpDown size={11} className="text-slate-600 opacity-60" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-[var(--cb-text-primary)]">
            {displayedRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-white/[0.04] transition-colors">
                <td className="p-2 border-r border-[var(--cb-border-subtle)] text-center text-[var(--cb-text-muted)] select-none">
                  {rowIdx + 1}
                </td>
                {row.map((val, cellIdx) => {
                  const isNum = numericColumns.has(cellIdx);
                  return (
                    <td
                      key={cellIdx}
                      className={`p-2 border-r border-[var(--cb-border-subtle)] whitespace-nowrap ${
                        isNum ? "text-right font-mono" : "text-left"
                      }`}
                    >
                      {val === null || val === undefined ? (
                        <span className="text-slate-600 italic">null</span>
                      ) : typeof val === "number" ? (
                        Number.isInteger(val) ? (
                          val
                        ) : (
                          val.toFixed(3)
                        )
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
