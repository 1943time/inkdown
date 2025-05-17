import { BaseModel } from './struct'
import Anthropic from '@anthropic-ai/sdk'
import { CompletionOptions, ModelConfig, StreamOptions } from '../type'
import { TextBlock } from '@anthropic-ai/sdk/resources/index.mjs'
import { IMessageModel } from 'types/model'
import { ContentBlockParam, MessageParam } from '@anthropic-ai/sdk/resources/messages'

interface ClaudeMessage {
  content: Array<{
    type: string
    text: string
  }>
}

export class ClaudeModel implements BaseModel {
  config: ModelConfig
  private anthropic!: Anthropic

  constructor(config: typeof this.config) {
    this.config = config
    this.anthropic = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      dangerouslyAllowBrowser: true
    })
  }

  async completion<T = ClaudeMessage>(
    messages: IMessageModel[],
    opts?: CompletionOptions
  ): Promise<[string, T]> {
    const completion = await this.anthropic.messages.create(
      {
        model: this.config.model,
        max_tokens: 4096,
        messages: messages.map((m) => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: m.content || ''
        })),
        stream: false,
        top_p: opts?.modelOptions?.top_p,
        temperature: opts?.modelOptions?.temperature
      },
      { signal: opts?.signal }
    )
    return [(completion.content?.[0] as TextBlock)?.text || '', completion as T]
  }

  async completionStream(messages: IMessageModel[], opts: StreamOptions) {
    try {
      const messageData: MessageParam[] = []
      for (const m of messages) {
        const part: MessageParam = {
          role: m.role === 'system' ? 'user' : m.role,
          content: m.images?.length ? [{ type: 'text', text: m.content || '' }] : m.content || ''
        }
        if (m.images?.length) {
          for (const image of m.images) {
            const base64 = window.api.fs.readFileSync(image.content!, { encoding: 'base64' })
            const mimeType = window.api.fs.lookup(image.content!) || 'image/png'
            ;(part.content as ContentBlockParam[]).unshift({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/png',
                data: base64
              }
            })
          }
        }
        messageData.push(part)
      }
      const completion = await this.anthropic.messages.create(
        {
          model: this.config.model,
          max_tokens: opts.max_tokens || 4096,
          temperature: opts.modelOptions?.temperature,
          top_p: opts.modelOptions?.top_p,
          messages: messageData,
          stream: true
        },
        {
          signal: opts.signal
        }
      )
      let fullContent = ''

      for await (const chunk of completion) {
        if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
          const content = chunk.delta.text
          if (content) {
            fullContent = fullContent + content
            opts.onChunk?.(fullContent, content)
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
