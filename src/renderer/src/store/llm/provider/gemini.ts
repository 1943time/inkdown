import { IMessageModel } from '@/types/ai'
import { BaseModel } from './struct'
import { GoogleGenAI, GenerateContentResponse, CreateChatParameters } from '@google/genai'
import { CompletionOptions, ModelConfig, StreamOptions } from '../type'

export class GeminiModel implements BaseModel {
  config: ModelConfig
  private gemini!: GoogleGenAI
  constructor(config: typeof this.config) {
    this.config = config
    this.gemini = new GoogleGenAI({
      apiKey: config.apiKey,
      httpOptions: {
        baseUrl: config.baseUrl
      }
    })
  }
  async completion<T = GenerateContentResponse>(
    messages: IMessageModel[],
    opts?: CompletionOptions
  ): Promise<[string, T]> {
    const res = await this.gemini.models.generateContent({
      model: this.config.model,
      config: {
        presencePenalty: opts?.modelOptions?.presence_penalty,
        frequencyPenalty: opts?.modelOptions?.frequency_penalty,
        topP: opts?.modelOptions?.top_p,
        temperature: opts?.modelOptions?.temperature
      },
      contents: messages.map((m) => {
        return { role: m.role === 'system' ? 'user' : m.role, content: m.content }
      })
    })
    return [res.text || '', res as T]
  }
  async completionStream(messages: IMessageModel[], opts: StreamOptions) {
    try {
      if (messages[0].role === 'system') {
        const first = messages.shift()
        messages[0].content = `${first?.content}\n\n${messages[0].content}`
      }
      // const image = await this.gemini.files.upload({
      //   file: "/path/to/organ.png",
      // });
      // const msg = createUserContent([
      //   "Tell me about this instrument",
      //   createPartFromUri(image.uri!, image.mimeType!),
      // ])
      const data: CreateChatParameters = {
        model: this.config.model,
        config: {
          presencePenalty: opts.modelOptions?.presence_penalty,
          frequencyPenalty: opts.modelOptions?.frequency_penalty,
          topP: opts.modelOptions?.top_p,
          temperature: opts.modelOptions?.temperature
        },
        history: messages.slice(0, -1).map((m) => {
          return {
            role: m.role === 'system' ? 'user' : m.role === 'assistant' ? 'model' : m.role,
            parts: [{ text: m.content }]
          }
        })
      }
      if (opts.enable_search) {
        data.config = {
          tools: [{ googleSearch: {} }]
        }
      }
      const chat = this.gemini.chats.create(data)
      const stream = await chat.sendMessageStream({
        message: messages[messages.length - 1].content
      })
      let text = ''
      for await (const chunk of stream) {
        const chunkText = chunk.text || ''
        text += chunkText
        opts.onChunk?.(text, chunkText)
      }
      opts.onFinish?.(text)
    } catch (e: any) {
      const errorMessage =
        e.response?.data?.error?.message || e.error?.message || e.message || 'Connection Error'
      opts.onError?.('Connection Error', errorMessage, e)
    }
  }
}
