import {observer} from 'mobx-react-lite'
import {MainApi} from '../../../api/main'
import {treeStore} from '../../../store/tree'
import {FolderOpenOutlined} from '@ant-design/icons'
import {configStore} from '../../../store/config'
export const TreeEmpty = observer(() => {
  return (
    <div className={'h-full flex justify-center items-center text-gray-400'}>
      <div className={'text-center text-sm space-y-2'}>
        <div>
          {configStore.isZh ? '目录为空' : 'The directory is empty'}
        </div>
        <div
          className={'cursor-pointer text-sky-500 hover:text-sky-600 duration-200'}
          onClick={() => {
            MainApi.selectFolder().then(res => {
              if (!res.canceled && res.filePaths[0]) {
                treeStore.openFolder(res.filePaths[0])
              }
            })
          }}
        >
          <FolderOpenOutlined/>
          <span className={'ml-1'}>
            {configStore.isZh ? '打开文件夹' : 'Open folder'}
        </span>
        </div>
      </div>
    </div>
  )
})
