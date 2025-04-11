import { memo } from 'react'

import FullFeatured from './FullFeatured'
import { MermaidProps } from './type'
import { useMermaid } from './useMermaid'

const Mermaid = memo<MermaidProps>(({ children, showLanguage = true, style, type = 'block', className, bodyRender, ...rest }) => {
  const tirmedChildren = children.trim()
  const MermaidRender = useMermaid(tirmedChildren)

  return (
    <FullFeatured
      bodyRender={bodyRender}
      className={className}
      content={tirmedChildren}
      showLanguage={showLanguage}
      style={style}
      type={type}
      {...rest}
    >
      <MermaidRender />
    </FullFeatured>
  )
})

export default Mermaid

export { type MermaidProps } from './type'
