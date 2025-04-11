import { ChatMessage } from '@lobehub/ui'

export type MessageRole = 'user' | 'assistant' | 'system'
export type AiMode =
  | 'qwen'
  | 'deepseek'
  | 'openai'
  | 'anthropic'
  | 'lmstudio'
  | 'ollama'
  | 'custom'
  | 'mowen'
  | 'gemini'

export type IMessageProps = ChatMessage & {
  editableContent: ReactNode
  reasoning?: string
  duration?: number
}
export interface IMessageModel {
  role: MessageRole
  content: string
  summary?: string
}

export interface IMessage extends IMessageModel {
  id: string
  created: number
  chatId: string
  tokens: number
  updated: number
  reasoning?: string
  duration?: number
  pending?: boolean
  // 提前终止
  terminated?: boolean
  model?: string
  error?: { code: string; message: string }
  files?: IMessageFile[]
  images?: IMessageFile[]
}

export interface IChat {
  id: string
  topic?: string
  created: number
  pending?: boolean
  updated: number
  messages?: IMessage[]
  promptId?: string
  websearch?: boolean
  model?: string // 对话正在使用的模型
  clientId?: string // 对话正在使用的模型配置id
  model?: string
  clientId?: string
  summaryIndex?: number
  summary?: string
}

export interface IClient {
  id: string
  name: string
  mode: AiMode
  baseUrl?: string
  sort: number
  apiKey?: string
  models: string[]
  //
  options?: Record<string, any>
}

export interface IPrompt {
  id: string
  name: string
  content: string
  sort: number
}

export interface ISetting {
  key: string
  value: any
}

export interface IMessageFile {
  id: string
  name: string
  size: number
  url?: string
  content?: string
  path?: string
  status?: 'pending' | 'success' | 'error'
}

export type IChatTable = Pick<
  IChat,
  | 'id'
  | 'topic'
  | 'created'
  | 'updated'
  | 'promptId'
  | 'websearch'
  | 'model'
  | 'clientId'
  | 'summaryIndex'
  | 'summary'
>
