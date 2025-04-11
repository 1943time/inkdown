import { IMessageModel } from '@/types/ai'
import { BaseModel } from './struct'
import { CompletionOptions, ModelConfig, StreamOptions } from '../type'

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface OllamaConfig extends ModelConfig {
  port?: number;
  host?: string;
}

export class OllamaModel implements BaseModel {
  config: OllamaConfig
  private baseUrl: string

  constructor(config: OllamaConfig) {
    this.config = config
    const host = this.config.host || 'localhost'
    const port = this.config.port || 11434
    this.baseUrl = this.config.baseUrl || `http://${host}:${port}`
  }

  private async fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}) {
    const { timeout = 30000, ...fetchOptions } = options
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      })
      clearTimeout(id)
      return response
    } catch (error) {
      clearTimeout(id)
      throw error
    }
  }

  async completion<T = OllamaResponse>(messages: IMessageModel[], opts?: CompletionOptions): Promise<[string, T]> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map((m) => ({
            role: m.role === 'system' ? 'user' : m.role,
            content: m.content || ''
          })),
          stream: false
        }),
        timeout: opts?.timeout,
        signal: opts?.signal
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`Ollama API error: ${response.statusText}${error.error ? ` - ${error.error}` : ''}`)
      }

      const completion = await response.json()
      return [completion.message.content, completion as T]
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw error
    }
  }

  async completionStream(messages: IMessageModel[], opts: StreamOptions) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map((m) => ({
            role: m.role === 'system' ? 'user' : m.role,
            content: m.content || ''
          })),
          stream: true
        }),
        timeout: 10000,
        signal: opts.signal
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`Ollama API error: ${response.statusText}${error.error ? ` - ${error.error}` : ''}`)
      }

      let fullContent = ''
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.message?.content) {
              fullContent = fullContent + data.message.content
              opts.onChunk?.(fullContent, data.message.content)
            }
            if (data.error) {
              throw new Error(data.error)
            }
          } catch (e) {
            console.error('Error parsing chunk:', e)
            if (e instanceof Error) {
              opts.onError?.('Parse Error', e.message, e)
            }
          }
        }
      }

      opts.onFinish?.(fullContent)
    } catch (e: any) {
      if (e.name === 'AbortError') {
        opts.onError?.('Timeout Error', 'Request timeout', e)
      } else if (e.error instanceof Object) {
        opts.onError?.(e.error.code || 'Connection Error', e.error.message || e.message, e)
      } else {
        opts.onError?.('Connection Error', e.message, e)
      }
    }
  }
}