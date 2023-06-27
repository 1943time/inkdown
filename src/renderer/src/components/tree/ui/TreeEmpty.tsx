import {observer} from 'mobx-react-lite'
import {MainApi} from '../../../api/main'
import {treeStore} from '../../../store/tree'
import {FolderOpenOutlined} from '@ant-design/icons'
export const TreeEmpty = observer(() => {
  return (
    <div className={'h-full flex justify-center items-center text-gray-400'}>
      <div className={'text-center text-sm space-y-2'}>
        <div>
          目录为空
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
          打开文件夹
        </span>
        </div>
      </div>
    </div>
  )
})
