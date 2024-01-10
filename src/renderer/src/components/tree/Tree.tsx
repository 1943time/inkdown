import {observer} from 'mobx-react-lite'
import {treeStore} from '../../store/tree'
import {TreeTop} from './TreeTop'
import {TreeEmpty} from './TreeEmpty'
import {TreeRender} from './TreeRender'
import {FullSearch} from '../FullSearch'
import {useCallback} from 'react'
import {MainApi} from '../../api/main'
import {EBook} from '../../server/ui/Ebook'
import {useLocalState} from '../../hooks/useLocalState'
import {useSubject} from '../../hooks/subscribe'
import {action} from 'mobx'

export const Tree = observer(() => {
  const context = useCallback(() => {
    treeStore.setState({ctxNode: null})
    MainApi.openTreeContextMenu({type: 'rootFolder', filePath: treeStore.root?.filePath})
  }, [])
  const [state, setState] = useLocalState({
    openShareFolder: false,
    defaultSharePath: ''
  })
  useSubject(treeStore.shareFolder$, path => {
    setState({openShareFolder: true, defaultSharePath: path})
  })
  return (
    <div className={'relative z-[60]'}>
      <TreeTop/>
      <div
        className={'flex-shrink-0 b1 tree-bg h-full border-r pt-[39px] duration-200 overflow-hidden width-duration'}
        style={{width: treeStore.fold ? 0 : treeStore.width}}
      >
        <div style={{width: treeStore.width}} className={'h-full border-t b1 relative'}>
          <div
            className={`h-full overflow-y-auto ${treeStore.treeTab === 'folder' ? '' : 'hidden'} pb-10 ${treeStore.dropNode === treeStore.root ? 'bg-sky-500/10' : ''}`}
            onContextMenu={context}
            onClick={action((e) => {
              e.stopPropagation()
              treeStore.selectItem = treeStore.root
            })}
            onDragOver={e => {
              e.preventDefault()
              if (treeStore.dragNode) {
                treeStore.setState({dropNode: treeStore.root})
              }
            }}
            onDrop={e => {
              if (treeStore.dragNode) {
                treeStore.moveNode(treeStore.root)
              } else if (e.dataTransfer.files?.length) {
                treeStore.insertFiles(e.dataTransfer.files, treeStore.root)
              }
            }}
          >
            {!!treeStore.root ?
              <TreeRender/> :
              <TreeEmpty/>
            }
          </div>
          <div className={`h-full ${treeStore.treeTab === 'search' ? '' : 'hidden'}`}>
            <FullSearch/>
          </div>
          {treeStore.treeTab === 'folder' && treeStore.selectItem === treeStore.root &&
            <div className={'absolute z-10 left-[1px] top-0 right-[1px] bottom-0 bg-sky-500/5 pointer-events-none'}/>
          }
        </div>
      </div>
      <EBook
        open={state.openShareFolder}
        defaultRootPath={state.defaultSharePath}
        onClose={() => {
          setState({openShareFolder: false})
        }}
        onSave={book => {}}
      />
    </div>
  )
})
