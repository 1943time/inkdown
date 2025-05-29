import { ChevronDown, ChevronRight } from 'lucide-react'
import { ReactNode, memo, useState } from 'react'
import { Flexbox } from 'react-layout-kit'

import { MermaidProps } from './type'
import { ActionIcon, CopyButton } from '@lobehub/ui'

export const MermaidFullFeatured = memo<
  Omit<MermaidProps, 'children'> & { children: ReactNode; content: string }
>(({ showLanguage, content, children, className, ...rest }) => {
  const [expand, setExpand] = useState(true)
  return (
    <div
      className={`relative overflow-hidden rounded-md transition-colors ${className || ''}`}
      data-code-type="mermaid"
      {...rest}
    >
      <Flexbox
        align={'center'}
        className="relative py-1 px-2 bg-[rgba(0,0,0,0.04)]"
        horizontal
        justify={'space-between'}
      >
        <ActionIcon
          icon={expand ? ChevronDown : ChevronRight}
          onClick={() => setExpand(!expand)}
          size={{ blockSize: 24, size: 14, strokeWidth: 3 }}
        />
        {showLanguage && (
          <Flexbox
            align={'center'}
            className="absolute left-1/2 transform -translate-x-1/2 min-w-[100px] text-sm text-center select-none text-gray-500"
            gap={2}
            horizontal
            justify={'center'}
          >
            <span>mermaid</span>
          </Flexbox>
        )}
        <Flexbox align={'center'} flex={'none'} gap={4} horizontal>
          <CopyButton content={content} size={14} />
        </Flexbox>
      </Flexbox>
      <div style={expand ? {} : { height: 0, overflow: 'hidden' }}>{children}</div>
    </div>
  )
})

export default MermaidFullFeatured
