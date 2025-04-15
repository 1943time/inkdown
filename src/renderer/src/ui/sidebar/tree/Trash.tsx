import { observer } from 'mobx-react-lite'
import { Empty, Popconfirm, Popover } from 'antd'
import { Fragment, useCallback } from 'react'
import { runInAction } from 'mobx'
import { db, IDoc } from '../../store/db.ts'
import INote from '../../icons/INote.tsx'
import { useLocalState } from '../../hooks/useLocalState.ts'
import { IFileItem } from '../../types'
import ArrowRight from '../../icons/ArrowRight.tsx'
import { useCoreContext } from '../../utils/env.ts'
import { IDelete } from '../../icons/IDelete.tsx'
import { IClaer } from '../../icons/IClear.tsx'
import { IRestore } from '../../icons/IRestore.tsx'
import { openConfirmDialog$ } from '../dialog/ConfirmDialog.tsx'
import { useSubject } from '../../hooks/subscribe.ts'
import { IFolder } from '../../icons/IFolder.tsx'

export const Trash = observer(() => {
  const core = useCoreContext()
  const [state, setState] = useLocalState({
    removeDocs: [] as IDoc[],
    open: false,
    loading: false
  })

  const getTree = useCallback(async (docs: IDoc[], docMap: Map<string, IDoc>) => {
    for (const d of docs) {
      docMap.set(d.cid, d)
      if (d.folder) {
        d.children = await getTree(
          core.node.sortNodes(await db.doc.where('parentCid').equals(d.cid).toArray()),
          docMap
        )
      }
    }
    return docs
  }, [])

  const getDocs = useCallback(() => {
    db.doc
      .where('spaceId')
      .equals(core.tree.root.cid)
      .and((x) => x.deleted === 1)
      .toArray()
      .then(async (res) => {
        const docs = res.sort((a, b) => (a.updated! < b.updated! ? 1 : -1))
        const map = new Map(docs.map((d) => [d.cid, d]))
        const tree = await getTree(docs.filter(d => !d.parentCid || !map.get(d.parentCid)), map)
        setState({
          removeDocs: tree
        })
      })
  }, [])

  const getAllIds = useCallback(async (docs: IDoc[]) => {
    const ids: string[] = []
    for (let d of docs) {
      ids.push(d.cid)
      if (d.folder) {
        ids.push(...(await db.getChildrenIds(d)))
      }
    }
    return ids
  }, [])

  const clearDocs = useCallback(async () => {
    if (state.removeDocs) {
      try {
        setState({ loading: true })
        const ids = await getAllIds(state.removeDocs)
        if (!ids.length) return
        const shareRecord = await core.api.checkSharedFile.mutate({docs: ids})
        if (shareRecord.shared) {
          openConfirmDialog$.next({
            title: 'Note',
            description:
              'The deleted documents contain published documents. The published documents will be inaccessible after deletion. Do you want to continue?',
            okText: 'Delete',
            onConfirm: async () => {
              await core.local.deleteDocByIds(
                state.removeDocs.map((r) => r.cid),
                core.tree.root.cid
              )
              await core.api.deleteDocs.mutate({
                docs: ids
              })
              await db.clearDocs(Array.from(ids))
              setState({ removeDocs: [] })
            }
          })
        } else {
          await core.local.deleteDocByIds(
            state.removeDocs.map((r) => r.cid),
            core.tree.root.cid
          )
          await core.api.deleteDocs.mutate({
            docs: ids
          })
          await db.clearDocs(Array.from(ids))
          setState({ removeDocs: [] })
        }
      } catch (e) {
        console.error('e')
        core.message.warning('Deletion failed, please try again later')
      } finally {
        setState({ loading: false })
      }
    }
  }, [])

  const doDelete = useCallback(async (ids: string[]) => {
    await db.clearDocs(ids)
    await core.api.deleteDocs.mutate({
      docs: ids
    })
  }, [])

  const deleteDoc = useCallback(async (doc: IDoc) => {
    const ids = [doc.cid]
    if (doc.folder) {
      ids.push(...(await db.getChildrenIds(doc)))
    }
    const shareRecord = await core.api.checkSharedFile.mutate({docs: ids})
    if (shareRecord.shared) {
      openConfirmDialog$.next({
        title: 'Note',
        description:
          'The deleted documents contain published documents. The published documents will be inaccessible after deletion. Do you want to continue?',
          okText: 'Delete',
          onConfirm: async () => {
            await core.local.deleteDocByIds([doc.cid], core.tree.root.cid)
            await doDelete(ids)
            setState({
              removeDocs: state.removeDocs.filter((d) => d.cid !== doc.cid)
            })
          },
      })
    } else {
      await core.local.deleteDocByIds([doc.cid], core.tree.root.cid)
      await doDelete(ids)
      setState({
        removeDocs: state.removeDocs.filter((d) => d.cid !== doc.cid)
      })
    }
  }, [])
  useSubject(core.ipc.restoreDoc$, data => {
    db.doc.get(data).then(res => {
      if (res) {
        setState({ open: false })
        restore(res, true)
      }
    })
  })
  const restore = useCallback(async (doc: IDoc, ipc = false) => {
    let parent = doc.parentCid ? core.tree.nodeMap.get(doc.parentCid)! : core.tree.root
    let node: IFileItem
    let restoreCids: string[] = []
    if (!doc.folder) {
      node = await core.node.createFileNode(doc, parent)
      restoreCids.push(doc.cid)
    } else {
      const restoreChildren = async (node: IFileItem) => {
        const docs = await db.doc.where('parentCid').equals(node.cid).toArray()
        const items: IFileItem[] = []
        for (let d of docs) {
          const item = await core.node.createFileNode(d, node)
          if (item.folder) {
            const children = await restoreChildren(item)
            runInAction(() => {
              item.children = children
            })
          }
          items.push(item)
          core.tree.nodeMap.set(item.cid, item)
          restoreCids.push(d.cid)
        }
        return core.node.sortNodes(items)
      }
      node = await core.node.createFileNode(doc, parent)
      restoreCids.push(doc.cid)
      const children = await restoreChildren(node)
      runInAction(() => {
        node.children = children
      })
    }
    const now = Date.now()
    await db.doc.where('cid').anyOf(restoreCids).modify({
      deleted: 0,
      updated: now,
      synced: 0
    })
    runInAction(() => {
      core.tree.nodeMap.set(node.cid, node)
      parent.children?.push(node)
      parent.children = core.node.sortNodes(parent.children!)
    })
    const removeDocs = state.removeDocs.filter((d) => d.cid !== doc.cid)
    setState({
      removeDocs: removeDocs
    })
    if (!node.folder) {
      core.tree.openNote(node)
    }
    if (!ipc) {
      core.ipc.sendMessage({
        type: 'restoreDoc',
        data: {cid: doc.cid, spaceCid: doc.spaceId}
      })
      await core.service
        .bulkDocs(
          restoreCids.map((c) => {
            return {
              cid: c,
              updated: now,
              deleted: 0
            }
          }),
          core.tree.root.cid,
          'update'
        )
        .then(() => {
          db.doc.where('cid').anyOf(restoreCids).modify({
            synced: 1
          })
        })
    }
  }, [])
  return (
    <Popover
      trigger={['click']}
      arrow={false}
      open={state.open}
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
          {!!state.removeDocs.length && (
            <Popconfirm
              title={core.config.zh ? '提示' : 'Note'}
              description={
                core.config.zh
                  ? '是否确定要永久删除所有文档？'
                  : 'Are you sure you want to permanently empty the Trash?'
              }
              okButtonProps={{ danger: true, type: 'default' }}
              overlayStyle={{ width: 260 }}
              onConfirm={clearDocs}
              disabled={state.loading}
            >
              <div
                className={
                  'ml-2 p-1 right-1 bottom-1 absolute rounded hover:bg-gray-100 cursor-pointer text-gray-600 dark:text-gray-300 dark:hover:bg-gray-100/10'
                }
              >
                <IClaer className={'text-lg'} />
              </div>
            </Popconfirm>
          )}
          <div
            className={
              'w-[380px] overflow-y-auto px-2 pt-2 text-gray-600 dark:text-gray-300 flex-1'
            }
          >
            {!state.removeDocs.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            <RenderItem
              docs={state.removeDocs}
              top={true}
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
          <IDelete />
          <span className={'ml-2 text-[13px] leading-5 select-none'}>
            {core.config.zh ? '废纸篓' : 'Trash'}
          </span>
        </div>
      </div>
    </Popover>
  )
})

const RenderItem = observer(
  (props: {
    docs: IDoc[]
    onRestore?: (doc: IDoc) => void
    onDelete?: (doc: IDoc) => void
    top: boolean
  }) => {
    return (
      <>
        {props.docs.map((d) => (
          <Fragment key={d.cid}>
            <div
              onClick={(e) => {
                e.stopPropagation()
                if (d.folder) {
                  runInAction(() => (d.expand = !d.expand))
                }
              }}
              className={
                'flex select-none items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-100/10 rounded h-6 px-2'
              }
            >
              <div className={'flex items-center text-sm max-w-[236px]'}>
                {d.folder ? (
                  <>
                    <ArrowRight
                      className={`w-[11px] h-[11px] mr-1 dark:text-gray-500 text-gray-400 duration-200 ${
                        d.folder && d.expand ? 'rotate-90' : ''
                      }`}
                    />
                    <IFolder />
                  </>
                ) : (
                  <INote />
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
                    <IRestore />
                  </div>
                  <Popconfirm
                    title={'Note'}
                    description="Are you sure you want to delete this doc permanently?"
                    okText="Yes"
                    okButtonProps={{ danger: true, type: 'default' }}
                    overlayStyle={{ width: 260 }}
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
                      <IDelete />
                    </div>
                  </Popconfirm>
                </div>
              )}
            </div>
            {!!d.children?.length && d.expand && (
              <div className={'pl-5'}>
                <RenderItem docs={d.children} top={false} />
              </div>
            )}
          </Fragment>
        ))}
      </>
    )
  }
)
