import { Button } from 'antd'
import { Dialog } from './Dialog'
import { ReactNode, useCallback, useRef } from 'react'
import isHotkey from 'is-hotkey'
import { useGetSetState } from 'react-use'
import { useSubject } from '@/hooks/common'
import { useStore } from '@/store/store'
export function ConfirmDialog() {
  const store = useStore()
  const [state, setState] = useGetSetState({
    open: false,
    title: '',
    loading: false,
    okType: 'danger' as 'danger' | 'primary',
    okText: '',
    cancelText: '',
    width: 260,
    hideCancelButton: false,
    allowClose: true
  })
  const paramsRef = useRef<{
    onCancel?: () => void
    onConfirm?: () => void | Promise<any>
    footer?: ReactNode
    description?: ReactNode
    onClose?: () => void
  }>({})

  const closeTimer = useRef(0)

  const confirm = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    const res = paramsRef.current.onConfirm?.()
    if (res) {
      setState({ loading: true })
      await res.finally(() => setState({ loading: false }))
    }
    close()
  }, [])

  const enter = useCallback((e: KeyboardEvent) => {
    if (isHotkey('enter', e)) {
      e.stopPropagation()
      confirm()
    }
  }, [])

  const close = useCallback(() => {
    paramsRef.current.onClose?.()
    window.removeEventListener('keydown', enter)
    setState({ open: false })
    closeTimer.current = window.setTimeout(() => {
      setState({
        title: '',
        loading: false,
        okText: '',
        cancelText: '',
        hideCancelButton: false,
        allowClose: true
      })
      paramsRef.current = {}
    }, 230)
  }, [])

  useSubject(store.note.openConfirmDialog$, (params) => {
    clearTimeout(closeTimer.current)
    setState({
      open: true,
      title: params.title,
      okText: params.okText || '',
      okType: params.okType,
      width: params.width || 260,
      cancelText: params.cancelText || '',
      hideCancelButton: params.hideCancelButton || false,
      allowClose: typeof params.allowClose === 'boolean' ? params.allowClose : true
    })
    paramsRef.current = {
      onCancel: params.onCancel,
      onConfirm: params.onConfirm,
      description: params.description,
      footer: params.footer,
      onClose: params.onClose
    }
    window.addEventListener('keydown', enter)
  })
  return (
    <Dialog open={state().open} manualClose={!state().allowClose} onClose={close}>
      <div className={'w-[260px] px-4 py-6 flex flex-col items-center text-center'}>
        <div className={'font-semibold text-sm dark:text-gray-200'}>{state().title}</div>
        {paramsRef.current?.description && (
          <div className={'text-black/80 mt-2 text-[13px] dark:text-white/80 w-full break-words'}>
            {paramsRef.current.description}
          </div>
        )}
        <Button
          block={true}
          danger={!state().okType || state().okType === 'danger'}
          className={'mt-5'}
          type={state().okType === 'primary' ? 'primary' : undefined}
          loading={state().loading}
          onClick={confirm}
        >
          {state().okText || 'Ok'}
        </Button>
        {}
        {!state().hideCancelButton && (
          <Button
            block={true}
            className={'mt-3'}
            onClick={(e) => {
              e.stopPropagation()
              paramsRef.current.onCancel?.()
              close()
            }}
          >
            {state().cancelText || 'Cancel'}
          </Button>
        )}
        {paramsRef.current.footer}
      </div>
    </Dialog>
  )
}
