import { useState, useEffect } from "react";
import type { ColumnInfo, DbConfig } from "../types";

const SYSTEM_DATABASES = [
  "information_schema",
  "mysql",
  "performance_schema",
  "sys",
];

export function useDatabaseApp() {
  const [dbConfig, setDbConfig] = useState<DbConfig>({
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

  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<"schema" | "preview">("schema");

  const [promptInput, setPromptInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSql, setGeneratedSql] = useState("");
  const [sqlExplanation, setSqlExplanation] = useState("");
  const [sqlSuggestions, setSqlSuggestions] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [queryRows, setQueryRows] = useState<Record<string, unknown>[]>([]);
  const [queryCount, setQueryCount] = useState<number | null>(null);
  const [queryError, setQueryError] = useState("");
  const [isQueryExecuted, setIsQueryExecuted] = useState(false);

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
    } catch {
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
    } catch {
      setErrorMsg("Erro ao buscar a estrutura da tabela.");
    } finally {
      setIsLoadingSchema(false);
    }
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

        if (data.databases && data.databases.length > 0) {
          const autoDb = data.databases.includes("informacao")
            ? "informacao"
            : data.databases.find(
                (d: string) => !SYSTEM_DATABASES.includes(d.toLowerCase()),
              ) || data.databases[0];

          setSelectedDatabase(autoDb);
          fetchTables(autoDb);
        }
      } else {
        setIsConnected(false);
        setErrorMsg(data.message || "Erro de conexão ao banco de dados.");
      }
    } catch (err) {
      console.error(err);
      setIsConnected(false);
      setErrorMsg(
        "O servidor de retaguarda não respondeu. Certifique-se de que o backend está ativo.",
      );
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (dbConfig.host !== "") {
      handleConnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDbConfig((prev) => ({ ...prev, [name]: value }));
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
    } catch {
      setErrorMsg("Erro no processamento da IA do Gemini.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePresetClick = (presetPrompt: string) => {
    setPromptInput(presetPrompt);
    generateSql(presetPrompt);
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
    } catch {
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

  return {
    dbConfig,
    isConfigOpen,
    setIsConfigOpen,
    isConnecting,
    isConnected,
    databases,
    selectedDatabase,
    tables,
    selectedTable,
    errorMsg,
    columns,
    previewRows,
    isLoadingSchema,
    activeTab,
    setActiveTab,
    promptInput,
    setPromptInput,
    isGenerating,
    generatedSql,
    sqlExplanation,
    sqlSuggestions,
    copied,
    isExecutingQuery,
    queryRows,
    queryCount,
    queryError,
    isQueryExecuted,
    handleInputChange,
    handleConnect,
    handleDbChange,
    handleTableChange,
    handlePresetClick,
    generateSql,
    executeGeneratedSql,
    copyToClipboard,
  };
}
