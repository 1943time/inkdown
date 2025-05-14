import { IMessageModel } from '@/types/ai'
import { BaseModel } from './struct'
import OpenAI from 'openai'
import { CompletionOptions, ModelConfig, StreamOptions } from '../type'
import { webSearchOptions } from '../data/data'

export class OpenaiModel implements BaseModel {
  config: ModelConfig
  private openai!: OpenAI
  constructor(config: typeof this.config) {
    this.config = config
    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      dangerouslyAllowBrowser: true
    })
  }
  async completion<T = OpenAI.ChatCompletion>(
    messages: IMessageModel[],
    opts?: CompletionOptions
  ): Promise<[string, T]> {
    // @ts-ignore
    const completion = await this.openai.chat.completions.create(
      {
        model: this.config.model,
        messages: messages.map((m) => {
          return { role: m.role, content: m.content || '' }
        }),
        enable_search: opts?.enable_search,
        frequency_penalty: opts?.modelOptions?.frequency_penalty,
        presence_penalty: opts?.modelOptions?.presence_penalty,
        top_p: opts?.modelOptions?.top_p,
        temperature: opts?.modelOptions?.temperature,
        stream: false
      },
      { signal: opts?.signal }
    )
    return [completion.choices[0]?.message?.content || '', completion as T]
  }
  async completionStream(messages: IMessageModel[], opts: StreamOptions) {
    try {
      let options: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
        model: this.config.model,
        messages: messages.map((m) => {
          return { role: m.role, content: m.content }
        }),
        stream: true,
        frequency_penalty: opts.modelOptions?.frequency_penalty,
        presence_penalty: opts.modelOptions?.presence_penalty,
        top_p: opts.modelOptions?.top_p,
        temperature: opts.modelOptions?.temperature
      }
      if (opts.enable_search) {
        const searchOptions = webSearchOptions.find((o) => o.models.includes(this.config.model))
        if (searchOptions) {
          options = {
            ...options,
            ...searchOptions.options
          }
        }
      }
      // @ts-ignore
      const completion = await this.openai.chat.completions.create(options, {
        signal: opts.signal
      })

      let fullContent = ''
      let fullReasoning = ''
      // console.log('流式输出内容为：')
      for await (const chunk of completion) {
        // 如果stream_options.include_usage为true，则最后一个chunk的choices字段为空数组，需要跳过（可以通过chunk.usage获取 Token 使用量）
        if (Array.isArray(chunk.choices) && chunk.choices.length > 0) {
          const delta = chunk.choices[0].delta
          // console.log('chunk', chunk, delta);
          if (delta.content) {
            fullContent = fullContent + delta.content
            opts.onChunk?.(fullContent, delta.content)
          }
          // @ts-ignore
          if (delta.reasoning_content || delta.reasoning) {
            // @ts-ignore
            fullReasoning = fullReasoning + (delta.reasoning_content || delta.reasoning)
            opts.onReasoning?.(fullReasoning)
          }
          // console.log(chunk.choices[0].delta.content)
        }
      }
      opts.onFinish?.(fullContent)
    } catch (e: any) {
      if (e.error instanceof Object) {
        opts.onError?.(e.error.code, e.error.message || e.message, e)
      } else {
        opts.onError?.('Connection Error', e.message, e)
      }
    }
  }
}
