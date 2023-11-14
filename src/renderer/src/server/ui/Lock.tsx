import {observer} from 'mobx-react-lite'
import {message$} from '../../utils'
import {Input, Popconfirm} from 'antd'
import {ReactNode} from 'react'
import {useLocalState} from '../../hooks/useLocalState'
import {shareStore} from '../store'
import {IBook, IDoc} from '../model'

export const CancelLock = observer((props: {
  doc?: IDoc
  book?: IBook
  onSuccess: () => void
  children: ReactNode
}) => {
  return (
    <Popconfirm
      title={'Note'}
      description={'Confirm to cancel password access'}
      onConfirm={() => {
        return shareStore.api.unlock({
          docId: props.doc?.id,
          bookId: props.book?.id
        }).then(() => {
          message$.next({
            type: 'info',
            content: 'Password access is canceled'
          })
          props.onSuccess()
        })
      }}
    >
      {props.children}
    </Popconfirm>
  )
})

export const Lock = observer((props: {
  doc?: IDoc
  book?: IBook
  onSuccess: () => void
  children: ReactNode
}) => {
  const [state, setState] = useLocalState({
    password: ''
  })
  return (
    <Popconfirm
      title={<span
        className={'text-[13px]'}>Enter password to enable password access</span>}
      description={(
        <Input
          className={'w-full'} size={'small'} placeholder={'Enter password'}
          value={state.password}
          onChange={e => setState({password: e.target.value})}
        />
      )}
      onOpenChange={open => {
        if (open) {
          setState({password: ''})
        }
      }}
      placement={'bottom'}
      onConfirm={() => {
        if (!state.password) {
          message$.next({
            type: 'info',
            content: 'Please enter access password'
          })
          return Promise.reject()
        } else {
          return shareStore.api.encrypt({
            password: state.password,
            docId: props.doc?.id,
            bookId: props.book?.id
          }).then(() => {
            message$.next({
              type: 'info',
              content: 'Password access is turned on'
            })
            props.onSuccess()
          })
        }
      }}
      okText="Confirm"
      cancelText="Cancel"
    >
      {props.children}
    </Popconfirm>
  )
})
