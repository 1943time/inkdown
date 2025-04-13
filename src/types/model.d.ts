import { Range as SlateRange } from 'slate'
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
  // 提前终止
  terminated?: boolean
  model?: string
  error?: { code: string; message: string }
  files?: IMessageFile[]
  images?: IMessageFile[]
  docs?: IMessageDoc[]
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

export interface IMessageDoc {
  id: string
  content: string
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

export interface ISpace {
  id: string
  name: string
  created: number
  lastOpenTime: number
  sort: number
  writeFolderPath?: string
  background?: string
  opt?: Record<string, any>
}

export interface IDoc {
  id: string
  name: string
  spaceId: string
  parentId?: string
  folder: boolean
  schema?: any[]
  updated: number
  deleted?: boolean
  created: number
  sort: number
  links?: string[]
  children?: string[]
}

export interface IHistory {
  id: string
  docId: string
  schema: any[]
  spaceId: string
  updated: number
  depFiles?: string[]
}
export interface IFile {
  name: string
  created: number
  size: number
  spaceId: string
}

export interface ITag {
  id: string
  name: string
  created: number
}

export interface IDocTag {
  id: string
  docId: string
  tagId: string
}
