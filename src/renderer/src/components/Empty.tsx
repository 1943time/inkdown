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
import logo from '../../public/logo.svg'
export const Empty = observer(() => {
  return (
    <div className={'flex justify-center items-center h-[calc(100vh_-_40px)]'}>
      <div className={'flex-col space-y-6 text-sky-600 relative -top-12'}>
        <div className={'text-lg dark:text-gray-400 text-gray-600 flex items-center'}>
          <img src={logo} alt="" className={'w-5 h-5 mr-2'}/>
          Bluestone
        </div>
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
                {configStore.isZh ? '打开文件或文件夹' : 'Open file or folder'}
              </span>
            </div>
          </>
      </div>
    </div>
  )
})
