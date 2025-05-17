import { BaseModel } from './struct'
import { GoogleGenAI, GenerateContentResponse, CreateChatParameters, Content } from '@google/genai'
import { CompletionOptions, ModelConfig, StreamOptions } from '../type'
import { IMessageModel } from 'types/model'

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

  private createMessageData(m: IMessageModel) {
    const part: Content = {
      role: m.role === 'system' ? 'user' : m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }]
    }
    if (m.images?.length) {
      for (const image of m.images) {
        const base64 = window.api.fs.readFileSync(image.content!, { encoding: 'base64' })
        const mimeType = window.api.fs.lookup(image.content!) || 'image/png'
        part.parts!.push({
          inlineData: {
            mimeType,
            data: base64
          }
        })
      }
    }
    return part
  }
  async completionStream(messages: IMessageModel[], opts: StreamOptions) {
    try {
      if (messages[0].role === 'system') {
        const first = messages.shift()
        messages[0].content = `${first?.content}\n\n${messages[0].content}`
      }
      const messageData: CreateChatParameters['history'] = []
      for (const m of messages.slice(0, -1)) {
        messageData.push(this.createMessageData(m))
      }

      const data: CreateChatParameters = {
        model: this.config.model,
        config: {
          presencePenalty: opts.modelOptions?.presence_penalty,
          frequencyPenalty: opts.modelOptions?.frequency_penalty,
          topP: opts.modelOptions?.top_p,
          temperature: opts.modelOptions?.temperature
        },
        history: messageData
      }
      if (opts.enable_search) {
        data.config = {
          tools: [{ googleSearch: {} }]
        }
      }
      const chat = this.gemini.chats.create(data)
      const stream = await chat.sendMessageStream({
        message: this.createMessageData(messages[messages.length - 1]).parts!
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
