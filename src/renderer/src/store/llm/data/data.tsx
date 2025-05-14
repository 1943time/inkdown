export const modelTokens = new Map([['qwen-max', 32 * 1000]])

export const openAiModels = new Map([
  ['qwen', 'https://dashscope.aliyuncs.com/compatible-mode/v1'],
  ['deepseek', 'https://api.deepseek.com'],
  ['openai', undefined]
])

export const providerOptions = new Map([
  [
    'openai',
    {
      models: [
        'gpt-4.1-nano',
        'o4-mini',
        'o3',
        'gpt-4.1-mini',
        'gpt-4.1',
        'o1-pro',
        'o1',
        'o1-mini',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4'
      ],
      baseUrl: 'https://api.openai.com/v1'
    }
  ],
  [
    'claude',
    {
      models: [
        'claude-3-7-sonnet-20250219',
        'claude-3-7-sonnet-latest',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-latest'
      ],
      baseUrl: 'https://api.anthropic.com'
    }
  ],
  [
    'gemini',
    {
      models: [
        'gemini-2.5-flash-preview-04-17',
        'gemini-2.5-pro-preview-05-06',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
      ],
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
    }
  ],
  [
    'ollama',
    {
      models: [],
      baseUrl: 'http://localhost:11434'
    }
  ],
  [
    'lmstudio',
    {
      models: [],
      baseUrl: 'http://localhost:8000'
    }
  ],
  [
    'openrouter',
    {
      models: [],
      baseUrl: 'https://openrouter.ai/api/v1'
    }
  ],
  [
    'qwen',
    {
      models: [
        'qwen-max',
        'qwen-max-latest',
        'qwen-plus',
        'qwen-plus-latest',
        'qwen-turbo-latest',
        'qwen3-235b-a22b',
        'qwen3-32b'
      ],
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    }
  ],
  [
    'deepseek',
    {
      models: ['deepseek-chat', 'deepseek-reasoner'],
      baseUrl: 'https://api.deepseek.com'
    }
  ]
])

export const AiModeLabel = new Map([
  ['openai', 'OpenAi'],
  ['deepseek', 'DeepSeek'],
  ['gemini', 'Gemini'],
  ['openrouter', 'OpenRouter'],
  ['qwen', 'Qwen'],
  ['claude', 'Claude']
  // ['ollama', 'Ollama'],
  // ['lmstudio', 'LM Studio'],
])

// open ai系列
export const webSearchOptions = [
  {
    models: ['gpt-4o-search-preview', 'gpt-4o-mini-search-preview'],
    options: { web_search_options: {} }
  },
  { models: ['qwen-max', 'qwq-plus'], options: { enable_search: true } }
]
