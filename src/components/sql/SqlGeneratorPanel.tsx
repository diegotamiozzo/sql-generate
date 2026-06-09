import { Sparkles, RefreshCw } from "lucide-react";
import type { PresetPrompt } from "../../types";

interface SqlGeneratorPanelProps {
  selectedTable: string;
  presetPrompts: PresetPrompt[];
  promptInput: string;
  isGenerating: boolean;
  onPromptChange: (value: string) => void;
  onPresetClick: (prompt: string) => void;
  onGenerate: () => void;
}

export function SqlGeneratorPanel({
  selectedTable,
  presetPrompts,
  promptInput,
  isGenerating,
  onPromptChange,
  onPresetClick,
  onGenerate,
}: SqlGeneratorPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          Gerador de Consultas Inteligente
        </h2>
        {selectedTable && (
          <div className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
            Target:{" "}
            <span className="font-mono text-slate-800 font-bold">
              {selectedTable}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-400 block">
          Opções de Perguntas Rápidas:
        </span>
        <div className="flex flex-wrap gap-2">
          {presetPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onPresetClick(p.prompt)}
              disabled={!selectedTable || isGenerating}
              className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-250 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-semibold rounded-xl transition-all duration-150 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:text-slate-700 shadow-sm cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-500">
          Digite sua pergunta inteligente para gerar o SQL correspondente:
        </label>
        <div className="flex flex-col gap-2">
          <textarea
            disabled={!selectedTable || isGenerating}
            value={promptInput}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Ex: Como posso listar as 10 últimas linhas ordenando pelo ID de forma decrescente?"
            className="w-full h-24 p-4 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none disabled:bg-slate-50 placeholder:text-slate-400"
          />
          <div className="flex justify-end">
            <button
              onClick={onGenerate}
              disabled={!selectedTable || !promptInput.trim() || isGenerating}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 font-semibold text-xs text-white rounded-xl transition-colors shadow-lg hover:shadow-indigo-100 flex items-center gap-1.5 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Gerando SQL...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Gerar Comando SQL</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
