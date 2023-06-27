import {useMemo} from 'react'

export function InlineChromiumBugfix() {
  return useMemo(() => (
    <span
      className={'select-none inline-block h-0'}
      onCopyCapture={e => e.preventDefault()}
      contentEditable={false}
      style={{fontSize: 0}}
    >
    ${String.fromCodePoint(160) /* Non-breaking space */}
  </span>
  ), [])
}
