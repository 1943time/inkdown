import { Store } from './store'
import { IChat, IMessage, IMessageFile, IMessageModel } from 'types/model'
import { nanoid } from 'nanoid'
import { AiClient } from './model/client'
import { getTokens } from '../utils/ai'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { ClientModel } from './settings'
import { openAiModels } from './model/data/data'
import { escapeBrackets, escapeMhchem, fixMarkdownBold } from '@/ui/markdown/utils'
export class ChatStore {
  private maxTokens = 32000
  // 触发压缩的阈值
  private warningThreshold = 25000
  private minRetainMessages = 8 // 最少保留的消息数
  private recentMessagesCount = 6 // 保留最近的消息数
  private activeClient: AiClient | null = null
  private chatAbort = new Map<string, AbortController>()
  useState = create(
    immer(() => ({
      chats: [] as IChat[],
      activeChat: null as null | IChat,
      webSearch: false
    }))
  )
  generateTopicChat = new Set<string>()
  constructor(private readonly store: Store) {
    this.init()
  }
  init() {
    this.store.model.getChats().then((chats) => {
      this.useState.setState((state) => {
        state.chats = chats
      })
    })
    // 监听窗口关闭事件，停止所有处于pending状态的聊天
    window.addEventListener('beforeunload', () => {
      // 直接从chatAbort映射中获取所有需要中止的控制器
      this.chatAbort.forEach((controller, chatId) => {
        this.stopCompletion(chatId)
      })
      this.chatAbort.clear()
    })
  }

  async createChat(id?: string) {
    let obj: IChat | null = null
    const now = Date.now()
    if (id) {
      const chat = await this.store.model.getChat(id)
      if (chat) {
        obj = {
          id: chat.id,
          created: chat.created,
          updated: chat.updated,
          messages: chat.messages || [],
          clientId: chat.clientId,
          model: chat.model,
          websearch: chat.websearch
        }
      }
    }
    if (!obj) {
      obj = {
        id: nanoid(),
        messages: [],
        created: now,
        updated: now,
        pending: true,
        websearch: this.useState.getState().webSearch
      }
    }
    const model = this.store.settings.getAvailableUseModel(obj?.clientId, obj?.model)
    this.refreshClient(model)
    obj.model = model.model
    obj.clientId = model.id
    this.store.model.updateChat(obj!.id, {
      model: model.model,
      clientId: model.id
    })
    if (!id) {
      await this.store.model.createChat(obj!)
      this.useState.setState((state) => {
        state.chats.unshift(obj!)
      })
    }
    this.useState.setState({ activeChat: obj! })
    return obj!
  }

  setChatModel(id: string, model: string) {
    const { models } = this.store.settings.useState.getState()
    const activeChat = this.useState.getState().activeChat
    const config = models.find((item) => item.id === id)
    if (config) {
      const useModel = config.models.includes(model) ? model : config.models[0]
      this.activeClient = new AiClient({
        model: useModel,
        mode: config.mode,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl || openAiModels.get(config.mode),
        id: id,
        options: config.options
      })
      if (activeChat) {
        this.useState.setState((state) => {
          if (state.activeChat) {
            state.activeChat.model = useModel
            state.activeChat.clientId = id
            this.store.model.updateChat(state.activeChat.id, {
              model: useModel,
              clientId: id
            })
          }
        })
      }
      this.store.settings.setDefaultModel(id, useModel)
    }
  }

  private refreshClient(model: ClientModel) {
    if (
      model.id !== this.activeClient?.config.id ||
      model.model !== this.activeClient?.config.model
    ) {
      this.activeClient = new AiClient({
        model: model.model,
        mode: model.mode,
        apiKey: model.apiKey,
        baseUrl: model.baseUrl || openAiModels.get(model.mode),
        id: model.id,
        options: model.options
      })
    }
  }
  async stopCompletion(id: string) {
    const controller = this.chatAbort.get(id)
    if (controller) {
      controller.abort()
      this.chatAbort.delete(id)
      this.useState.setState((state) => {
        state.activeChat!.pending = false
        state.activeChat!.updated = Date.now()
        const msg = state.activeChat!.messages![state.activeChat!.messages!.length - 1]
        msg.content = msg.content === '...' ? '' : msg.content
        msg.terminated = true
        const tokens = getTokens(msg.content || '')
        localStorage.removeItem(`chunk-${msg.id}`)
        this.store.model.updateMessage(msg.id, {
          tokens: tokens,
          updated: Date.now(),
          terminated: true,
          content: msg.content
        })
      })
    }
  }
  updateChat(id: string, chat: Partial<IChat>) {
    this.store.model.updateChat(id, chat)
    this.useState.setState((state) => {
      if (state.activeChat?.id === id) {
        state.activeChat = {
          ...state.activeChat,
          ...chat
        }
      }
      state.chats = state.chats
        .map((item) => (item.id === id ? { ...item, ...chat } : item))
        .sort((a, b) => b.updated - a.updated)
    })
  }
  async regenrate() {
    const { activeChat } = this.useState.getState()
    if (activeChat) {
      const aiMsg = activeChat?.messages![activeChat?.messages!.length - 1]
      this.useState.setState((state) => {
        state.activeChat!.pending = true
        state.activeChat!.messages?.pop()
      })
      const sendMessages = await this.getHistoryMessages(this.useState.getState().activeChat!)
      this.useState.setState((state) => {
        const msg = {
          ...aiMsg,
          reasoning: undefined,
          terminated: false,
          error: undefined,
          content: '...'
        }
        state.activeChat!.messages!.push(msg)
        this.store.model.updateMessage(msg.id, msg)
      })
      this.startCompletion(activeChat, sendMessages)
    }
  }
  async completion(
    text: string,
    opts?: {
      files?: IMessageFile[]
      images?: IMessageFile[]
    }
  ) {
    const now = Date.now()
    let { activeChat } = this.useState.getState()
    if (!activeChat) {
      activeChat = await this.createChat()
    }
    const model = this.store.settings.getAvailableUseModel(activeChat.clientId)
    if (!model) {
      this.store.msg.error('请先设置模型')
      return
    }
    let tokens = getTokens(text)
    if (opts?.files) {
      tokens += opts.files.reduce((acc, f) => acc + getTokens(f.content || ''), 0)
    }
    if (activeChat.messages?.[activeChat.messages.length - 1]?.error) {
      const lastChat = activeChat!.messages!.slice(-2)
      this.store.model.deleteMessages(lastChat.map((m) => m.id))
      this.useState.setState((state) => {
        state.activeChat!.messages = state.activeChat!.messages!.slice(0, -2)
      })
    }
    const userMsg: IMessage = {
      chatId: activeChat!.id,
      created: now,
      updated: now,
      role: 'user',
      id: nanoid(),
      content: text,
      files: opts?.files,
      tokens: tokens
    }

    this.useState.setState((state) => {
      if (activeChat.id !== state.activeChat?.id) {
        state.activeChat = activeChat
      }
      state.activeChat.pending = true
      state.activeChat.messages?.push(userMsg)
    })
    const sendMessages = await this.getHistoryMessages(this.useState.getState().activeChat!)
    const msgId = nanoid()
    const aiMsg: IMessage = {
      chatId: activeChat!.id,
      created: now + 100,
      updated: now + 100,
      role: 'assistant',
      id: msgId,
      content: '...',
      tokens: 0,
      pending: true,
      model: activeChat.model!
    }
    this.useState.setState((state) => {
      state.activeChat!.messages!.push(aiMsg)
      this.store.model.createMessages([userMsg, aiMsg])
    })
    this.startCompletion(activeChat, sendMessages)
  }
  private async startCompletion(activeChat: IChat, sendMessages: IMessageModel[]) {
    const controller = new AbortController()
    this.chatAbort.set(activeChat.id, controller)
    // 检测如果已有10条message未总结，则先总结前6条，保持后四条不总结
    const startTime = Date.now()
    let lastUpdate = Date.now()
    this.activeClient!.completionStream(sendMessages, {
      enable_search: activeChat.websearch,
      onChunk: (fullText) => {
        this.useState.setState((state) => {
          const msg = state.activeChat!.messages![state.activeChat!.messages!.length - 1]
          if (msg.terminated) {
            return
          }
          if (msg.reasoning && !msg.duration) {
            msg.duration = Date.now() - startTime
            this.store.model.updateMessage(msg.id, {
              duration: msg.duration,
              reasoning: msg.reasoning
            })
          }
          // Throttle content updates to reduce state updates
          const now = Date.now()
          const throttleInterval = 20
          if (now - lastUpdate >= throttleInterval) {
            msg.content = fixMarkdownBold(escapeMhchem(escapeBrackets(fullText)))
            lastUpdate = now
            localStorage.setItem(`chunk-${msg.id}`, fullText)
          }
        })
      },
      onReasoning: (reasoning) => {
        this.useState.setState((state) => {
          const msg = state.activeChat!.messages![state.activeChat!.messages!.length - 1]
          if (msg.terminated) {
            return
          }
          msg.reasoning = fixMarkdownBold(escapeMhchem(escapeBrackets(reasoning)))
        })
      },
      onError: (code, message, e) => {
        console.error(e)
        const now = Date.now()
        this.chatAbort.delete(activeChat.id)
        this.useState.setState((state) => {
          state.activeChat!.pending = false
          state.activeChat!.updated = Date.now()
          const msg = state.activeChat!.messages![state.activeChat!.messages!.length - 1]
          msg.content = msg.content === '...' ? '' : msg.content
          msg.error = {
            code,
            message
          }
          this.updateChat(activeChat.id, {
            updated: now
          })
          this.store.model.updateMessage(msg.id, {
            updated: now,
            error: {
              code,
              message
            }
          })
        })
      },
      onFinish: (content: string = '') => {
        console.log('onFinish', content)
        const now = Date.now()
        this.chatAbort.delete(activeChat.id)
        // 如果是首个message需要获取topic
        this.useState.setState((state) => {
          const tokens = getTokens(content)
          const msg = state.activeChat!.messages![state.activeChat!.messages!.length - 1]
          if (state.activeChat?.id === activeChat.id) {
            state.activeChat!.pending = false
            state.activeChat!.updated = now
            msg.tokens = tokens
            msg.content = content
            localStorage.removeItem(`chunk-${msg.id}`)
            this.store.model.updateMessage(msg.id, {
              content: msg.content,
              tokens: msg.tokens,
              updated: now,
              error: undefined
            })
          } else {
            this.store.model.updateMessage(msg.id, {
              content: content,
              tokens: tokens,
              updated: now,
              error: undefined
            })
          }
        })
        if (!activeChat.topic) {
          this.generateTopic(activeChat.id)
        }
        this.updateChat(activeChat.id, {
          updated: now
        })
      },
      signal: controller.signal
    })
  }
  private async generateTopic(id: string) {
    const chat = await this.store.model.getChat(id)
    if (!chat || this.generateTopicChat.has(id) || !!chat?.topic || !chat?.messages?.length) {
      return
    }
    try {
      this.generateTopicChat.add(id)
      const smMessages = this.activeClient!.getSummaryMessage(chat.messages!)
      await this.activeClient!.completionStream(smMessages, {
        onFinish: (content: string) => {
          if (content) {
            this.useState.setState((state) => {
              const c = state.chats.find((item) => item.id === id)
              if (c) {
                c.topic = content!
              }
              if (state.activeChat?.id === id) {
                state.activeChat!.topic = content!
              }
            })
            this.store.model.updateChat(chat.id, {
              topic: content!
            })
          }
        }
      })
    } finally {
      this.generateTopicChat.delete(id)
    }
  }

  private async getHistoryMessages(chat: IChat) {
    let start = chat.summaryIndex && chat.summaryIndex > 0 ? chat.summaryIndex : 0
    // 未压缩的消息
    const messages = chat.messages!.slice(start)
    let summaryText = chat.summary
    // 大于最小消息数
    if (messages.length > this.minRetainMessages) {
      const tokens = messages.reduce((token, msg) => token + msg.tokens, 0)
      // 大于token阈值
      if (tokens > this.warningThreshold) {
        // 保留最近的消息，找出之前的消息
        const compressedMessages = messages.slice(0, -this.recentMessagesCount)
        if (compressedMessages.length > 2) {
          const summaryMessages = this.activeClient!.getHistoryCompressMessage(
            compressedMessages,
            chat.summary
          )
          const [content] = await this.activeClient!.client.completion(summaryMessages)
          if (content) {
            summaryText = content!
            this.useState.setState((state) => {
              if (state.activeChat?.id === chat.id) {
                state.activeChat!.summaryIndex = start + compressedMessages.length
                start = start + compressedMessages.length
                state.activeChat!.summary = content
              }
            })
            this.store.model.updateChat(chat.id, {
              summaryIndex: start + compressedMessages.length,
              summary: content!
            })
          }
        }
      }
    }
    const newMessages = chat.messages!.slice(start).reduce((acc, m) => {
      let content = m.content
      if (m.files?.length) {
        content = `Given the following file contents as context, Content is sent in markdown format:\n${m.files.map((f) => `File ${f.name}:\n ${f.content}`).join('\n')} \n ${content}`
      }
      acc.push({
        role: m.role,
        content: content
      })
      return acc
    }, [] as IMessageModel[])
    if (summaryText) {
      newMessages.unshift({
        role: 'user',
        content: `[Conversation History Summary]:\n ${summaryText}`
      })
    }
    let prompt = 'You are an AI assistant, please answer in the language used by the user'
    if (summaryText) {
      prompt = `${prompt}\n[Conversation History Summary Reference]:\n ${summaryText}`
    }
    // 后续加入自定义提示词
    newMessages.unshift({
      role: 'system',
      content: prompt
    })
    return newMessages.filter((m) => !!m.content)
  }

  async checkLLMApiConnection({
    provider,
    baseUrl,
    apiKey,
    model,
    mode
  }: {
    provider: string
    baseUrl?: string
    apiKey: string
    model: string
    mode: string
  }) {
    console.log('checkLLMApiConnection', { provider, baseUrl, apiKey, model })
    try {
      const client = new AiClient({
        mode: provider,
        baseUrl: baseUrl || openAiModels.get(mode),
        apiKey: apiKey,
        model: model,
        id: nanoid(),
        options: {}
      })
      await client.completionStream([{ role: 'user', content: 'Hello' }], {
        onFinish: (content) => {
          console.log('test finish', content)
        },
        max_tokens: 5
      })
      // 检查响应状态
      return {
        success: true,
        message: `${provider} API连接成功`
      }
    } catch (error) {
      console.error(error)
      return {
        success: false,
        error,
        message: `连接测试出错: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  async deleteChat(id: string) {
    await this.store.model.deleteChat(id)
    this.useState.setState((state) => {
      state.chats = state.chats.filter((item) => item.id !== id)
      if (state.activeChat?.id === id) {
        state.activeChat = null
      }
    })
  }
  setWebSearch(webSearch: boolean) {
    const { activeChat } = this.useState.getState()
    if (activeChat) {
      this.store.model.updateChat(activeChat.id, {
        websearch: webSearch
      })
    }
    this.useState.setState((state) => {
      if (state.activeChat) {
        state.activeChat!.websearch = webSearch
      }
      state.webSearch = webSearch
    })
  }
}
