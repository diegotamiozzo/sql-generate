# Explorador e Gerador SQL Inteligente

Uma interface web inteligente projetada para engenharia reversa ad-hoc, exploração de esquemas e geração automatizada de consultas SQL seguras. O ecossistema combina um front-end em **React (Vite + Tailwind CSS)** com um servidor de retaguarda **Express (TypeScript)** integrado à **API oficial do Google Gemini** e conectores nativos para **MySQL / MariaDB**.

---

## Arquitetura e Fluxo de Operação

O projeto opera em uma abordagem de segurança híbrida e isolamento de escopo:
* **Client (SPA):** Estruturado em `src/` utilizando React e componentes iconográficos Lucide. Gerencia estados locais de conexões ad-hoc.
* **Server (Middleware Híbrido):** O arquivo `server.ts` atua como servidor de API Express e, em ambiente de desenvolvimento, injeta dinamicamente as regras de compilação do Vite em tempo de execução (*Middleware Mode*).
* **Camada de Inteligência Artificial:** Consome o SDK moderno `@google/genai` processando estruturas relacionais dinâmicas convertidas em prompts estruturados de alta fidelidade com saídas validadas em `JSON Schema`.

---

##  Pré-requisitos

Antes de iniciar, certifique-se de possuir instalado em seu ambiente de desenvolvimento:
* **Node.js** (Versão `>= 18` recomendada)
* **Gerenciador de Pacotes** (`npm` já incluso no Node)
* **Credenciais de IA:** Uma chave válida da API do Gemini (`GEMINI_API_KEY`) obtida via Google AI Studio.

---

##  Instalação e Configuração Ambiente

1. Clone ou extraia o projeto no diretório local e instale a árvore completa de dependências do ecossistema:
   ```bash
   npm install