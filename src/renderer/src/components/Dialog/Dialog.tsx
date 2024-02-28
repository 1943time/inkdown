import {observer} from 'mobx-react-lite'
import {ReactNode, useCallback, useEffect, useState} from 'react'
import {useLocalState} from '../../hooks/useLocalState'
import {CloseOutlined} from '@ant-design/icons'
import isHotkey from 'is-hotkey'

export const Dialog = observer((props: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string | ReactNode
}) => {
  const [state, setState] = useLocalState({
    visible: false,
    open: false
  })
  const close = useCallback(() => {
    setState({visible: false})
    setTimeout(() => {
      props.onClose()
      setState({open: false})
    }, 230)
  }, [props.onClose])

  const keydown = useCallback((e: KeyboardEvent) => {
    if (isHotkey('esc', e)) {
      close()
    }
  }, [])

  useEffect(() => {
    if (props.open) {
      setState({open: true})
      setTimeout(() => {
        setState({visible: true})
      }, 30)
    } else {
      close()
    }

    if (props.open) {
      window.addEventListener('keydown', keydown)
    } else {
      window.removeEventListener('keydown', keydown)
    }
  }, [props.open])
  if (!state.open) return null
  return (
    <div className={`fixed inset-0 z-[300] dark:bg-black/30 bg-black/20 duration-200 ${state.visible ? 'opacity-100' : 'opacity-0'}`}>
      <div
        className={`w-full h-full flex items-center justify-center overflow-auto py-10 flex-wrap`}
        onClick={close}
      >
        <div
          className={`modal-panel ${state.visible ? 'scale-100' : 'scale-90'} duration-200`}
          onClick={(e) => e.stopPropagation()}
        >
          {props.title &&
            <div className={'flex items-center justify-between h-10 px-3 border-b b1'}>
              <div className={'text-sm dark:text-gray-400 text-gray-500'}>{props.title}</div>
              <div
                className={'p-1 dark:text-gray-400 text-gray-500 duration-200 hover:bg-gray-100 rounded dark:hover:bg-gray-500/30'}
                onClick={close}
              >
                <CloseOutlined/>
              </div>
            </div>
          }
          {props.children}
        </div>
      </div>
    </div>
  )
})
