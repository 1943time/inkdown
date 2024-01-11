import {observer} from 'mobx-react-lite'
import {Button} from 'antd'
import {Dialog} from './Dialog'
import logo from '../../public/logo.svg'
import {createElement, ReactNode, useCallback, useRef} from 'react'
import {Subject} from 'rxjs'
import {useLocalState} from '../hooks/useLocalState'
import {useSubject} from '../hooks/subscribe'
import isHotkey from 'is-hotkey'

export const openConfirmDialog$ = new Subject<{
  onClose?: () => void
  title: string
  okText?: string
  cancelText?: string
  description?: string
  onCancel?: () => void
  onConfirm?: () => void | Promise<any>
  footer?: ReactNode
}>()
export const ConfirmDialog = observer(() => {
  const [state, setState] = useLocalState({
    open: false,
    title: '',
    description: '',
    loading: false,
    okText: '',
    cancelText: ''
  })
  const paramsRef = useRef<{
    onCancel?: () => void
    onConfirm?: () => void | Promise<any>
    footer?: ReactNode
    onClose?: () => void
  }>({})

  const confirm = useCallback(async () => {
    const res = paramsRef.current.onConfirm?.()
    if (res && res instanceof Promise) {
      setState({loading: true})
      await res
    }
    close()
  }, [])

  const enter = useCallback((e: KeyboardEvent) => {
    if (isHotkey('enter', e)) {
      confirm()
    }
    if (isHotkey('esc', e)) {
      close()
    }
  }, [])

  const close = useCallback(() => {
    paramsRef.current.onClose?.()
    window.removeEventListener('keydown', enter)
    setState({open: false})
    setTimeout(() => {
      setState({
        title: '',
        description: '',
        loading: false,
        okText: '',
        cancelText: ''
      })
      paramsRef.current = {}
    }, 230)
  }, [])

  useSubject(openConfirmDialog$, params => {
    setState({
      open: true,
      title: params.title,
      description: params.description || '',
      okText: params.okText || '',
      cancelText: params.cancelText || ''
    })
    paramsRef.current = {
      onCancel: params.onCancel,
      onConfirm: params.onConfirm,
      footer: params.footer,
      onClose: params.onClose
    }
    window.addEventListener('keydown', enter)
  })
  return (
    <Dialog
      open={state.open}
      onClose={close}
    >
      <div className={'w-[260px] px-4 py-6 flex flex-col items-center text-center'}>
        <img src={logo} alt="" className={'w-12 h-12'}/>
        <div className={'font-semibold mt-4 text-sm dark:text-gray-200'}>{state.title}</div>
        {state.description &&
          <div className={'text-gray-500 mt-2 text-xs dark:text-gray-400'}>{state.description}</div>
        }
        <Button
          type={'primary'}
          block={true}
          className={'mb-3 mt-4'}
          loading={state.loading}
          onClick={confirm}
        >
          {state.okText || 'Ok'}
        </Button>
        <Button block={true} onClick={() => {
          paramsRef.current.onCancel?.()
          close()
        }}>{state.cancelText || 'Cancel'}</Button>
        {paramsRef.current.footer}
      </div>
    </Dialog>
  )
})
