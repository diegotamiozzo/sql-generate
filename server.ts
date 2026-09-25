import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Gerenciador de pools de conexão em formato Map para isolar clientes/configurações com segurança
const poolMap = new Map<string, mysql.Pool>();

function getDbPool(config: any) {
  // Configuração padrão apontando para o RDS da AWS fornecido
  let host = config.host?.trim() || process.env.DB_HOST || "db-optimize.c1kqy2k6kba4.us-east-2.rds.amazonaws.com";
  if (host === "localhost") host = "127.0.0.1";

  const user = config.user?.trim() || process.env.DB_USER || undefined;
  const password = config.password?.trim() || process.env.DB_PASSWORD || undefined;
  const port = parseInt(config.port) || (process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306);
  const database = config.database?.trim() || process.env.DB_DATABASE || undefined;

  const configKey = `${host}:${port}:${user}:${database}`;

  if (poolMap.has(configKey)) {
    return poolMap.get(configKey)!;
  }

  const newPool = mysql.createPool({
    host,
    user,
    password,
    port,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 15000, // Timeout estendido para conexões com a AWS RDS
    // ssl: { rejectUnauthorized: false } // Descomente caso sua instância RDS exija SSL obrigatório
  });

  poolMap.set(configKey, newPool);
  return newPool;
}

// 1. API: Connect and Get Databases
app.post("/api/db/connect", async (req, res) => {
  try {
    const { host, user, password, port } = req.body;

    if (!host?.trim() && !user?.trim() && !process.env.DB_HOST) {
      return res.status(200).json({
        success: false,
        databases: [],
        message: "Aguardando a inserção dos parâmetros de conexão.",
      });
    }

    const pool = getDbPool({ host, user, password, port });
    const [rows]: [any[], any] = await pool.execute("SHOW DATABASES;");
    const databases = rows.map((row: any) => Object.values(row)[0]);

    res.json({
      success: true,
      databases,
      serverInfo: `AWS RDS MySQL @ ${host || "db-optimize..."}`,
    });
  } catch (error: any) {
    // Log seguro sem expor credenciais
    console.error("Erro de conexão AWS RDS:", error.message);
    res.status(500).json({
      success: false,
      message: "Falha ao conectar ao AWS RDS. Verifique se o IP da sua máquina está liberado no Security Group da AWS.",
    });
  }
});

// 2. API: Get Tables of Selected Database
app.post("/api/db/tables", async (req, res) => {
  try {
    const { host, user, password, port, database } = req.body;
    if (!database?.trim()) {
      return res.status(200).json({
        success: false,
        tables: [],
        message: "Selecione um banco de dados.",
      });
    }

    const pool = getDbPool({ host, user, password, port, database });
    const [rows]: [any[], any] = await pool.execute("SHOW TABLES;");
    const tables = rows.map((row: any) => Object.values(row)[0]);

    res.json({ success: true, tables });
  } catch (error: any) {
    console.error("Erro ao buscar tabelas no RDS:", error.message);
    res.status(500).json({ success: false, message: "Erro ao listar as tabelas do banco AWS." });
  }
});

// 3. API: Get Schema Columns and Sample Rows
app.post("/api/db/schema", async (req, res) => {
  try {
    const { host, user, password, port, database, table } = req.body;
    if (!database?.trim() || !table?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Banco de dados e tabela são obrigatórios.",
      });
    }

    const safeTableRegex = /^[a-zA-Z0-9_]+$/;
    if (!safeTableRegex.test(table)) {
      return res.status(400).json({
        success: false,
        message: "Nome de tabela inválido detectado por motivos de segurança.",
      });
    }

    const pool = getDbPool({ host, user, password, port, database });

    const [columnsRows]: [any[], any] = await pool.execute(`DESCRIBE \`${table}\`;`);
    const columns = columnsRows.map((col: any) => ({
      field: col.Field,
      type: col.Type,
      null: col.Null,
      key: col.Key,
      default: col.Default,
      extra: col.Extra,
    }));

    const [previewRows]: [any[], any] = await pool.execute(`SELECT * FROM \`${table}\` LIMIT 5;`);

    res.json({ success: true, columns, preview: previewRows });
  } catch (error: any) {
    console.error("Erro ao obter metadados do RDS:", error.message);
    res.status(500).json({
      success: false,
      message: "Erro ao obter estrutura e dados da tabela na AWS.",
    });
  }
});

// 4. API: Generate SQL prompt using Groq
app.post("/api/db/generate-sql", async (req, res) => {
  try {
    const { database, table, columns, preview, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: "Pergunta/prompt é obrigatório." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Chave da API do Groq (GROQ_API_KEY) não configurada no ambiente (.env).",
      });
    }

    const groq = new Groq({ apiKey });

    const columnsContext =
      columns && Array.isArray(columns)
        ? columns.map((c: any) => `${c.field} (${c.type}${c.key ? `, Chave: ${c.key}` : ""})`).join(", ")
        : "Estrutura não informada";

    const previewContext = preview ? JSON.stringify(preview, null, 2) : "Sem dados de prévia";

    const systemPrompt = `Você é um desenvolvedor e administrador de banco de dados especialista em MariaDB e MySQL SQL. Você DEVE responder estritamente no formato JSON puro, contendo exatamente as chaves: "sql" (string com a consulta SQL válida), "explanation" (string com a explicação em português) e "suggestions" (array de strings com sugestões). Não inclua blocos de código markdown como \`\`\`json.`;

    const userPromptText = `
Com base no banco de dados "${database}" e na tabela "${table}", com as seguintes colunas existentes:
[${columnsContext}]

Aqui estão alguns registros de exemplo (primeiras linhas) para referência da estrutura dos dados:
${previewContext}

Pergunta do Usuário: "${prompt}"

Por favor, gere uma consulta SQL válida para responder à pergunta do usuário sobre essa tabela do AWS RDS.
Importante:
1. Retorne APENAS um comando SQL válido executável no MySQL/MariaDB.
2. Use o nome correto das colunas fornecidas.
3. Explique passo a passo o comando em português simples.
4. Dê opiniões úteis ou sugestões de otimização/relacionadas.
`;

    const chatCompletion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptText }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    let resultText = chatCompletion.choices[0]?.message?.content || "{}";
    
    const cleanedText = resultText
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/, "")
      .trim();

    let resultJson;
    try {
      resultJson = JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn("Não foi possível processar o JSON limpo do Groq, utilizando fallback.");
      const fallbackSql = "SELECT * FROM `" + table + "` LIMIT 10;";
      resultJson = {
        sql: fallbackSql,
        explanation: "Comando SQL gerado automaticamente.",
        suggestions: ["Verifique os nomes de colunas e índices para performance na AWS."],
      };
    }

    res.json({
      success: true,
      sql: resultJson.sql,
      explanation: resultJson.explanation,
      suggestions: resultJson.suggestions || [],
    });
  } catch (error: any) {
    console.error("Erro na geração com o Groq:", error);
    const errorMessageString = error.message || "";

    if (errorMessageString.includes("429") || errorMessageString.includes("Rate limit")) {
      return res.status(200).json({
        success: false,
        message: "O limite de requisições da API do Groq foi atingido temporariamente.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Falha ao gerar comando SQL via IA do Groq.",
    });
  }
});

// 5. API: Execute generated query
app.post("/api/db/execute-query", async (req, res) => {
  try {
    const { host, user, password, port, database, sql } = req.body;
    if (!database?.trim() || !sql?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Banco de dados e SQL são obrigatórios.",
      });
    }

    const normalizedSql = sql.trim().toLowerCase();
    const isDangerous =
      /\b(drop|delete|insert|update|alter|create|truncate|grant|revoke|replace|merge)\b/.test(
        normalizedSql,
      );
    const isValidQuery =
      normalizedSql.startsWith("select") ||
      normalizedSql.startsWith("show") ||
      normalizedSql.startsWith("describe") ||
      normalizedSql.startsWith("explain");

    if (isDangerous || !isValidQuery) {
      return res.status(400).json({
        success: false,
        message: "Por motivos de segurança, apenas consultas de leitura (SELECT, SHOW, DESCRIBE) são permitidas.",
      });
    }

    const pool = getDbPool({ host, user, password, port, database });
    const [rows]: [any[], any] = await pool.execute(sql);

    res.json({
      success: true,
      rows,
      count: Array.isArray(rows) ? rows.length : 0,
    });
  } catch (error: any) {
    console.error("Erro na execução da consulta no RDS:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao executar consulta no AWS RDS.",
    });
  }
});

// Configuração do Servidor Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();