import { IMessageModel } from '@/types/ai'
import { BaseModel } from './struct'
import { CompletionOptions, ModelConfig, StreamOptions } from '../type'

export class OpenRouterModel implements BaseModel {
  config: ModelConfig
  private baseURL = 'https://openrouter.ai/api/v1'
  private headers: HeadersInit

  constructor(config: typeof this.config) {
    this.config = config
    this.headers = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'X-Title': 'Mowen',
      'Content-Type': 'application/json'
    }
  }

  async completion<T = any>(
    messages: IMessageModel[],
    opts?: CompletionOptions
  ): Promise<[string, T]> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content || ''
        })),
        stream: false,
        ...this.config.options,
        max_tokens: opts?.max_tokens,
        frequency_penalty: opts?.modelOptions?.frequency_penalty,
        presence_penalty: opts?.modelOptions?.presence_penalty,
        top_p: opts?.modelOptions?.top_p,
        temperature: opts?.modelOptions?.temperature
      }),
      signal: opts?.signal
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Request failed')
    }

    const completion = await response.json()
    return [completion.choices[0]?.message?.content || '', completion as T]
  }

  async completionStream(messages: IMessageModel[], opts: StreamOptions) {
    try {
      let options: any = {
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content
        })),
        stream: true,
        frequency_penalty: opts.modelOptions?.frequency_penalty,
        presence_penalty: opts.modelOptions?.presence_penalty,
        top_p: opts.modelOptions?.top_p,
        temperature: opts.modelOptions?.temperature,
        max_tokens: opts.max_tokens,
        ...this.config.options
      }

      if (opts.enable_search) {
        options = {
          ...options,
          plugins: [{ id: 'web' }]
        }
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(options),
        signal: opts.signal
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Request failed')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let fullReasoning = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((line) => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              opts.onFinish?.(fullContent)
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.error) {
                throw new Error(parsed.error.message)
              }
              if (parsed.choices?.[0]?.delta) {
                const delta = parsed.choices[0].delta
                if (delta.content) {
                  fullContent += delta.content
                  opts.onChunk?.(fullContent, delta.content)
                }
                if (delta.reasoning_content || delta.reasoning) {
                  fullReasoning += delta.reasoning_content || delta.reasoning
                  opts.onReasoning?.(fullReasoning)
                }
              }
            } catch (e) {
              console.error('Error parsing chunk:', data, e)
            }
          }
        }
      }
    } catch (e: any) {
      console.error('Open Router Error', e)
      if (e.error instanceof Object) {
        opts.onError?.(e.error.code, e.error.message || e.message, e)
      } else {
        opts.onError?.('Connection Error', e.message, e)
      }
    }
  }
}
