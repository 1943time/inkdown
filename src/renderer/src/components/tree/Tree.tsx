import {observer} from 'mobx-react-lite'
import {treeStore} from '../../store/tree'
import {TreeTop} from './ui/TreeTop'
import {TreeEmpty} from './ui/TreeEmpty'
import {TreeRender} from './ui/TreeRender'
import {FullSearch} from '../FullSearch'

export const Tree = observer(() => {
  return (
    <div className={'relative z-[60]'}>
      <TreeTop/>
      <div
        className={'flex-shrink-0 b1 tree-bg h-full border-r pt-[39px] duration-200 overflow-hidden'}
        style={{width: treeStore.fold ? 0 : treeStore.width}}
      >
        <div style={{width: treeStore.width}} className={'h-full border-t b1'}>
          <div className={`h-full overflow-y-auto ${treeStore.treeTab === 'folder' ? '' : 'hidden'}`}>
            {!!treeStore.root ?
              <TreeRender/> :
              <TreeEmpty/>
            }
          </div>
          <div className={`h-full ${treeStore.treeTab === 'search' ? '' : 'hidden'}`}>
            <FullSearch/>
          </div>
        </div>
      </div>
    </div>
  )
})
