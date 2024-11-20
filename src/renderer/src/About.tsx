import {useSetState} from 'react-use'
import {useEffect} from 'react'
import icon from '../../../resources/icon.png?asset'
import { Modal } from 'antd'
import { useCoreContext } from './store/core'
import { useTranslation } from 'react-i18next'
export function About() {
  const core = useCoreContext()
  const {t} = useTranslation()
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
  return (
    <Modal
      onCancel={() => {
        setState({ open: false })
      }}
      title={null}
      open={state.open}
      footer={null}
      width={300}
    >
      <div className={'flex flex-col justify-center items-center pt-5 pb-2'}>
        <img src={icon} alt="" className={'w-10 h-10'} />
        <div className={'mt-2 text-sm text-white font-medium'}>{'Inkdown'}</div>
        <div className={'flex items-center mt-1'}>
          <div className={'text-xs'}>
            {t('version')} {state.version}
          </div>
        </div>
        <div className={'mt-4 text-xs dark:text-gray-400'}>Copyright © 2024 Inkdown</div>
      </div>
    </Modal>
  )
}
