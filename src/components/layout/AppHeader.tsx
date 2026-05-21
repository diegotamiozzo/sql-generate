import { Settings, ChevronDown, ChevronUp } from "lucide-react";

interface AppHeaderProps {
  isConnected: boolean;
  isConfigOpen: boolean;
  onToggleConfig: () => void;
}

export function AppHeader({
  isConnected,
  isConfigOpen,
  onToggleConfig,
}: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100">
            <span className="sr-only">Database</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              Explorador e Gerador SQL Inteligente
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Bancos de Dados
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-400"}`}
            />
            <span className="text-xs font-semibold text-slate-600 hidden sm:inline-block">
              {isConnected ? "Conectado ao MariaDB" : "Desconectado"}
            </span>
          </div>

          <button
            onClick={onToggleConfig}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors duration-150 border border-slate-200 cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Configuração</span>
            {isConfigOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
