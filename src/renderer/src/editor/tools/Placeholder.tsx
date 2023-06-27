import {useSlate} from 'slate-react'
import {Node} from 'slate'

export function Placeholder() {
  const editor = useSlate()
  if (editor.children.length > 1 || editor.children[0]?.type !== 'paragraph' || Node.string(editor.children[0])) return null
  return (
    <p className={'opacity-30 pointer-events-none absolute left-14 top-14'}>输入内容</p>
  )
}
