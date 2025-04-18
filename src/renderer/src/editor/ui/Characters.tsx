import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import { countWords } from 'alfaaz'
import { Editor } from 'slate'
import { useStore } from '@/store/store'
import { useLocalState } from '@/hooks/useLocalState'
import { CustomLeaf } from '..'
export const Characters = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    words: 0,
    characters: 0
  })
  const count = useCallback(() => {
    if (store.note.state.opendDoc) {
      try {
        const texts = Editor.nodes<CustomLeaf>(store.note.state.currentTab.editor, {
          at: [],
          match: (n) => n.text
        })
        let words = 0
        let characters = 0
        for (let t of texts) {
          words += countWords(t[0].text || '')
          characters += (t[0].text || '').length
        }
        setState({
          words,
          characters
        })
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  useEffect(() => {
    if (!store.note.state.opendDoc) return
    count()
    let timer = 0
    const sub = store.note.state.currentTabStore.docChanged$.subscribe(() => {
      clearTimeout(timer)
      timer = window.setTimeout(count, 300)
    })
    return () => {
      sub?.unsubscribe()
    }
  }, [store.note.state.opendDoc])
  if (!store.note.state.opendDoc) return null
  return (
    <div
      className={`
      px-2 fixed text-center z-10 bg-gray-200 text-gray-500
      right-0 bottom-0 rounded-tl-lg dark:bg-black/60 text-xs dark:text-gray-400 py-0.5 space-x-1 flex justify-center`}
    >
      <span
        className={`w-20`}
        style={{
          width: String(state.words).length * 10 + 38
        }}
      >
        {state.words} words
      </span>
      <span
        style={{
          width: String(state.characters).length * 10 + 72
        }}
      >
        {state.characters} characters
      </span>
    </div>
  )
})
