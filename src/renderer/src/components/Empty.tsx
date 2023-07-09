import {observer} from 'mobx-react-lite'
import {
  CloseCircleOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOpenOutlined
} from '@ant-design/icons'
import {MainApi} from '../api/main'
import {configStore} from '../store/config'

export const Empty = observer(() => {
  return (
    <div className={'flex justify-center items-center h-[calc(100vh_-_40px)]'}>
      <div className={'flex-col space-y-6 text-sky-600'}>
        <div className={'text-lg text-gray-500'}>
          {configStore.isZh ? '没有打开的文件' : 'No open files'}
        </div>
        <div
          className={'cursor-default hover:text-sky-400 duration-200'}
          onClick={() => {
            MainApi.sendToSelf('create')
          }}
        >
          <FileAddOutlined/>
          <span className={'ml-2'}>
            {configStore.isZh ? '创建Markdown文件' : 'Create a Markdown file'}
          </span>
        </div>
        {/*{!treeStore.root ?*/}
          <>
            <div
              className={'cursor-default hover:text-sky-400 duration-200'}
              onClick={() => {
                MainApi.sendToSelf('open')
              }}
            >
              <FolderOpenOutlined/>
              <span className={'ml-2'}>
                {configStore.isZh ? '打开' : 'Open'}
              </span>
            </div>
          </>
          {/*<>*/}
          {/*  <div className={'cursor-default hover:text-sky-400 duration-200'}>*/}
          {/*    <FileSearchOutlined/>*/}
          {/*    <span className={'ml-2'}>*/}
          {/*      快速选择*/}
          {/*    </span>*/}
          {/*  </div>*/}
          {/*  <div className={'cursor-default hover:text-sky-400 duration-200'}>*/}
          {/*    <CloseCircleOutlined />*/}
          {/*    <span className={'ml-2'}>*/}
          {/*      关闭Tab*/}
          {/*    </span>*/}
          {/*  </div>*/}
          {/*</>*/}
        {/*}*/}

      </div>
    </div>
  )
})
