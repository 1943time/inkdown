import { ReactNode, memo } from 'react'
import BubblesLoading from './BubbleLoading'

export const DefaultMessage = memo<{
  editableContent: ReactNode
  id: string
}>(({ editableContent, id }) => {
  if (editableContent === '...') return <BubblesLoading />

  return <div id={id}>{editableContent}</div>
})
