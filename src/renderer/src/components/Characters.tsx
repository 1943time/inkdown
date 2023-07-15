import {observer} from 'mobx-react-lite'
import {treeStore} from '../store/tree'
import {configStore} from '../store/config'

export const Characters = observer(() => {
  if (!treeStore.openNote || !['md', 'markdown'].includes(treeStore.openNote.ext || '') || !configStore.config.showCharactersCount) return null
  return (
    <div className={`
      px-2 absolute text-center z-10 bg-gray-200 text-gray-500
      right-0 bottom-0 rounded-tl-lg dark:bg-zinc-900 text-xs dark:text-gray-500 py-0.5 space-x-1 flex justify-center`}>
      <span
        className={`w-20`}
        style={{
          width: String(treeStore.currentTab.store?.count.words).length * 9 + 36
        }}
      >
        {treeStore.currentTab.store?.count.words} words
      </span>
      <span
        style={{
          width: String(treeStore.currentTab.store!.count.characters || 0).length * 9 + 72
        }}
      >{treeStore.currentTab.store?.count.characters || 0} characters</span>
    </div>
  )
})