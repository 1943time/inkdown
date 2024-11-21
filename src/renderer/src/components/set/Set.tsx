import {observer} from 'mobx-react-lite'
import {CloseOutlined} from '@ant-design/icons'
import {useCallback, useEffect} from 'react'
import {action} from 'mobx'
import {useLocalState} from '../../hooks/useLocalState'
import {Overview} from './Overview'
import {SetEditor} from './Editor'
import { useCoreContext } from '../../store/core'

export const Set = observer(() => {
  const core = useCoreContext()
  const close = useCallback(action(() => {
    core.config.visible = false
  }), [])

  const [state, setState] = useLocalState({
    tab: 'Overview' as 'Overview' | 'Editor',
    version: ''
  })

  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-version').then(res => {
      setState({version: res})
    })

    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
      }
    }
    if (core.config.visible) {
      window.addEventListener('keydown', esc)
    } else {
      window.removeEventListener('keydown', esc)
    }
  }, [core.config.visible])

  if (!core.config.visible) return null
  return (
    <div className={`fixed inset-0 z-[300] dark:bg-black/30 bg-black/10`}>
      <div
        className={'w-full h-full flex items-center justify-center overflow-auto py-10 flex-wrap'}
        onClick={close}
      >
        <div
          className={'min-w-[500px] modal-panel w-4/5 max-w-[900px] relative overflow-hidden'}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={'z-[10] w-6 h-6 flex cursor-pointer items-center justify-center dark:text-gray-400 text-gray-500 duration-200 hover:bg-gray-100 rounded dark:hover:bg-gray-500/30 absolute right-3 top-3'}
            onClick={close}
          >
            <CloseOutlined/>
          </div>
          <div className={'flex'}>
            <div className={'py-4 px-2 w-[230px] border-r b1 tree-bg rounded-tl-lg rounded-bl-lg'}>
              <div className={'mb-4 px-2 text-sm text-gray-500 dark:text-gray-400 font-medium'}>{'Settings'}</div>
              <div className={'space-y-1'}>
                <div
                  onClick={() => setState({tab: 'Overview'})}
                  className={`py-1 cursor-default px-3 text-sm rounded  ${state.tab === 'Overview' ? 'bg-blue-500/80 text-gray-100' : 'dark:hover:bg-gray-400/10 hover:bg-gray-500/10 text-gray-600 dark:text-gray-200'}`}
                >
                  Overview
                </div>
                <div
                  onClick={() => setState({tab: 'Editor'})}
                  className={`py-1 cursor-default px-3 text-sm rounded ${state.tab === 'Editor' ? 'bg-blue-500/80 text-gray-100' : 'dark:hover:bg-gray-400/10 hover:bg-gray-500/10 text-gray-600 dark:text-gray-200'}`}>
                  Editor
                </div>
              </div>
            </div>
            <div className={'flex-1 dark:bg-zinc-900 bg-white'}>
              <div
                className={'border-b text-base font-medium h-12 items-center flex dark:text-gray-200 text-gray-700 b1 relative px-4'}>
                <div>
                  {state.tab}
                </div>
              </div>
              {state.tab === 'Overview' &&
                <Overview/>
              }
              {state.tab === 'Editor' &&
                <SetEditor/>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
