import {observer} from 'mobx-react-lite'
import {Button} from 'antd'
import {useLocalState} from '../../hooks/useLocalState'
import {ServiceSet} from './ServiceSet'
import {useCallback} from 'react'

export const NotLogged = observer((props: {
  onSetupVisible: (visible: boolean) => void
}) => {
  const [state, setState] = useLocalState({
    openSetting: false
  })
  return (
    <>
      <div className={'text-center text-[13px] mt-3 text-gray-500'}>
        If you have your own server, you can set up your own web service in 5 minutes by installing a simple service program.<br/>
        It helps you share markdown docs, folders and backup files (in development). <a className={'link mx-0.5'} href={'https://pb.bluemd.me/official/book/docs/share'} target={'_blank'}>guide</a>for details.
      </div>
      <Button
        block={true} className={'mt-4'}
        onClick={() => {
          setState({openSetting: true})
          props.onSetupVisible(true)
        }}
      >
        Set service parameters
      </Button>
      <ServiceSet
        open={state.openSetting}
        onClose={() => {
          setState({openSetting: false})
          props.onSetupVisible(false)
        }}
      />
    </>
  )
})
