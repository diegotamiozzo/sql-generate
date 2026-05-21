export interface DbConfig {
  host: string;
  user: string;
  password: string;
  port: string;
}

export interface ColumnInfo {
  field: string;
  type: string;
  key: string;
}

export interface PresetPrompt {
  label: string;
  prompt: string;
}
