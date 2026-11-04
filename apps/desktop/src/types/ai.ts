export type AiProvider = 'OpenAI' | 'DeepSeek' | '通义千问' | 'Ollama 本地' | '自定义';

export interface AiConfig {
  enabled: boolean;
  provider: AiProvider;
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  embeddingModel: string;
  excludePrivate: boolean;
  desensitize: boolean;
}

export interface Citation {
  index: number;
  notePath: string;
  noteTitle: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: number;
  costInfo?: string;
}

export const AI_PRESETS: Record<
  AiProvider,
  { baseUrl: string; chatModel: string; embeddingModel: string; placeholderKey: string }
> = {
  OpenAI: {
    baseUrl: 'https://api.openai.com/v1',
    chatModel: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
    placeholderKey: 'sk-... (保存在本地/钥匙串)',
  },
  DeepSeek: {
    baseUrl: 'https://api.deepseek.com/v1',
    chatModel: 'deepseek-chat',
    embeddingModel: 'bge-m3',
    placeholderKey: 'sk-... (保存在本地/钥匙串)',
  },
  '通义千问': {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    chatModel: 'qwen-plus',
    embeddingModel: 'text-embedding-v3',
    placeholderKey: 'sk-... (保存在本地/钥匙串)',
  },
  'Ollama 本地': {
    baseUrl: 'http://127.0.0.1:11434/v1',
    chatModel: 'qwen2.5:7b',
    embeddingModel: 'bge-m3',
    placeholderKey: '无需 API Key (完全本地运行)',
  },
  '自定义': {
    baseUrl: 'https://your-api-endpoint/v1',
    chatModel: '',
    embeddingModel: '',
    placeholderKey: 'API Key (若有)',
  },
};

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: true,
  provider: 'DeepSeek',
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  chatModel: 'deepseek-chat',
  embeddingModel: 'bge-m3',
  excludePrivate: true,
  desensitize: true,
};
