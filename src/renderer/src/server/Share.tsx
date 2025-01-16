import { observer } from 'mobx-react-lite'
import { useLocalState } from '../hooks/useLocalState'
import { IPlanet } from '../icons/IPlanet'
import { PbManage } from './Manage'
import { CreateBook } from './Create'

export const Share = observer(() => {
  const [state, setState] = useLocalState({
    open: false
  })
  return (
    <>
      <div
        onClick={() => setState({open: true})}
        className={
          'flex drag-none items-center justify-center w-[26px] h-[26px] rounded dark:hover:bg-gray-200/10 hover:bg-gray-200/60 cursor-pointer duration-200'
        }
      >
        <IPlanet className={'text-lg'}/>
      </div>
      <PbManage
        open={state.open}
        onClose={() => setState({open: false})}
      />
      <CreateBook/>
    </>
  )
})
