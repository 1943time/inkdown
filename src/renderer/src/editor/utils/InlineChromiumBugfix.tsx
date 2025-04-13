import { memo } from 'react'

export const InlineChromiumBugfix = memo(() => (
  <span className={'h-0 leading-none'} contentEditable={false} style={{ fontSize: 0 }}>
    {String.fromCodePoint(160)}
  </span>
))
