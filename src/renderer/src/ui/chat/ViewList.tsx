import { observer } from 'mobx-react-lite'
import ChatItem from './ChatItem'
import { IChat } from 'types/model'

export const ChatViewList = observer(({ chat }: { chat: IChat }) => {
  return (
    <div className={`chat-list animate-show`}>
      <div className={'w-full'}>{chat.messages?.map((m) => <ChatItem key={m.id} msg={m} />)}</div>
    </div>
  )
})
