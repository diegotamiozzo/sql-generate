import { HelpCircle, Eye, RefreshCw, Hash } from "lucide-react";
import type { ColumnInfo } from "../../types";

interface TableDetailsPanelProps {
  activeTab: "schema" | "preview";
  onTabChange: (tab: "schema" | "preview") => void;
  selectedTable: string;
  columns: ColumnInfo[];
  previewRows: Record<string, unknown>[];
  isLoadingSchema: boolean;
}

export function TableDetailsPanel({
  activeTab,
  onTabChange,
  selectedTable,
  columns,
  previewRows,
  isLoadingSchema,
}: TableDetailsPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden min-h-87.5">
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1 shrink-0">
        <button
          onClick={() => onTabChange("schema")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === "schema"
              ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Estrutura ({columns.length})
        </button>
        <button
          onClick={() => onTabChange("preview")}
          disabled={!selectedTable}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all disabled:opacity-40 cursor-pointer ${
            activeTab === "preview"
              ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900 disabled:hover:text-slate-500"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          Prévia (5 rows)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-h-112.5">
        {isLoadingSchema ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-xs font-semibold">Buscando estrutura...</p>
          </div>
        ) : !selectedTable ? (
          <div className="flex flex-col items-center justify-center text-center h-full py-12 px-6 text-slate-400 space-y-2">
            <span className="sr-only">Table</span>
            <p className="text-xs font-medium">
              Selecione uma tabela para carregar sua estrutura & dados
            </p>
          </div>
        ) : activeTab === "schema" ? (
          <div className="space-y-2">
            {columns.map((col, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100"
              >
                <div className="flex items-center space-x-2.5">
                  <Hash
                    className={`h-3.5 w-3.5 ${col.key === "PRI" ? "text-amber-500" : "text-slate-400"}`}
                  />
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    {col.field}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                    {col.type}
                  </span>
                  {col.key === "PRI" && (
                    <span className="text-[9px] uppercase font-bold px-1 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-200">
                      🔑 PRI
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {previewRows.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Tabela vazia ou sem registros para exibir.
              </p>
            ) : (
              previewRows.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-sm space-y-1.5"
                >
                  <div className="text-[10px] font-bold text-indigo-500 border-b border-indigo-100 pb-1 mb-1 bg-indigo-50/50 px-1.5 py-0.5 rounded flex items-center justify-between">
                    <span>REGISTRO #{idx + 1}</span>
                    <span className="font-mono text-[9px] text-slate-400">
                      INDEX
                    </span>
                  </div>
                  {Object.entries(row).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex flex-col text-xs leading-tight"
                    >
                      <span className="font-semibold text-slate-500 font-mono text-[10px]">
                        {key}:
                      </span>
                      <span className="text-slate-800 font-medium pl-1 wrap-break-word">
                        {val === null ? (
                          <em className="text-slate-400">null</em>
                        ) : (
                          String(val)
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
