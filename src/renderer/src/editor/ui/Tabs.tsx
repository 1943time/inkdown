import { observer } from 'mobx-react-lite'
import { useCallback, useRef } from 'react'
import { useStore } from '@/store/store'
import { useLocalState } from '@/hooks/useLocalState'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const Tabs = observer(() => {
  const store = useStore()
  const { t } = useTranslation()
  const [state, setState] = useLocalState({
    dragIndex: 0,
    dragging: false,
    targetIndex: -1,
    markLeft: 0
  })
  const tabRef = useRef<HTMLDivElement>(null)
  const findIndex = useCallback((left: number) => {
    const { sidePanelWidth, foldSideBar } = store.settings.state
    left = tabRef.current!.scrollLeft + (foldSideBar ? left : left - sidePanelWidth)
    const tabWidth = (tabRef.current!.querySelector('.tab') as HTMLDivElement).clientWidth
    let index = Math.round(left / tabWidth)
    setState({ markLeft: index * tabWidth, targetIndex: index })
  }, [])

  if (store.note.state.tabs.length < 2) return null
  return (
    <div
      id={'nav-tabs'}
      ref={tabRef}
      onDragOver={(e) => {
        e.preventDefault()
        findIndex(e.clientX)
      }}
      className={`tabs-nav`}
    >
      <div className={'flex h-full relative'}>
        {/*<div*/}
        {/*  className={`absolute z-50 w-0.5 bg-blue-500 top-0 h-full ${state.dragging && state.dragIndex !== state.targetIndex ? '' : 'hidden'}`}*/}
        {/*  style={{*/}
        {/*    transform: `translateX(${state.markLeft}px)`*/}
        {/*  }}*/}
        {/*/>*/}
        {store.note.state.tabs.map((tab, i) => (
          <div
            draggable={true}
            onDragStart={(e) => {
              setState({ dragging: true, dragIndex: i, targetIndex: -1 })
            }}
            onDrop={(e) => {
              if (state.targetIndex >= 0 && state.dragIndex !== state.targetIndex) {
                store.note.setState((draft) => {
                  const currentTab = draft.tabs[draft.tabIndex]
                  const [tab] = draft.tabs.splice(state.dragIndex, 1)
                  let target =
                    state.dragIndex < state.targetIndex ? state.targetIndex - 1 : state.targetIndex
                  draft.tabs.splice(target, 0, tab)
                  draft.tabIndex = draft.tabs.findIndex((t) => t === currentTab)
                })
                store.note.recordTabs()
              }
            }}
            onDragEnd={(e) => setState({ dragging: false, targetIndex: -1 })}
            onClick={() => {
              store.note.selectTab(i)
            }}
            className={`${i === store.note.state.tabIndex ? 'dark:bg-[rgba(255,255,255,0.03)] bg-white text-gray-600 dark:text-gray-200' : 'dark:text-gray-300 text-gray-500 hover:text-gray-600 dark:hover:text-gray-200'}
              ${i !== 0 ? 'border-l dark:border-gray-200/10 border-gray-200' : ''}
              relative flex-1 min-w-[200px] h-full flex items-center group px-8 cursor-default tab
              `}
            key={i}
          >
            <div
              className={`opacity-0 group-hover:opacity-100 duration-200 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 dark:hover:bg-gray-200/10
                absolute left-1 p-[1px] top-1/2 -translate-y-1/2 dark:text-gray-500 dark:hover:text-gray-300`}
              onClick={(e) => {
                e.stopPropagation()
                store.note.removeTab(i)
              }}
            >
              <X size={14} />
            </div>
            <div className={'w-full truncate text-center select-none'}>
              {tab.state.doc
                ? tab.state.doc.name || t('editor.tabs.untitled')
                : t('editor.tabs.newTab')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
