import {observer} from 'mobx-react-lite'
import {QuestionCircleOutlined} from '@ant-design/icons'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import Command from '../../icons/keyboard/Command'
import { SystemPanel } from './System'
import { Icon } from '@iconify/react'
import {useLocalState} from '../../hooks/useLocalState'
import {treeStore} from '../../store/tree'
import IFormat from '../../icons/IFormat'
import IAdd from '../../icons/IAdd'

export const Tools = observer(() => {
  const [state, setState] = useLocalState({
    open: false,
    tab: '',
    pause: false
  })
  const openTab = useCallback((tab: string) => {
    if (state.pause) return
    if (tab === state.tab) {
      setState({open: false, tab: ''})
    } else {
      setState({open: true, tab})
    }
    setState({pause: true})
    window.setTimeout(() => {
      setState({pause: false})
    }, 120)
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (state.pause) return
      let el: HTMLElement | null = e.target as HTMLElement
      while (el) {
        if (el.classList.contains('system-tools') || el.classList.contains('tools-panel')) return
        el = el.parentElement
      }
      setState({open: false, tab: ''})
    }
    window.addEventListener('click', close)
    return () => {
      return window.removeEventListener('click', close)
    }
  }, [])
  if (!treeStore.openedNote) return null
  return (
    <>
      <div
        onMouseDown={e => {
          e.preventDefault()
        }}
        style={{
          top: treeStore.tabs.length > 1 ? 180 : 120,
          transitionProperty: 'opacity,border'
        }}
        className={`system-tools select-none absolute right-5 p-1 space-y-2 ${state.open ? 'text-zinc-600 dark:text-zinc-300' : 'dark:text-zinc-500 dark:hover:text-zinc-300 text-zinc-400 hover:text-zinc-600'}
      z-50 w-10 flex flex-col justify-between rounded `}
      >
        <div
          onClick={() => openTab('insert')}
          className={`${state.tab === 'insert' ? 'dark:bg-gray-200/10 bg-gray-200/80' : 'dark:hover:bg-gray-200/5 hover:bg-gray-200/60'}
            w-full py-2 flex justify-center items-center rounded duration-200 cursor-pointer
          `}>
          <Icon icon={'mingcute:add-line'} className={'text-lg'}/>
        </div>
        <div
          onClick={() => {
            openTab('style')
          }}
          className={`${state.tab === 'style' ? 'dark:bg-gray-200/10 bg-gray-200/80' : 'dark:hover:bg-gray-200/5 hover:bg-gray-200/60'}
            w-full py-2 flex justify-center items-center rounded duration-200 cursor-pointer`}>
          <IFormat className={'text-lg'}/>
        </div>
        <div
          onClick={() => {
            openTab('actions')
          }}
          className={`${state.tab === 'actions' ? 'dark:bg-gray-200/10 bg-gray-200/80' : 'dark:hover:bg-gray-200/5 hover:bg-gray-200/60'}
            w-full py-2 flex justify-center items-center rounded duration-200 cursor-pointer`}>
          <Command className={'text-lg'}/>
        </div>
        <div
          className={`dark:hover:bg-gray-200/5 hover:bg-gray-200/60
            w-full py-2 flex justify-center items-center rounded duration-200 cursor-pointer`}>
          <QuestionCircleOutlined className={'text-base leading-7'}/>
        </div>
      </div>
      <SystemPanel open={state.open} tab={state.tab} onClose={() => {
        setState({open: false, tab: ''})
      }}/>
    </>
  )
})
