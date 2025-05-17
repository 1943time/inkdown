import { ReactNode } from 'react'

export interface MermaidProps {
  bodyRender?: (props: { content: string; originalNode: ReactNode }) => ReactNode
  children: string
  showLanguage?: boolean
  className?: string
  type?: 'ghost' | 'block' | 'pure'
}
