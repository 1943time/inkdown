import {observer} from 'mobx-react-lite'
import {action, runInAction} from 'mobx'
import {useCallback, useRef} from 'react'
import IClose from '../../icons/IClose'
import {useLocalState} from '../../hooks/useLocalState'
import { useCoreContext } from '../../store/core'

export const Tabs = observer(() => {
  const core = useCoreContext()
  const [state, setState] = useLocalState({
    dragIndex: 0,
    dragging: false,
    targetIndex: -1,
    markLeft: 0
  })
  const tabRef = useRef<HTMLDivElement>(null)
  const findIndex = useCallback((left: number) => {
    left = tabRef.current!.scrollLeft + (core.tree.fold ? left : left - core.tree.width)
    const tabWidth = (tabRef.current!.querySelector('.tab') as HTMLDivElement).clientWidth
    let index = Math.round(left / tabWidth)
    setState({markLeft: index * tabWidth, targetIndex: index})
  }, [])

  if (core.tree.tabs.length < 2) return null
  return (
    <div
      id={'nav-tabs'}
      ref={tabRef}
      onDragOver={e => {
        e.preventDefault()
        findIndex(e.clientX)
      }}
      className={`tabs-nav`}
    >
      <div className={'flex h-full relative'}>
        {/*<div*/}
        {/*  className={`absolute z-50 w-0.5 bg-indigo-500 top-0 h-full ${state.dragging && state.dragIndex !== state.targetIndex ? '' : 'hidden'}`}*/}
        {/*  style={{*/}
        {/*    transform: `translateX(${state.markLeft}px)`*/}
        {/*  }}*/}
        {/*/>*/}
        {core.tree.tabs.map((t, i) =>
          <div
            draggable={true}
            onDragStart={e => {
              setState({dragging: true, dragIndex: i, targetIndex: -1})
            }}
            onDrop={e => {
              if (state.targetIndex >= 0 && state.dragIndex !== state.targetIndex) {
                runInAction(() => {
                  const currentTab = core.tree.tabs[core.tree.currentIndex]
                  const [tab] = core.tree.tabs.splice(state.dragIndex, 1)
                  let target = state.dragIndex < state.targetIndex ? state.targetIndex - 1 : state.targetIndex
                  core.tree.tabs.splice(target, 0, tab)
                  core.tree.currentIndex = core.tree.tabs.findIndex(t => t === currentTab)
                  core.tree.recordTabs()
                })
              }
            }}
            onDragEnd={e => setState({dragging: false, targetIndex: -1})}
            title={t.current?.filename}
            onClick={() => {
              core.tree.selectTab(i)
            }}
            className={`${i === core.tree.currentIndex ? 'dark:bg-white/5 bg-white text-gray-600 dark:text-gray-200' : 'dark:text-gray-300 text-gray-500 hover:text-gray-600 dark:hover:text-gray-200'}
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
                core.tree.removeTab(i)
              }}
            >
              <IClose
                className={'w-[14px] h-[14px]'}
              />
            </div>
            <div className={'w-full truncate text-center select-none'}>
              {t.current? (t.current.filename || 'Untitled') : 'New Tab'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
