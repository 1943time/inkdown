import { Empty, Popconfirm, Popover } from 'antd'
import { Fragment, useCallback } from 'react'
import { IDoc } from 'types/model'
import { useGetSetState } from 'react-use'
import { useStore } from '@/store/store'
import { ChevronRight, FileText, FolderClosed, TicketSlash, Trash2, Undo2 } from 'lucide-react'
import { observer } from 'mobx-react-lite'

interface DocTree extends Omit<IDoc, 'children'> {
  children?: DocTree[]
  expand?: boolean
}
export const Trash = observer(() => {
  const store = useStore()
  const [state, setState] = useGetSetState({
    removeDocs: [] as DocTree[],
    open: false,
    loading: false,
    expands: [] as string[]
  })

  const getTree = useCallback(async (docs: DocTree[], docMap: Map<string, DocTree>) => {
    for (const d of docs) {
      docMap.set(d.id, d)
      if (d.folder) {
        const children = await store.model.getDocsByParentId(d.id)
        d.children = await getTree(children as DocTree[], docMap)
      }
    }
    return docs
  }, [])

  const getDocs = useCallback(() => {
    store.model.getDocs(store.note.state.currentSpace!.id, true).then(async (res) => {
      const docs = res.sort((a, b) => (a.updated! < b.updated! ? 1 : -1))
      const map = new Map(docs.map((d) => [d.id, d as DocTree]))
      const tree = await getTree(
        docs.filter((d) => !d.parentId || !map.get(d.parentId)) as DocTree[],
        map
      )
      setState({
        removeDocs: tree
      })
    })
  }, [])

  const getAllIds = useCallback(async (docs: DocTree[]) => {
    const ids: string[] = []
    for (let d of docs) {
      ids.push(d.id)
      if (d.folder) {
        ids.push(...(await store.model.getDocsByParentId(d.id)).map((d) => d.id))
      }
    }
    return ids
  }, [])

  const clearDocs = useCallback(async () => {
    if (state().removeDocs) {
      try {
        setState({ loading: true })
        const ids = await getAllIds(state().removeDocs)
        if (!ids.length) return
        await store.model.clearDocs(store.note.state.currentSpace!.id, ids)
        setState({ removeDocs: [] })
      } catch (e) {
        console.error('e')
        store.msg.warning('Deletion failed, please try again later')
      } finally {
        setState({ loading: false })
      }
    }
  }, [])

  const doDelete = useCallback(async (ids: string[]) => {
    await store.model.clearDocs(store.note.state.currentSpace!.id, ids)
  }, [])

  const deleteDoc = useCallback(async (doc: IDoc) => {
    const ids = await getAllIds([doc])
    await doDelete(ids)
    setState({
      removeDocs: state().removeDocs.filter((d) => d.id !== doc.id)
    })
  }, [])
  const restore = useCallback(async (doc: IDoc, ipc = false) => {
    let node: IDoc = {
      ...doc,
      children: []
    }
    const items: IDoc[] = [node]
    let restoreIds: string[] = []
    if (!doc.folder) {
      restoreIds.push(doc.id)
    } else {
      const restoreChildren = async (node: IDoc) => {
        const items: IDoc[] = []
        const docs = await store.model.getDocsByParentId(node.id)
        for (let d of docs) {
          const item: IDoc = {
            ...d,
            children: []
          }
          if (d.folder) {
            const children = await restoreChildren(item)
            item.children = children
          }
          items.push(item)
          restoreIds.push(d.id)
        }
        return items
      }
      restoreIds.push(doc.id)
      const children = await restoreChildren(node)
      node.children = children
    }
    const now = Date.now()
    await store.model.updateDocs(
      restoreIds.map((id) => ({
        id,
        deleted: false,
        updated: now
      }))
    )
    store.note.setState((draft) => {
      items.forEach((item) => {
        draft.nodes[item.id] = item
      })
      draft.nodes[doc.parentId || 'root'].children?.push(node)
      draft.nodes[doc.parentId || 'root'].children = draft.nodes[
        doc.parentId || 'root'
      ].children!.sort((a, b) => (a.sort! > b.sort! ? 1 : -1))
    })
    const removeDocs = state().removeDocs.filter((d) => d.id !== doc.id)
    setState({
      removeDocs: removeDocs
    })
    if (!node.folder) {
      store.note.openDoc(node, true)
    }
    // if (!ipc) {
    //   core.ipc.sendMessage({
    //     type: 'restoreDoc',
    //     data: { cid: doc.cid, spaceCid: doc.spaceId }
    //   })
    //   await core.service
    //     .bulkDocs(
    //       restoreIds.map((c) => {
    //         return {
    //           cid: c,
    //           updated: now,
    //           deleted: 0
    //         }
    //       }),
    //       core.tree.root.cid,
    //       'update'
    //     )
    //     .then(() => {
    //       db.doc.where('cid').anyOf(restoreIds).modify({
    //         synced: 1
    //       })
    //     })
    // }
  }, [])
  return (
    <Popover
      trigger={['click']}
      arrow={false}
      open={state().open}
      onOpenChange={(v) => {
        setState({
          open: v
        })
      }}
      align={{
        offset: [10, 2]
      }}
      overlayInnerStyle={{ padding: 0 }}
      content={
        <div className={'relative h-[300px] pt-2 pb-8 flex flex-col'}>
          {!!state().removeDocs.length && (
            <Popconfirm
              title={true ? '提示' : 'Note'}
              description={
                true
                  ? '是否确定要永久删除所有文档？'
                  : 'Are you sure you want to permanently empty the Trash?'
              }
              okButtonProps={{ danger: true, type: 'default' }}
              overlayStyle={{ width: 260 }}
              onConfirm={clearDocs}
              disabled={state().loading}
            >
              <div
                className={
                  'ml-2 p-1 right-1 bottom-1 absolute rounded hover:bg-gray-100 cursor-pointer text-gray-600 dark:text-gray-300 dark:hover:bg-gray-100/10'
                }
              >
                <TicketSlash className={'text-lg'} />
              </div>
            </Popconfirm>
          )}
          <div
            className={
              'w-[380px] overflow-y-auto px-2 pt-2 text-gray-600 dark:text-gray-300 flex-1'
            }
          >
            {!state().removeDocs.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            <RenderItem
              docs={state().removeDocs}
              top={true}
              expands={state().expands}
              onExpand={(id) => {
                setState({
                  expands: state().expands.includes(id)
                    ? state().expands.filter((i) => i !== id)
                    : [...state().expands, id]
                })
              }}
              onRestore={restore}
              onDelete={deleteDoc}
            />
          </div>
        </div>
      }
    >
      <div
        className={
          'py-1 px-3 p-0.5 border-t border-r-gray-200 dark:text-white/80 text-black/70 dark:border-gray-100/10'
        }
      >
        <div
          onClick={() => {
            setState({ open: true })
            getDocs()
          }}
          className={
            'flex items-center dark:hover:bg-white/5 hover:bg-black/5 rounded-lg py-1.5 px-2 cursor-pointer duration-200'
          }
        >
          <Trash2 size={16} />
          <span className={'ml-2 text-[13px] leading-5 select-none'}>
            {true ? '废纸篓' : 'Trash'}
          </span>
        </div>
      </div>
    </Popover>
  )
})

const RenderItem = observer(
  (props: {
    docs: DocTree[]
    onRestore?: (doc: DocTree) => void
    onDelete?: (doc: DocTree) => void
    top: boolean
    expands: string[]
    onExpand: (id: string) => void
  }) => {
    return (
      <>
        {props.docs.map((d) => (
          <Fragment key={d.id}>
            <div
              onClick={(e) => {
                e.stopPropagation()
                if (d.folder) {
                  props.onExpand(d.id)
                }
              }}
              className={
                'flex select-none items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-100/10 rounded h-6 px-2'
              }
            >
              <div className={'flex items-center text-sm max-w-[236px]'}>
                {d.folder ? (
                  <>
                    <ChevronRight
                      className={`w-[11px] h-[11px] mr-1 dark:text-gray-500 text-gray-400 duration-200 ${
                        d.folder && props.expands.includes(d.id) ? 'rotate-90' : ''
                      }`}
                    />
                    <FolderClosed />
                  </>
                ) : (
                  <FileText />
                )}
                <span className={'ml-1 flex-1 truncate'}>{d.name}</span>
              </div>
              {props.top && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={'flex items-center text-base space-x-0.5 flex-shrink-0'}
                >
                  <div
                    onClick={(e) => {
                      props.onRestore?.(d)
                    }}
                    className={
                      'p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-100/10 cursor-pointer'
                    }
                  >
                    <Undo2 />
                  </div>
                  <Popconfirm
                    title={'Note'}
                    description="Are you sure you want to delete this doc permanently?"
                    okText="Yes"
                    okButtonProps={{ danger: true, type: 'default' }}
                    styles={{
                      body: {
                        padding: 0
                      }
                    }}
                    onConfirm={(e) => {
                      return props.onDelete?.(d)
                    }}
                    cancelText="No"
                  >
                    <div
                      className={
                        'p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-100/10 cursor-pointer'
                      }
                    >
                      <Trash2 size={16} />
                    </div>
                  </Popconfirm>
                </div>
              )}
            </div>
            {!!d.children?.length && props.expands.includes(d.id) && (
              <div className={'pl-5'}>
                <RenderItem
                  docs={d.children}
                  top={false}
                  expands={props.expands}
                  onExpand={props.onExpand}
                />
              </div>
            )}
          </Fragment>
        ))}
      </>
    )
  }
)
