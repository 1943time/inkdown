import {observer} from 'mobx-react-lite'
import {Button} from 'antd'
import {configStore} from '../../store/config'

export const NotLogged = observer((props: {
  onOpen: () => void
}) => {
  return (
    <>
      <div className={'text-center text-[13px] mt-3 text-gray-500'}>
        {configStore.zh ? (
          <span>
            如果您有自己的服务器，可以通过安装Bluestone的服务程序在
            <br />
            5分钟内建立自己的web服务。
            <br />
            它可以帮助你一键分享Markdown文档或文件夹，并且完全自动管理相关依赖 如：图片等{' '}
            <a
              className={'link mx-0.5'}
              href={
                'https://doc.inkdown.me/book/%E9%9D%92%E7%9F%B3%E4%BD%BF%E7%94%A8%E6%96%87%E6%A1%A3/inkdown#%E5%88%86%E4%BA%AB%E6%9C%8D%E5%8A%A1'
              }
              target={'_blank'}
            >
              指南
            </a>
            。
          </span>
        ) : (
          <span>
            If you have your own server, you can set up your own web service in 5 minutes by
            installing a simple service program.
            <br />
            It can share your markdown documents or folders with one click. And fully automated
            management of related dependencies such as images.{' '}
            <a
              className={'link mx-0.5'}
              href={'https://doc.inkdown.me/book/inkdown/inkdown#sharing-service'}
              target={'_blank'}
            >
              guide
            </a>
            for details.
          </span>
        )}
      </div>
      <Button block={true} className={'mt-4'} onClick={props.onOpen}>
        Set service parameters
      </Button>
    </>
  )
})
