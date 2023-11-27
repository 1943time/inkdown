import {observer} from 'mobx-react-lite'
import {Button} from 'antd'
import {useLocalState} from '../../hooks/useLocalState'
import {ServiceSet} from './ServiceSet'
import React, {useCallback} from 'react'
import {MainApi} from '../../api/main'
import {app, shell} from 'electron'

export const NotLogged = observer((props: {
  onOpen: () => void
}) => {
  const openLink = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    const local = await MainApi.getLocal()
    if (local === 'zh-CN') {
      window.open(`https://doc.bluemd.me/book/zh-docs`)
    } else {
      window.open(`https://doc.bluemd.me/book/docs`)
    }
  }, [])
  return (
    <>
      <div className={'text-center text-[13px] mt-3 text-gray-500'}>
        If you have your own server, you can set up your own web service in 5 minutes by installing a simple service program.<br/>
        It can share your markdown documents or folders with one click. <a className={'link mx-0.5'} onClick={openLink} target={'_blank'}>guide</a>for details.
      </div>
      <Button
        block={true} className={'mt-4'}
        onClick={props.onOpen}
      >
        Set service parameters
      </Button>
    </>
  )
})
