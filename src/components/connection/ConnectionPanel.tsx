import { Server, RefreshCw } from "lucide-react";
import type { DbConfig } from "../../types";

interface ConnectionPanelProps {
  dbConfig: DbConfig;
  isConnecting: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConnect: () => void;
}

export function ConnectionPanel({
  dbConfig,
  isConnecting,
  onInputChange,
  onConnect,
}: ConnectionPanelProps) {
  return (
    <section className="bg-white border-b border-slate-200 py-6 px-4 shadow-inner transition-transform animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <Server className="h-4 w-4 text-indigo-500" />
          Parâmetros de Conexão MariaDB / MySQL
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Host do Servidor (IP / URI)
            </label>
            <input
              type="text"
              name="host"
              value={dbConfig.host}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="ex: 127.0.0.1"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Usuário
            </label>
            <input
              type="text"
              name="user"
              value={dbConfig.user}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="ex: root"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Senha
            </label>
            <input
              type="password"
              name="password"
              value={dbConfig.password}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="Senha do banco"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Porta
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="port"
                value={dbConfig.port}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                placeholder="3306"
              />
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 min-w-25 shadow"
              >
                {isConnecting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Conectar"
                )}
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2 italic">
          * Carregue aqui suas configurações de seu banco de dados.
        </p>
      </div>
    </section>
  );
}
