import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Play,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Terminal,
  ArrowRight,
  BookOpen,
  Lightbulb,
  Server,
  HelpCircle,
  Hash,
  Eye,
  Menu,
  SquareTerminal,
} from "lucide-react";

export default function App() {
  // Database configuration state (prefilled with user's specific credentials)
  const [dbConfig, setDbConfig] = useState({
    host: "",
    user: "",
    password: "",
    port: "",
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [connectionInfo, setConnectionInfo] = useState("");

  // Table Schema & Preview States
  const [columns, setColumns] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<"schema" | "preview">("schema");

  // AI Generation States
  const [promptInput, setPromptInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSql, setGeneratedSql] = useState("");
  const [sqlExplanation, setSqlExplanation] = useState("");
  const [sqlSuggestions, setSqlSuggestions] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Dynamic Query Execution States
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [queryRows, setQueryRows] = useState<any[]>([]);
  const [queryCount, setQueryCount] = useState<number | null>(null);
  const [queryError, setQueryError] = useState("");
  const [isQueryExecuted, setIsQueryExecuted] = useState(false);

  // Preset prompts for quick clicking!
  const presetPrompts = [
    {
      label: " 10 últimos registros",
      prompt: "Como posso extrair as 10 últimas linhas desta tabela?",
    },
    {
      label: " Contar total",
      prompt: "Qual comando SQL para contar o total de linhas desta tabela?",
    },
    {
      label: " Buscar duplicados",
      prompt:
        "Como posso identificar registros duplicados ou repetidos nesta tabela?",
    },
    {
      label: " Criados hoje / recentes",
      prompt:
        "Como selecionar os registros mais recentes ordenados por data ou id?",
    },
  ];

  // Try to connect of startup automatically with standard credentials
  useEffect(() => {
    if (dbConfig.host !== "") {
      handleConnect();
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDbConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/db/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });
      const data = await response.json();

      if (data.success) {
        setDatabases(data.databases);
        setIsConnected(true);
        setConnectionInfo(data.serverInfo);

        // Auto-select first database if available
        if (data.databases && data.databases.length > 0) {
          const autoDb = data.databases.includes("informacao")
            ? "informacao"
            : data.databases.find(
                (d: string) =>
                  ![
                    "information_schema",
                    "mysql",
                    "performance_schema",
                    "sys",
                  ].includes(d.toLowerCase()),
              ) || data.databases[0];

          setSelectedDatabase(autoDb);
          fetchTables(autoDb);
        }
      } else {
        setIsConnected(false);
        setErrorMsg(data.message || "Erro de conexão ao banco de dados.");
      }
    } catch (err: any) {
      console.error(err);
      setIsConnected(false);
      setErrorMsg(
        "O servidor de retaguarda não respondeu. Certifique-se de que o backend está ativo.",
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchTables = async (dbName: string) => {
    setErrorMsg("");
    setTables([]);
    setSelectedTable("");
    setColumns([]);
    setPreviewRows([]);
    try {
      const response = await fetch("/api/db/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dbConfig, database: dbName }),
      });
      const data = await response.json();

      if (data.success) {
        setTables(data.tables);
        if (data.tables.length > 0) {
          setSelectedTable(data.tables[0]);
          fetchSchema(dbName, data.tables[0]);
        }
      } else {
        setErrorMsg(data.message || "Não foi possível carregar as tabelas.");
      }
    } catch (err) {
      setErrorMsg("Erro de comunicação ao carregar tabelas.");
    }
  };

  const fetchSchema = async (dbName: string, tableName: string) => {
    if (!dbName || !tableName) return;
    setIsLoadingSchema(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/db/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...dbConfig,
          database: dbName,
          table: tableName,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setColumns(data.columns);
        setPreviewRows(data.preview);
      } else {
        setErrorMsg(data.message || "Erro ao coletar esquema da tabela.");
      }
    } catch (err) {
      setErrorMsg("Erro ao buscar a estrutura da tabela.");
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const handleDbChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const db = e.target.value;
    setSelectedDatabase(db);
    fetchTables(db);
    resetSqlOutput();
  };

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const table = e.target.value;
    setSelectedTable(table);
    fetchSchema(selectedDatabase, table);
    resetSqlOutput();
  };

  const resetSqlOutput = () => {
    setGeneratedSql("");
    setSqlExplanation("");
    setSqlSuggestions([]);
    setQueryRows([]);
    setQueryCount(null);
    setQueryError("");
    setIsQueryExecuted(false);
  };

  const handlePresetClick = (presetPrompt: string) => {
    setPromptInput(presetPrompt);
    generateSql(presetPrompt);
  };

  const generateSql = async (customPrompt?: string) => {
    const actualPrompt = customPrompt || promptInput;
    if (!actualPrompt.trim()) {
      setErrorMsg(
        "Por favor, digite uma pergunta ou selecione um rascunho rápido.",
      );
      return;
    }

    if (!selectedDatabase || !selectedTable) {
      setErrorMsg(
        "Por favor, selecione um banco de dados e uma tabela primeiro.",
      );
      return;
    }

    setIsGenerating(true);
    setErrorMsg("");
    setQueryError("");
    setIsQueryExecuted(false);

    try {
      const response = await fetch("/api/db/generate-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: selectedDatabase,
          table: selectedTable,
          columns,
          preview: previewRows,
          prompt: actualPrompt,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedSql(data.sql);
        setSqlExplanation(data.explanation);
        setSqlSuggestions(data.suggestions);
      } else {
        setErrorMsg(
          data.message || "Falha na geração com Inteligência Artificial.",
        );
      }
    } catch (err) {
      setErrorMsg("Erro no processamento da IA do Gemini.");
    } finally {
      setIsGenerating(false);
    }
  };

  const executeGeneratedSql = async () => {
    if (!generatedSql) return;
    setIsExecutingQuery(true);
    setQueryError("");
    setQueryRows([]);
    setQueryCount(null);
    setIsQueryExecuted(true);

    try {
      const response = await fetch("/api/db/execute-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...dbConfig,
          database: selectedDatabase,
          sql: generatedSql,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQueryRows(data.rows);
        setQueryCount(data.count);
      } else {
        setQueryError(data.message || "Falha ocorrendo na execução do SQL.");
      }
    } catch (err) {
      setQueryError("Erro de comunicação ao executar consulta no banco.");
    } finally {
      setIsExecutingQuery(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedSql) return;
    navigator.clipboard.writeText(generatedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Professional Header */}
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
            {/* Connection Status indicator badge */}
            <div className="flex items-center space-x-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-400"}`}
              ></span>
              <span className="text-xs font-semibold text-slate-600 hidden sm:inline-block">
                {isConnected ? `Conectado ao MariaDB` : "Desconectado"}
              </span>
            </div>

            {/* Connection trigger button */}
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
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

      {/* Database Connection Panel (Toggleable dropdown details) */}
      {isConfigOpen && (
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    placeholder="3306"
                  />
                  <button
                    onClick={handleConnect}
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
      )}

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:grid md:grid-cols-12 gap-8">
        {/* Error Notification Alert */}
        {errorMsg && (
          <div className="md:col-span-12 bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex items-start space-x-3 mb-4 shadow-sm">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-rose-800">
                Atenção / Ocorreu um contratempo
              </h4>
              <p className="text-xs text-rose-700 mt-1 font-medium">
                {errorMsg}
              </p>
            </div>
          </div>
        )}

        {/* COL 1: SIDEBAR (Database & Table Selectors + Schema Structure) - span 4 / 12 */}
        <section className="md:col-span-4 flex flex-col space-y-6">
          {/* Databases & Tables selection Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="sr-only">Database</span>
              Seleção de Escopo
            </h2>

            {/* Database Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Banco de Dados
              </label>
              <div className="relative">
                <select
                  disabled={!isConnected || isConnecting}
                  value={selectedDatabase}
                  onChange={handleDbChange}
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

            {/* Table Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Tabela
              </label>
              <div className="relative">
                <select
                  disabled={!isConnected || tables.length === 0}
                  value={selectedTable}
                  onChange={handleTableChange}
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

          {/* Table Details panel: Fields (structure) vs Sample (first 5 rows info) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden min-h-87.5">
            {/* Nav Headers with active states */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1 shrink-0">
              <button
                onClick={() => setActiveTab("schema")}
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
                onClick={() => setActiveTab("preview")}
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

            {/* Panel details body */}
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
                /* Columns Listing */
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
                /* Raw Preview rows (First 5 records like the Python sample!) */
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
                        {Object.entries(row).map(
                          ([key, val]: [string, any]) => (
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
                          ),
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* COL 2: MAIN PANEL (AI Query Workspace + Test Execution) - span 8 / 12 */}
        <section className="md:col-span-8 flex flex-col space-y-6">
          {/* AI SQL Generating Card */}
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

            {/* Preset prompt pills */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 block">
                Opções de Perguntas Rápidas:
              </span>
              <div className="flex flex-wrap gap-2">
                {presetPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetClick(p.prompt)}
                    disabled={!selectedTable || isGenerating}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-250 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-semibold rounded-xl transition-all duration-150 disabled:opacity-45 disabled:hover:bg-slate-50 disabled:hover:text-slate-700 shadow-sm cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input prompt Textarea */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500">
                Digite sua pergunta inteligente para gerar o SQL correspondente:
              </label>
              <div className="flex flex-col gap-2">
                <textarea
                  disabled={!selectedTable || isGenerating}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Ex: Como posso listar as 10 últimas linhas ordenando pelo ID de forma decrescente?"
                  className="w-full h-24 p-4 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none disabled:bg-slate-50 placeholder:text-slate-400"
                ></textarea>
                <div className="flex justify-end">
                  <button
                    onClick={() => generateSql()}
                    disabled={
                      !selectedTable || !promptInput.trim() || isGenerating
                    }
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

          {/* AI SQL Output View (Only displays if SQL is generated) */}
          {generatedSql && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col space-y-6 animate-fadeIn pb-6">
              {/* Header card view of Code */}
              <div className="bg-slate-950 p-5 p-r-8 flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                      Comando SQL Gerado
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Copy Button */}
                    <button
                      onClick={copyToClipboard}
                      className="p-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">
                            Copiado!
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    {/* Execute SQL testing button */}
                    <button
                      onClick={executeGeneratedSql}
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

                {/* Real code element output */}
                <div className="overflow-x-auto">
                  <pre className="font-mono text-sm font-semibold text-emerald-400 leading-relaxed whitespace-pre-wrap pl-1">
                    {generatedSql}
                  </pre>
                </div>
              </div>

              {/* Step explanation card details */}
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

              {/* Suggestions bullets */}
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
                      <li
                        key={idx}
                        className="text-xs text-slate-600 font-medium"
                      >
                        {sug}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Query Results Data table once testing clicked */}
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
                    /* Elegant results table with scroll headers */
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
                                {Object.values(row).map((val: any, cIdx) => (
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
          )}
        </section>
      </main>

      {/* Humble Footer with instructions */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-medium shrink-0">
        <div className="max-w-7xl mx-auto px-4">
          <p>
            © 2026 SQL AI Assistant. Desenvolvido para exploração e engenharia
            rápida de bancos de dados.
          </p>
          <p className="mt-1 font-semibold text-indigo-400">
            Desenvolvido por Diego Tamiozzo
          </p>
        </div>
      </footer>
    </div>
  );
}
