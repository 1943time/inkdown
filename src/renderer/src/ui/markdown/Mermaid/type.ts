import { ReactNode } from 'react'
import { DivProps } from '@lobehub/ui'

export interface MermaidProps extends DivProps {
  bodyRender?: (props: { content: string; originalNode: ReactNode }) => ReactNode
  children: string
  showLanguage?: boolean
  type?: 'ghost' | 'block' | 'pure'
}
