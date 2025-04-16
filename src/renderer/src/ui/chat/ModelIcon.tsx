import {
  Claude,
  DeepSeek,
  Gemini,
  LmStudio,
  Ollama,
  OpenAI,
  OpenRouter,
  Qwen
} from '@lobehub/icons'
import { memo } from 'react'

export const ModelIcon = memo(({ mode, size }: { mode: string; size: number }) => {
  if (mode === 'openai') {
    return <OpenAI.Avatar size={size} />
  }
  if (mode === 'claude') {
    return <Claude.Color size={size} />
  }
  if (mode === 'ollama') {
    return <Ollama.Avatar size={size} />
  }
  if (mode === 'lmstudio') {
    return <LmStudio.Avatar size={size} />
  }
  if (mode === 'qwen') {
    return <Qwen.Color size={size} />
  }
  if (mode === 'deepseek') {
    return <DeepSeek.Color size={size} />
  }
  if (mode === 'gemini') {
    return <Gemini.Color size={size} />
  }
  if (mode === 'openrouter') {
    return <OpenRouter.Avatar size={size} />
  }
  return null
})
