import { IMessageModel } from '../../types/ai'
import { BaseModel } from './provider/struct'
import { OpenaiModel } from './provider/openai'
import { GeminiModel } from './provider/gemini'
import { CompletionOptions, ModelConfig, StreamOptions } from './type'
import { OpenRouterModel } from './provider/openRouter'
const openAiMode = new Set(['openai', 'qwen', 'deepseek'])
export class AiClient implements BaseModel {
  client!: BaseModel
  config: ModelConfig
  constructor(config: typeof this.config) {
    this.config = config
    if (openAiMode.has(config.mode)) {
      this.client = new OpenaiModel(config)
    } else if (config.mode === 'gemini') {
      this.client = new GeminiModel(config)
    } else if (config.mode === 'openrouter') {
      this.client = new OpenRouterModel(config)
    }
  }
  async completion<T = any>(messages: IMessageModel[], opts?: CompletionOptions): Promise<[string, T]> {
    return this.client.completion<T>(messages, opts)
  }
  async completionStream(messages: IMessageModel[], opts: StreamOptions) {
    return this.client.completionStream(messages, opts)
  }
  getSummaryMessage(messages: IMessageModel[]) {
    return [
      {
        content:
          `You are a conversational assistant and you need to summarize the user's conversation into a title of 10 words or less., The summary needs to maintain the original language.`,
        role: 'system'
      },
      {
        content: `${messages.map((message) => `${message.role}: ${message.content}`).join('\n')}\n Please summarize the above conversation into a title of 10 words or less, without punctuation.`,
        role: 'user'
      }
    ] as IMessageModel[]
  }

  getHistoryCompressMessage(messages: IMessageModel[], summary?: string) {
    return [
      {
        content: `Please compress the conversation history given by the user into a concise summary. This summary will be used in the context of subsequent conversations..
Requirements:
1. Keep key information and important conclusions
2. Maintain the coherence and context of the conversation
3. Identify and merge repeated or similar content
4. Summarize the main discussion content in concise language
5. Pay special attention to retaining information that may be important for subsequent conversations
6. If there is compressed content, you can choose to retain a small amount of key information from the compressed content

Please generate a summary in the following format:
1. Main topic: [List 1-3 core topics]
2. Key conclusions or decisions: [List important conclusions]
3. Important context: [List the contextual information necessary for subsequent conversations]
4. Conversation progress: [Briefly summarize the development of the conversation]
5. The result needs to maintain the language used in the conversation
The conversation history is stored in <chat_history> in the form of xml, and the summary should not exceed 500 tokens. `,
        role: 'system'
      },
      {
        content: `${summary ? 'Compressed summary: ' + summary : ''} \n Conversation history: \n <chat_history>${messages.map((m) => `<${m.role}>${m.content}</${m.role}>`).join('\n')}</chat_history>`,
        role: 'assistant'
      }
    ] as IMessageModel[]
  }
}
