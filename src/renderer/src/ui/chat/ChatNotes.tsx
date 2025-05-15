import { useStore } from '@/store/store'
import { FileText } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import { ScrollList } from '../common/ScrollList'
import { getOffsetLeft } from '@/utils/dom'
import { useGetSetState } from 'react-use'
import { Editor, Node, Transforms } from 'slate'
import { useTranslation } from 'react-i18next'

const width = 300
export const ChatNotes = observer(() => {
  const store = useStore()
  const { t } = useTranslation()
  const [state, setState] = useGetSetState({
    nodes: [] as { folder: string[]; name: string; fullPath: string; docId: string }[],
    filterNodes: [] as { folder: string[]; name: string; fullPath: string; docId: string }[],
    left: 0,
    bottom: 0
  })
  const { reference } = store.chat.state
  useEffect(() => {
    if (reference.open) {
      const { x, y } = reference.domRect!
      const docs = Object.values(store.note.state.nodes)
        .filter((item) => !item.folder)
        .map((item) => {
          const path = store.note.getDocPath(item)
          return {
            folder: path.length > 1 ? path.slice(0, -1) : [],
            name: path[path.length - 1],
            fullPath: path.join('/'),
            docId: item.id
          }
        })
      const chat = document.querySelector<HTMLDivElement>('.chat')
      if (chat) {
        let left = x - getOffsetLeft(chat, document.body) - 20,
          bottom = window.innerHeight - y + 5
        if (left < 5) {
          left = 5
        }

        if (left + width > chat.offsetWidth) {
          left = chat.offsetWidth - width - 5
        }
        setState({
          left,
          bottom
        })
      }
      setState({
        nodes: docs,
        filterNodes: docs
      })
    }
  }, [reference.open])
  useEffect(() => {
    if (reference.open) {
      setState({
        filterNodes: state().nodes.filter((item) =>
          item.name.toLowerCase().includes(reference.keyword.toLowerCase())
        )
      })
    }
  }, [reference.keyword])
  const select = useCallback(
    async (item: { folder: string[]; name: string; fullPath: string; docId: string }) => {
      const node = store.note.state.nodes[item.docId]
      if (node) {
        let schema = node.schema
        if (!schema) {
          const res = await store.model.getDoc(item.docId)
          schema = res?.schema
        }
        if (schema) {
          const { md } = await store.output.toMarkdown({ node })
          store.chat.setState((state) => {
            state.cacheDocs.push({
              name: node.name,
              content: md,
              docId: item.docId
            })
          })
        }
        const [n] = Editor.nodes(store.chat.editor, {
          match: (n) => n.type === 'paragraph'
        })
        if (n) {
          const text = Node.string(n[0])
          const match = text.match(/@[^\n]*$/)
          if (match) {
            Transforms.delete(store.chat.editor, {
              at: {
                anchor: { path: [...n[1], 0], offset: match.index! },
                focus: { path: [...n[1], 0], offset: match.index! + match[0].length }
              }
            })
          }
          store.chat.setState((state) => {
            state.reference.open = false
          })
        }
      }
    },
    []
  )
  if (!reference.open) return null
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={'absolute z-30 w-[370px] ctx-panel flex flex-col'}
      style={{
        left: state().left,
        bottom: state().bottom,
        width
      }}
    >
      <div className={'flex-1 overflow-y-auto py-2 max-h-[200px] px-2 text-[15px] relative'}>
        <ScrollList
          items={state().filterNodes}
          onSelect={select}
          onClose={() => {
            store.chat.setState((state) => {
              state.reference.open = false
            })
          }}
          renderItem={(item, i) => (
            <div
              key={i}
              className={`flex justify-center py-0.5 rounded  cursor-pointer px-2 flex-col leading-4`}
            >
              <div
                className={'text-gray-600 dark:text-white/90 flex items-start leading-5 text-sm'}
              >
                <div className={'h-5 flex items-center'}>
                  <FileText size={14} className={'dark:stroke-white/70 stroke-gray-500'} />
                </div>
                <span className={'ml-1 flex-1 max-w-full break-all w-0 text-sm'}>{item.name}</span>
              </div>
              {!!item.folder.length && (
                <div
                  className={
                    'text-gray-500 dark:text-white/70 pl-[20px] break-all text-xs w-full truncate'
                  }
                >
                  {item.folder.join('/')}
                </div>
              )}
            </div>
          )}
        />
        {!state().filterNodes.length && (
          <div className={'py-4 text-center text-gray-400 text-sm'}>
            {t('chat.no_matching_content')}
          </div>
        )}
      </div>
    </div>
  )
})
