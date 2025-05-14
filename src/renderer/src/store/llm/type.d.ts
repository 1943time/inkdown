export type ModelConfig = Pick<IClientConfig, 'apiKey' | 'baseUrl' | 'mode' | 'id' | 'options'> & {
  model: string
}
type ModelOptions = {
  temperature?: number
  top_p?: number
  presence_penalty?: number
  frequency_penalty?: number
}
type BaseCompletionOptions = {
  signal?: AbortSignal
  enable_search?: boolean
  timeout?: number
  max_tokens?: number
  modelOptions?: ModelOptions
}
export type StreamOptions = BaseCompletionOptions & {
  onError?: (code: string, message: string, e?: Error) => void
  onFinish?: (content: string) => void
  onChunk?: (fullText: string, text: string) => void
  onReasoning?: (reasoning: string) => void
  modelOptions?: ModelOptions
}

export type CompletionOptions = BaseCompletionOptions & {}
