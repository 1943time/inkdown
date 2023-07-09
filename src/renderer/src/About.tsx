import {GithubOutlined} from '@ant-design/icons'
import {useSetState} from 'react-use'
import {useEffect} from 'react'
import icon from '../../../resources/icon.png?asset'
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
      className={'w-screen h-screen flex justify-center items-center z-[2000] fixed left-0 top-0'}
      onClick={() => {setState({open: false})}}
    >
      <div
        className={`bg-white rounded-lg dark:text-gray-400 text-gray-600 border-gray-200
        w-[300px] h-[200px] border dark:border-gray-200/10 dark:bg-zinc-800 flex flex-col justify-center py-5 items-center relative`}
        onClick={e => e.stopPropagation()}
      >
        <img src={icon} alt="" className={'w-14 h-14'}/>
        <div className={'mt-4 text-sm'}>bluestone</div>
        <div className={'flex items-center mt-3'}>
          <div className={'flex items-center text-xs mr-3'}>
            <GithubOutlined className={'text-base'} />
            <a
              className={'text-sky-500 duration-200 hover:text-sky-600 ml-1'}
              target={'_blank'}
              href={'https://github.com/1943time/bluestone'}
            >
              1943time
            </a>
          </div>
          <div className={'text-xs'}>version {state.version}</div>
        </div>
      </div>
    </div>
  )
}
