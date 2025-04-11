import { ChatMessage } from '@lobehub/ui'
import { ReactNode, memo } from 'react';
import BubblesLoading from './BubbleLoading'

export const DefaultMessage = memo<
  ChatMessage & {
    editableContent: ReactNode;
  }
>(({ id, editableContent, content }) => {
  if (content === '...') return <BubblesLoading />;

  return <div id={id}>{editableContent}</div>;
});

export const DefaultBelowMessage = memo<ChatMessage>(() => {
  return null;
});
