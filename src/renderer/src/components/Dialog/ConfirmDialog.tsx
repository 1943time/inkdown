import {observer} from 'mobx-react-lite'
import {Button} from 'antd'
import {Dialog} from './Dialog'
import logo from '../../logo.svg'
import {createElement, ReactNode, useCallback, useRef} from 'react'
import {Subject} from 'rxjs'
import {useLocalState} from '../../hooks/useLocalState'
import {useSubject} from '../../hooks/subscribe'
import isHotkey from 'is-hotkey'

export const openConfirmDialog$ = new Subject<{
  onClose?: () => void
  title: string
  okType?: 'primary'
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
    okType: undefined as undefined | 'primary',
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
      cancelText: params.cancelText || '',
      okType: params.okType || undefined
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
      <div className={'w-[260px] px-5 py-6 flex flex-col items-center text-center'}>
        <div className={'font-semibold text-sm dark:text-gray-200'}>{state.title}</div>
        {state.description &&
          <div className={'dark:text-white/80 text-black/80 mt-3 text-[13px]'}>{state.description}</div>
        }
        <Button
          block={true}
          danger={state.okType ? undefined : true}
          className={'mt-5 mb-3'}
          loading={state.loading}
          type={state.okType}
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
