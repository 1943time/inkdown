import { useStore } from '@/store/store'
import { Check, Folders } from 'lucide-react'
import { ISpace } from 'types/model'

export function SpaceItem(props: { item: ISpace; onClick: () => void }) {
  const store = useStore()
  return (
    <div
      className={`cursor-pointer group dark:hover:bg-gray-200/10 hover:bg-gray-100 group py-2 px-3 flex items-center relative text-[13px]`}
      onClick={props.onClick}
    >
      <div className={'flex flex-1 items-center'}>
        <Folders size={16} />
        <span className={'ml-2 flex-1 truncate max-w-56'}>{props.item.name}</span>
      </div>
      {store.note.state.nodes['root']?.id === props.item.id && (
        <div className={'pr-2'}>
          <Check className={'text-teal-500'} />
        </div>
      )}
    </div>
  )
}
