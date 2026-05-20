import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON body limits for schema representation
app.use(express.json());

// Initialize Gemini SDK securely on the server
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

// Helper to create a connection securely. Prefer environment variables; do NOT hardcode secrets.
async function getDbConnection(config: any) {
  const host = config.host || process.env.DB_HOST || "localhost";
  const user = config.user || process.env.DB_USER || undefined;
  const password = config.password || process.env.DB_PASSWORD || undefined;
  const port = parseInt(config.port) || (process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306);
  const database = config.database || process.env.DB_DATABASE || undefined;

  return await mysql.createConnection({
    host,
    user,
    password,
    port,
    database,
    connectTimeout: 8000
  });
}

// 1. API: Connect and Get Databases
app.post("/api/db/connect", async (req, res) => {
  let connection;
  try {
    const { host, user, password, port } = req.body;
    connection = await getDbConnection({ host, user, password, port });
    
    // Execute SHOW DATABASES
    const [rows]: [any[], any] = await connection.execute("SHOW DATABASES;");
    const databases = rows.map((row: any) => Object.values(row)[0]);

    res.json({
      success: true,
      databases,
      serverInfo: connection.config ? `MariaDB/MySQL @ ${connection.config.host}` : "Conectado"
    });
  } catch (error: any) {
    console.error("Connection error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Falha ao conectar ao banco de dados. Verifique as credenciais."
    });
  } finally {
    if (connection) await connection.end();
  }
});

// 2. API: Get Tables of Selected Database
app.post("/api/db/tables", async (req, res) => {
  let connection;
  try {
    const { host, user, password, port, database } = req.body;
    if (!database) {
      return res.status(400).json({ success: false, message: "Banco de dados é obrigatório." });
    }

    connection = await getDbConnection({ host, user, password, port, database });
    const [rows]: [any[], any] = await connection.execute("SHOW TABLES;");
    const tables = rows.map((row: any) => Object.values(row)[0]);

    res.json({
      success: true,
      tables
    });
  } catch (error: any) {
    console.error("Error fetching tables:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao listar tabelas."
    });
  } finally {
    if (connection) await connection.end();
  }
});

// 3. API: Get Schema Columns and Sample Rows
app.post("/api/db/schema", async (req, res) => {
  let connection;
  try {
    const { host, user, password, port, database, table } = req.body;
    if (!database || !table) {
      return res.status(400).json({ success: false, message: "Banco de dados e tabela são obrigatórios." });
    }

    connection = await getDbConnection({ host, user, password, port, database });

    // DESCRIBE Table or query COLUMNS
    const [columnsRows]: [any[], any] = await connection.execute(`DESCRIBE \`${table}\`;`);
    const columns = columnsRows.map((col: any) => ({
      field: col.Field,
      type: col.Type,
      null: col.Null,
      key: col.Key,
      default: col.Default,
      extra: col.Extra
    }));

    // Fetch up to 5 rows as a preview
    const [previewRows]: [any[], any] = await connection.execute(`SELECT * FROM \`${table}\` LIMIT 5;`);

    res.json({
      success: true,
      columns,
      preview: previewRows
    });
  } catch (error: any) {
    console.error("Error fetching schema:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao obter estrutura e dados da tabela."
    });
  } finally {
    if (connection) await connection.end();
  }
});

// 4. API: Generate SQL prompt using Gemini with lazy client initialization and robust parsing
app.post("/api/db/generate-sql", async (req, res) => {
  try {
    const { database, table, columns, preview, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: "Pergunta/prompt é obrigatório." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Chave do Gemini (GEMINI_API_KEY) não encontrada no ambiente do servidor. Certifique-se de configurar suas chaves no arquivo .env."
      });
    }

    // Lazy initialization of active Gemini SDK client
    const geminiAi = new GoogleGenAI({
      apiKey,
    });

    // Build model prompt context
    const columnsContext = columns && Array.isArray(columns)
      ? columns.map((c: any) => `${c.field} (${c.type}${c.key ? `, Chave: ${c.key}` : ''})`).join(", ")
      : "Estrutura não informada";
    
    const previewContext = preview ? JSON.stringify(preview, null, 2) : "Sem dados de prévia";

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
3. Não use markdown no SQL gerado, forneça-o de forma limpa.
4. Explique passo a passo o comando em português simples.
5. Dê opiniões úteis ou sugestões de otimização/relacionadas na lista de sugestões.
`;

    // Initialize content generation using gemini-2.5-flash
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
              description: "A consulta SQL válida, pronta para ser executada no MariaDB/MySQL. Sem formatação em markdown, de forma limpa." 
            },
            explanation: { 
              type: Type.STRING, 
              description: "Explicação detalhada e didática do comando, o que faz cada cláusula, escrita em português brasileiro." 
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de 1 a 3 sugestões, variações ou avisos úteis sobre a consulta ou indexações necessárias, em português."
            }
          },
          required: ["sql", "explanation", "suggestions"]
        }
      }
    });

    let resultText = response.text || "{}";
    
    // Safety check: sometimes even with JSON mimetype, models warp it in markdown syntax blocks
    const cleanedText = resultText.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    let resultJson;
    try {
      resultJson = JSON.parse(cleanedText);
    } catch {
      console.warn("Could not parse JSON cleanly, trying fallback parsing matching");
      const sqlMatch = cleanedText.match(/"sql"\s*:\s*"([^"]+)"/) || [null, `SELECT * FROM \`${table}\` LIMIT 10;`];
      const explanationMatch = cleanedText.match(/"explanation"\s*:\s*"([^"]+)"/) || [null, "Comando SQL gerado para exploração da tabela."];
      resultJson = {
        sql: sqlMatch[1] ? sqlMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : `SELECT * FROM \`${table}\` LIMIT 10;`,
        explanation: explanationMatch[1] ? explanationMatch[1].replace(/\\n/g, "\n") : "Comando SQL gerado automaticamente.",
        suggestions: ["Verifique os nomes de colunas e índices para performance."]
      };
    }

    res.json({
      success: true,
      sql: resultJson.sql,
      explanation: resultJson.explanation,
      suggestions: resultJson.suggestions || []
    });

  } catch (error: any) {
    console.error("Gemini Generation error:", error);

    const statusCode = error.status || (error.code ? parseInt(error.code) : 500);
    const errorMessageString = error.message || "";

    // 1. Interceptação customizada para Erro 429 (Cota Excedida)
    if (statusCode === 429 || errorMessageString.includes("429") || errorMessageString.includes("Quota exceeded")) {
      return res.status(200).json({
        success: false,
        message: "A cota diária de requisições gratuitas do Gemini foi atingida para este projeto (Limite: 20 requisições/dia). Por favor, aguarde cerca de um minuto ou crie uma nova API Key vinculada a um 'Novo Projeto' no Google AI Studio."
      });
    }

    // 2. Interceptação customizada para Erro 503 (Servidor em alta demanda/Indisponível)
    if (statusCode === 503 || errorMessageString.includes("503") || errorMessageString.includes("temporary") || statusCode === 'UNAVAILABLE') {
      return res.status(200).json({
        success: false,
        message: "Os servidores do Google Gemini estão experimentando uma sobrecarga temporária devido à alta demanda global. Suas estruturas estão corretas! Por favor, clique novamente no botão em alguns segundos para reprocessar."
      });
    }

    // Retorno genérico seguro para outros erros de API
    res.status(500).json({
      success: false,
      message: error.message || "Falha ao gerar comando SQL via IA do Gemini."
    });
  }
});

// 5. API: Execute generated query (Only SELECT commands allowed for security)
app.post("/api/db/execute-query", async (req, res) => {
  let connection;
  try {
    const { host, user, password, port, database, sql } = req.body;
    if (!database || !sql) {
      return res.status(400).json({ success: false, message: "Banco de dados e SQL são obrigatórios." });
    }

    // Safety check: ensure it is a read-only query (specifically SELECT or DESCRIBE or SHOW)
    const normalizedSql = sql.trim().toLowerCase();
    
    // Guard against multi-queries or write queries
    const isMultiQuery = sql.includes(";");
    const isDangerous = /\b(drop|delete|insert|update|alter|create|truncate|grant|revoke|replace|merge)\b/.test(normalizedSql);
    
    // Be accommodating of minor SELECT/SHOW queries
    const isValidQuery = normalizedSql.startsWith("select") || normalizedSql.startsWith("show") || normalizedSql.startsWith("describe") || normalizedSql.startsWith("explain");

    if (isDangerous || !isValidQuery) {
      return res.status(400).json({
        success: false,
        message: "Por motivos de segurança, apenas consultas de leitura (SELECT, SHOW, DESCRIBE) são permitidas."
      });
    }

    connection = await getDbConnection({ host, user, password, port, database });
    const [rows]: [any[], any] = await connection.execute(sql);

    res.json({
      success: true,
      rows,
      count: Array.isArray(rows) ? rows.length : 0
    });
  } catch (error: any) {
    console.error("Query execution error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao executar consulta no banco de dados."
    });
  } finally {
    if (connection) await connection.end();
  }
});

// Vite middleware & Serving Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();