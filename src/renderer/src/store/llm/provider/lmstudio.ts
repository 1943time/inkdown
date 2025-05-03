import { IMessageModel } from '@/types/ai'
import { BaseModel } from './struct'
import { CompletionOptions, ModelConfig, StreamOptions } from '../type'

interface LMStudioResponse {
  model: string;
  created: number;
  object: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LMStudioModel implements BaseModel {
  config: ModelConfig
  private baseUrl: string

  constructor(config: typeof this.config) {
    this.config = config
    this.baseUrl = this.config.baseUrl || 'http://localhost:1234/v1'
  }

  async completion<T = LMStudioResponse>(messages: IMessageModel[], opts?: CompletionOptions): Promise<[string, T]> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
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
      signal: opts?.signal
    })

    if (!response.ok) {
      throw new Error(`LMStudio API error: ${response.statusText}`)
    }

    const completion = await response.json()
    return [completion.choices[0].message.content, completion as T]
  }

  async completionStream(messages: IMessageModel[], opts: StreamOptions) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
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
        signal: opts.signal
      })

      if (!response.ok) {
        throw new Error(`LMStudio API error: ${response.statusText}`)
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
        const lines = chunk.split('\n').filter(line => line.trim() && line !== 'data: [DONE]')

        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace('data: ', ''))
            if (data.choices?.[0]?.delta?.content) {
              const content = data.choices[0].delta.content
              fullContent = fullContent + content
              opts.onChunk?.(fullContent, content)
            }
          } catch (e) {
            console.error('Error parsing chunk:', e)
          }
        }
      }

      opts.onFinish?.(fullContent)
    } catch (e: any) {
      if (e.error instanceof Object) {
        opts.onError?.(e.error.code || 'Connection Error', e.error.message || e.message, e)
      } else {
        opts.onError?.('Connection Error', e.message, e)
      }
    }
  }
} 