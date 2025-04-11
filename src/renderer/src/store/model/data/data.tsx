export const modelTokens = new Map([['qwen-max', 32 * 1000]])

export const openAiModels = new Map([
  ['qwen', 'https://dashscope.aliyuncs.com/compatible-mode/v1'],
  ['deepseek', 'https://api.deepseek.com'],
  ['openai', undefined]
])

export const AiModeLabel = new Map([
  ['openai', 'OpenAi'],
  ['deepseek', 'DeepSeek'],
  ['qwen', 'Qwen'],
  ['claude', 'Claude'],
  ['ollama', 'Ollama'],
  ['lmstudio', 'LM Studio'],
  ['gemini', 'Gemini'],
  ['openrouter', 'OpenRouter']
])

// open ai系列
export const webSearchOptions = [
  { models: ['gpt-4o-search-preview', 'gpt-4o-mini-search-preview'], options: { web_search_options: {} } },
  { models: ['qwen-max', 'qwq-plus'], options: { enable_search: true } }
]
