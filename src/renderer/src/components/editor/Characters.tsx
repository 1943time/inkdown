import {observer} from 'mobx-react-lite'
import {useCallback, useEffect} from 'react'
import {countWords} from 'alfaaz'
import {Editor} from 'slate'
import {CustomLeaf} from '../../types/el'
import {useLocalState} from '../../hooks/useLocalState'
import { useCoreContext } from '../../store/core'

export const Characters = observer(() => {
  const core = useCoreContext()
  const [state, setState] = useLocalState({
    words: 0,
    characters: 0
  })
  const count = useCallback(() => {
    if (core.tree.openedNote) {
      try {
        const texts = Editor.nodes<CustomLeaf>(core.tree.currentTab.store.editor, {
          at: [],
          match: n => n.text
        })
        let words = 0
        let characters = 0
        for (let t of texts) {
          words += countWords(t[0].text || '')
          characters += (t[0].text || '').length
        }
        setState({
          words, characters
        })
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  useEffect(() => {
    count()
    let timer = 0
    const sub = core.tree.currentTab?.store.docChanged$.subscribe(() => {
      clearTimeout(timer)
      timer = window.setTimeout(count, 300)
    })
    return () => {
      sub?.unsubscribe()
    }
  }, [core.tree.openedNote])
  if (!core.tree.openedNote || core.tree.openedNote.ext !== 'md') return null
  return (
    <div className={`
      px-2 absolute text-center z-10 bg-gray-200 text-gray-500 panel-bg
      right-0 bottom-0 rounded-tl-lg dark:bg-black/60 text-xs dark:text-gray-500 py-0.5 space-x-1 flex justify-center`}>
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
      >{state.characters} characters</span>
    </div>
  )
})
