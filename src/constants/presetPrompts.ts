import type { PresetPrompt } from "../types";

export const PRESET_PROMPTS: PresetPrompt[] = [
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

    {
    label: " Maior/Menor valor",
    prompt:
      "Como encontrar o registro que possui o maior valor e o que possui o menor valor em uma coluna numérica?",
  },
];
