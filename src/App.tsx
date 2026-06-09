import { PRESET_PROMPTS } from "./constants/presetPrompts";
import { useDatabaseApp } from "./hooks/useDatabaseApp";
import { AppHeader } from "./components/layout/AppHeader";
import { AppFooter } from "./components/layout/AppFooter";
import { ErrorAlert } from "./components/common/ErrorAlert";
import { ConnectionPanel } from "./components/connection/ConnectionPanel";
import { ScopeSelector } from "./components/sidebar/ScopeSelector";
import { TableDetailsPanel } from "./components/sidebar/TableDetailsPanel";
import { SqlGeneratorPanel } from "./components/sql/SqlGeneratorPanel";
import { SqlOutputPanel } from "./components/sql/SqlOutputPanel";

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
    { label: "📍 10 últimos registros", prompt: "Como posso extrair as 10 últimas linhas desta tabela?" },
    { label: "📊 Contar total", prompt: "Qual comando SQL para contar o total de linhas desta tabela?" },
    { label: "🔍 Buscar duplicados", prompt: "Como posso identificar registros duplicados ou repetidos nesta tabela?" },
    { label: "📅 Criados hoje / recentes", prompt: "Como selecionar os registros mais recentes ordenados por data ou id?" },
  ];

  // Try to connect of startup automatically with standard credentials
  useEffect(() => {
    handleConnect();
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
            : data.databases.find((d: string) => !["information_schema", "mysql", "performance_schema", "sys"].includes(d.toLowerCase())) || data.databases[0];
          
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
      setErrorMsg("O servidor de retaguarda não respondeu. Certifique-se de que o backend está ativo.");
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
        body: JSON.stringify({ ...dbConfig, database: dbName, table: tableName }),
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
      setErrorMsg("Por favor, digite uma pergunta ou selecione um rascunho rápido.");
      return;
    }

    if (!selectedDatabase || !selectedTable) {
      setErrorMsg("Por favor, selecione um banco de dados e uma tabela primeiro.");
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
        setErrorMsg(data.message || "Falha na geração com Inteligência Artificial.");
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
      <AppHeader
        isConnected={app.isConnected}
        isConfigOpen={app.isConfigOpen}
        onToggleConfig={() => app.setIsConfigOpen(!app.isConfigOpen)}
      />

      {app.isConfigOpen && (
        <ConnectionPanel
          dbConfig={app.dbConfig}
          isConnecting={app.isConnecting}
          onInputChange={app.handleInputChange}
          onConnect={app.handleConnect}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:grid md:grid-cols-12 gap-8">
        {app.errorMsg && <ErrorAlert message={app.errorMsg} />}

        <section className="md:col-span-4 flex flex-col space-y-6">
          <ScopeSelector
            isConnected={app.isConnected}
            isConnecting={app.isConnecting}
            databases={app.databases}
            selectedDatabase={app.selectedDatabase}
            tables={app.tables}
            selectedTable={app.selectedTable}
            onDatabaseChange={app.handleDbChange}
            onTableChange={app.handleTableChange}
          />

          <TableDetailsPanel
            activeTab={app.activeTab}
            onTabChange={app.setActiveTab}
            selectedTable={app.selectedTable}
            columns={app.columns}
            previewRows={app.previewRows}
            isLoadingSchema={app.isLoadingSchema}
          />
        </section>

        <section className="md:col-span-8 flex flex-col space-y-6">
          <SqlGeneratorPanel
            selectedTable={app.selectedTable}
            presetPrompts={PRESET_PROMPTS}
            promptInput={app.promptInput}
            isGenerating={app.isGenerating}
            onPromptChange={app.setPromptInput}
            onPresetClick={app.handlePresetClick}
            onGenerate={() => app.generateSql()}
          />

          <SqlOutputPanel
            generatedSql={app.generatedSql}
            sqlExplanation={app.sqlExplanation}
            sqlSuggestions={app.sqlSuggestions}
            copied={app.copied}
            isExecutingQuery={app.isExecutingQuery}
            isQueryExecuted={app.isQueryExecuted}
            queryRows={app.queryRows}
            queryCount={app.queryCount}
            queryError={app.queryError}
            onCopy={app.copyToClipboard}
            onExecute={app.executeGeneratedSql}
          />
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
