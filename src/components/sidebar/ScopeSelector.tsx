import { ChevronDown } from "lucide-react";

interface ScopeSelectorProps {
  isConnected: boolean;
  isConnecting: boolean;
  databases: string[];
  selectedDatabase: string;
  tables: string[];
  selectedTable: string;
  onDatabaseChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onTableChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function ScopeSelector({
  isConnected,
  isConnecting,
  databases,
  selectedDatabase,
  tables,
  selectedTable,
  onDatabaseChange,
  onTableChange,
}: ScopeSelectorProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
        <span className="sr-only">Database</span>
        Seleção de Escopo
      </h2>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
          Banco de Dados
        </label>
        <div className="relative">
          <select
            disabled={!isConnected || isConnecting}
            value={selectedDatabase}
            onChange={onDatabaseChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
          >
            {!isConnected ? (
              <option>Desconectado - Conecte no topo</option>
            ) : databases.length === 0 ? (
              <option>Nenhum banco encontrado</option>
            ) : (
              databases.map((db) => (
                <option key={db} value={db}>
                  🗄️ {db}
                </option>
              ))
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
          Tabela
        </label>
        <div className="relative">
          <select
            disabled={!isConnected || tables.length === 0}
            value={selectedTable}
            onChange={onTableChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
          >
            {!isConnected ? (
              <option>Escolha o banco acima</option>
            ) : tables.length === 0 ? (
              <option>Nenhuma tabela encontrada</option>
            ) : (
              tables.map((tbl) => (
                <option key={tbl} value={tbl}>
                  📊 {tbl}
                </option>
              ))
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
