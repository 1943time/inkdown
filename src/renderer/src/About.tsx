import {CloseOutlined, GithubOutlined} from '@ant-design/icons'
import {useSetState} from 'react-use'
import {useEffect} from 'react'
import icon from '../../../resources/icon.png?asset'
import {configStore} from './store/config'
export function About() {
  const [state, setState] = useSetState({
    version: '',
    open: false
  })
  useEffect(() => {
    window.electron.ipcRenderer.on('open-about', () => {
      window.electron.ipcRenderer.invoke('get-version').then(res => {
        setState({open: true, version: res})
      })
    })
  }, [])
  if (!state.open) return null
  return (
    <div
      className={'w-screen h-screen flex justify-center items-center z-[2000] fixed left-0 top-0 dark:bg-black/30 bg-black/10'}
      onClick={() => {setState({open: false})}}
    >
      <div
        className={`modal-panel text-gray-600 dark:text-gray-400
        w-[300px] h-[200px] flex flex-col justify-center py-5 items-center relative`}
        onClick={e => e.stopPropagation()}
      >
        <div
          className={'text-sm absolute right-2 top-2 px-1 py-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 duration-200'}
          onClick={() => {setState({open: false})}}
        >
          <CloseOutlined />
        </div>
        <img src={icon} alt="" className={'w-14 h-14'}/>
        <div className={'mt-4 text-sm'}>{'Bluestone'}</div>
        <div className={'flex items-center mt-3'}>
          <div className={'flex items-center text-xs mr-3'}>
            <GithubOutlined className={'text-base'} />
            <a
              className={'text-indigo-500 duration-200 hover:text-indigo-600 ml-1'}
              target={'_blank'}
              href={'https://github.com/1943time/bluestone'}
            >
              1943time
            </a>
          </div>
          <div className={'text-xs'}>{configStore.zh ? '版本' : 'version'} {state.version}</div>
        </div>
      </div>
    </div>
  )
}
