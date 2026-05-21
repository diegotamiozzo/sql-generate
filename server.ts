import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Gerenciador de pools de conexão para evitar sobrecarregar o MySQL
let poolCache: mysql.Pool | null = null;
let currentPoolConfigKey = "";

// Helper para gerar/recuperar um Pool de Conexões de forma segura
function getDbPool(config: any) {
  // Trata strings vazias ou espaços vindos do front-end
  let host = config.host?.trim() || process.env.DB_HOST || "127.0.0.1";
  if (host === "localhost") host = "127.0.0.1"; // Evita problemas de resolução IPv6 (::1)

  const user = config.user?.trim() || process.env.DB_USER || undefined;
  const password =
    config.password?.trim() || process.env.DB_PASSWORD || undefined;
  const port =
    parseInt(config.port) ||
    (process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306);
  const database =
    config.database?.trim() || process.env.DB_DATABASE || undefined;

  // Cria uma chave única para identificar se a configuração de conexão mudou na tela
  const configKey = `${host}:${port}:${user}:${database}`;

  if (poolCache && currentPoolConfigKey === configKey) {
    return poolCache;
  }

  // Se a configuração mudou ou o pool não existe, fecha o antigo e cria um novo
  if (poolCache) {
    poolCache.end().catch(() => {});
  }

  poolCache = mysql.createPool({
    host,
    user,
    password,
    port,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000,
  });

  currentPoolConfigKey = configKey;
  return poolCache;
}

// 1. API: Connect and Get Databases
app.post("/api/db/connect", async (req, res) => {
  try {
    const { host, user, password, port } = req.body;

    // Se o front enviar dados nulos/vazios e não houver fallback no .env, barramos aqui de forma limpa
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
      serverInfo: `MariaDB/MySQL @ ${host || "127.0.0.1"}`,
    });
  } catch (error: any) {
    console.error("Erro de conexão detectado:", error.message);
    res.status(500).json({
      success: false,
      message:
        "Falha ao conectar ao banco de dados. Verifique suas credenciais e se o serviço está ativo.",
    });
  }
});

// 2. API: Get Tables of Selected Database
app.post("/api/db/tables", async (req, res) => {
  try {
    const { host, user, password, port, database } = req.body;
    if (!database?.trim()) {
      return res
        .status(200)
        .json({
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
    console.error("Erro ao buscar tabelas:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Erro ao listar as tabelas do banco." });
  }
});

// 3. API: Get Schema Columns and Sample Rows (Com proteção contra SQL Injection)
app.post("/api/db/schema", async (req, res) => {
  try {
    const { host, user, password, port, database, table } = req.body;
    if (!database?.trim() || !table?.trim()) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Banco de dados e tabela são obrigatórios.",
        });
    }

    // Validação estrita do nome da tabela (permite apenas letras, números e underscores)
    // Isso mitiga completamente falhas de injeção de SQL por strings maliciosas passadas na URL/Body
    const safeTableRegex = /^[a-zA-Z0-9_]+$/;
    if (!safeTableRegex.test(table)) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Nome de tabela inválido detectado por motivos de segurança.",
        });
    }

    const pool = getDbPool({ host, user, password, port, database });

    // DESCRIBE Table de forma segura usando o nome validado pelo regex
    const [columnsRows]: [any[], any] = await pool.execute(
      `DESCRIBE \`${table}\`;`,
    );
    const columns = columnsRows.map((col: any) => ({
      field: col.Field,
      type: col.Type,
      null: col.Null,
      key: col.Key,
      default: col.Default,
      extra: col.Extra,
    }));

    // Coleta as primeiras 5 linhas para a amostragem de dados
    const [previewRows]: [any[], any] = await pool.execute(
      `SELECT * FROM \`${table}\` LIMIT 5;`,
    );

    res.json({ success: true, columns, preview: previewRows });
  } catch (error: any) {
    console.error("Erro ao obter metadados da tabela:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "Erro ao obter estrutura e dados da tabela.",
      });
  }
});

// 4. API: Generate SQL prompt using Gemini
app.post("/api/db/generate-sql", async (req, res) => {
  try {
    const { database, table, columns, preview, prompt } = req.body;

    if (!prompt) {
      return res
        .status(400)
        .json({ success: false, message: "Pergunta/prompt é obrigatório." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message:
          "Chave do Gemini (GEMINI_API_KEY) não configurada no ambiente do servidor (.env).",
      });
    }

    const geminiAi = new GoogleGenAI({ apiKey });

    const columnsContext =
      columns && Array.isArray(columns)
        ? columns
            .map(
              (c: any) =>
                `${c.field} (${c.type}${c.key ? `, Chave: ${c.key}` : ""})`,
            )
            .join(", ")
        : "Estrutura não informada";

    const previewContext = preview
      ? JSON.stringify(preview, null, 2)
      : "Sem dados de prévia";

    const promptText = `
Você é um desenvolvedor e administrador de banco de dados especialista em MariaDB e MySQL SQL.
Com base no banco de dados "${database}" e na tabela "${table}", com as seguintes colunas existentes:
[${columnsContext}]

Aqui estão alguns registros de exemplo (primeiras linhas) para referência da estrutura dos dados:
${previewContext}

Pergunta do Usuário: "${prompt}"

Por favor, gere uma consulta SQL válida para responder à pergunta do usuário sobre essa tabela.
Importante:
1. Retorne APENAS um comando SQL válido que possa ser executado no MySQL/MariaDB.
2. Certifique-se de usar o nome correto das colunas que constam na lista de colunas fornecida.
3. Explique passo a passo o comando em português simples.
4. Dê opiniões úteis ou sugestões de otimização/relacionadas na lista de sugestões.
`;

    const response = await geminiAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sql: {
              type: Type.STRING,
              description:
                "A consulta SQL válida, pronta para ser executada no MariaDB/MySQL. Sem formatação em markdown, limpa.",
            },
            explanation: {
              type: Type.STRING,
              description:
                "Explicação detalhada e didática do comando, escrita em português brasileiro.",
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Lista de 1 a 3 sugestões, variações ou avisos úteis sobre a consulta, em português.",
            },
          },
          required: ["sql", "explanation", "suggestions"],
        },
      },
    });

    let resultText = response.text || "{}";
    const cleanedText = resultText
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/, "")
      .trim();
    let resultJson;

    try {
      resultJson = JSON.parse(cleanedText);
    } catch (parseError) {
      console.warn("Could not parse JSON cleanly, using fallback parameters.");
      // Substituímos as crases problemáticas por aspas simples na string de segurança
      const fallbackSql = "SELECT * FROM " + table + " LIMIT 10;";

      const sqlMatch = cleanedText.match(/"sql"\s*:\s*"([^"]+)"/);
      const explanationMatch = cleanedText.match(
        /"explanation"\s*:\s*"([^"]+)"/,
      );

      resultJson = {
        sql: sqlMatch
          ? sqlMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
          : fallbackSql,
        explanation: explanationMatch
          ? explanationMatch[1].replace(/\\n/g, "\n")
          : "Comando SQL gerado automaticamente.",
        suggestions: [
          "Verifique os nomes de colunas e índices para performance.",
        ],
      };
    }

    res.json({
      success: true,
      sql: resultJson.sql,
      explanation: resultJson.explanation,
      suggestions: resultJson.suggestions || [],
    });
  } catch (error: any) {
    console.error("Gemini Generation error:", error);
    const statusCode =
      error.status || (error.code ? parseInt(error.code) : 500);
    const errorMessageString = error.message || "";

    if (
      statusCode === 429 ||
      errorMessageString.includes("429") ||
      errorMessageString.includes("Quota exceeded")
    ) {
      return res.status(200).json({
        success: false,
        message:
          "A cota diária de requisições gratuitas do Gemini foi atingida para este projeto (Limite: 20 requisições/dia).",
      });
    }

    if (
      statusCode === 503 ||
      errorMessageString.includes("503") ||
      errorMessageString.includes("temporary") ||
      statusCode === "UNAVAILABLE"
    ) {
      return res.status(200).json({
        success: false,
        message:
          "Os servidores do Google Gemini estão experimentando uma sobrecarga temporária. Por favor, clique novamente em alguns segundos.",
      });
    }

    res
      .status(500)
      .json({
        success: false,
        message: "Falha ao gerar comando SQL via IA do Gemini.",
      });
  }
});

// 5. API: Execute generated query (Apenas comandos de leitura)
app.post("/api/db/execute-query", async (req, res) => {
  try {
    const { host, user, password, port, database, sql } = req.body;
    if (!database?.trim() || !sql?.trim()) {
      return res
        .status(400)
        .json({
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
        message:
          "Por motivos de segurança, apenas consultas de leitura (SELECT, SHOW, DESCRIBE) são permitidas no console.",
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
    console.error("Erro na execução da consulta:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message:
          error.message || "Erro ao executar consulta no banco de dados.",
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
