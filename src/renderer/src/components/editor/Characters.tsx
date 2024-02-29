import {observer} from 'mobx-react-lite'
import {treeStore} from '../../store/tree'
import {configStore} from '../../store/config'

export const Characters = observer(() => {
  if (!treeStore.openedNote || !['md', 'markdown'].includes(treeStore.openedNote.ext || '') || !configStore.config.showCharactersCount) return null
  return (
    <div className={`
      px-2 absolute text-center z-10 bg-gray-200 text-gray-500 panel-bg
      right-0 bottom-0 rounded-tl-lg dark:bg-black/60 text-xs dark:text-gray-500 py-0.5 space-x-1 flex justify-center`}>
      <span
        className={`w-20`}
        style={{
          width: String(treeStore.currentTab?.store?.count.words).length * 10 + 38
        }}
      >
        {treeStore.currentTab?.store?.count.words} words
      </span>
      <span
        style={{
          width: String(treeStore.currentTab?.store!.count.characters || 0).length * 10 + 72
        }}
      >{treeStore.currentTab.store?.count.characters || 0} characters</span>
    </div>
  )
})
