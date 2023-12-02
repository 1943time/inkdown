import {observer} from 'mobx-react-lite'
import {Button} from 'antd'
import {useLocalState} from '../../hooks/useLocalState'
import {ServiceSet} from './ServiceSet'
import React, {useCallback} from 'react'
import {MainApi} from '../../api/main'
import {app, shell} from 'electron'
import {configStore} from '../../store/config'

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
        {configStore.zh ? (
          <span>
            如果您有自己的服务器，可以通过安装青石的服务程序在<br/>5分钟内建立自己的web服务。<br/>
            他可以帮助你一键分享Markdown文档或文件夹 <a className={'link mx-0.5'} href={'https://doc.bluemd.me/book/zh-docs'} target={'_blank'}>指南</a>。
          </span>
        ) : (
          <span>
            If you have your own server, you can set up your own web service in 5 minutes by installing a simple service program.<br/>
            It can share your markdown documents or folders with one click. <a className={'link mx-0.5'} href={'https://doc.bluemd.me/book/docs'} target={'_blank'}>guide</a>for details.
          </span>
        )}
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
