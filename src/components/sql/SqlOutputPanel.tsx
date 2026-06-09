import {
  Terminal,
  Copy,
  Check,
  Play,
  RefreshCw,
  BookOpen,
  Lightbulb,
  AlertCircle,
  SquareTerminal,
} from "lucide-react";

interface SqlOutputPanelProps {
  generatedSql: string;
  sqlExplanation: string;
  sqlSuggestions: string[];
  copied: boolean;
  isExecutingQuery: boolean;
  isQueryExecuted: boolean;
  queryRows: Record<string, unknown>[];
  queryCount: number | null;
  queryError: string;
  onCopy: () => void;
  onExecute: () => void;
}

export function SqlOutputPanel({
  generatedSql,
  sqlExplanation,
  sqlSuggestions,
  copied,
  isExecutingQuery,
  isQueryExecuted,
  queryRows,
  queryCount,
  queryError,
  onCopy,
  onExecute,
}: SqlOutputPanelProps) {
  if (!generatedSql) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col space-y-6 animate-fadeIn pb-6">
      <div className="bg-slate-950 p-5 p-r-8 flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">
              Comando SQL Gerado
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCopy}
              className="p-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>

            <button
              onClick={onExecute}
              disabled={isExecutingQuery}
              className="p-1 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg transition-all shadow-md flex items-center justify-center gap-1 text-xs font-bold cursor-pointer"
            >
              {isExecutingQuery ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Executando...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Testar Consulta</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <pre className="font-mono text-sm font-semibold text-emerald-400 leading-relaxed whitespace-pre-wrap pl-1">
            {generatedSql}
          </pre>
        </div>
      </div>

      <div className="px-6 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
          <BookOpen className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800">
            Explicação do Funcionamento
          </h3>
        </div>
        <p className="text-xs text-slate-600 font-medium leading-relaxed pl-1">
          {sqlExplanation}
        </p>
      </div>

      {sqlSuggestions && sqlSuggestions.length > 0 && (
        <div className="px-6 space-y-2">
          <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Dicas & Recomendações Técnicas
            </h3>
          </div>
          <ul className="list-disc list-inside space-y-1.5 pl-1.5">
            {sqlSuggestions.map((sug, idx) => (
              <li key={idx} className="text-xs text-slate-600 font-medium">
                {sug}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isQueryExecuted && (
        <div className="px-6 pt-2 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
              <SquareTerminal className="h-4 w-4 text-emerald-500" />
              Visualização de Dados em Tempo Real (Resultado)
            </h3>
            {queryCount !== null && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                {queryCount}{" "}
                {queryCount === 1
                  ? "registro encontrado"
                  : "registros encontrados"}
              </span>
            )}
          </div>

          {queryError ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{queryError}</span>
            </div>
          ) : queryRows.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 text-slate-500 p-8 rounded-xl text-center text-xs font-medium">
              A consulta foi executada com sucesso, mas retornou zero
              registros.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-75">
                <table className="w-full text-left border-collapse bg-white">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-mono text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      {Object.keys(queryRows[0]).map((header) => (
                        <th
                          key={header}
                          className="p-3 whitespace-nowrap bg-slate-50"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {queryRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        {Object.values(row).map((val, cIdx) => (
                          <td
                            key={cIdx}
                            className="p-3 whitespace-nowrap font-mono max-w-50 truncate"
                          >
                            {val === null ? (
                              <span className="text-slate-400 italic">
                                null
                              </span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
