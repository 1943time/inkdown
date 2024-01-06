import {observer} from 'mobx-react-lite'
import {ReactNode, useCallback, useEffect, useState} from 'react'
import {useLocalState} from '../hooks/useLocalState'

export const Dialog = observer((props: {
  open: boolean
  onClose: () => void
  children: ReactNode
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

  useEffect(() => {
    if (props.open) {
      setState({open: true})
      setTimeout(() => {
        setState({visible: true})
      }, 30)
    } else {
      close()
    }
  }, [props.open])
  if (!state.open) return null
  return (
    <div className={`fixed inset-0 z-[300] dark:bg-black/30 bg-black/20 duration-200 ${state.visible ? 'opacity-100' : 'opacity-0'}`}>
      <div
        className={`w-full h-full flex items-center justify-center overflow-auto py-10 flex-wrap`}
        onClick={props.onClose}
      >
        <div
          className={`modal-panel ${state.visible ? 'scale-100' : 'scale-90'} duration-200`}
          onClick={(e) => e.stopPropagation()}
        >
          {props.children}
        </div>
      </div>
    </div>
  )
})
