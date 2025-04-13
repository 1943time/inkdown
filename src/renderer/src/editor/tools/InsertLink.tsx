// import { observer } from 'mobx-react-lite'
// import { useSubject } from '../../hooks/subscribe'
// import { ReactNode, useCallback, useRef } from 'react'
// import { Node, Selection, Text, Transforms } from 'slate'
// import { EditorUtils } from '../utils/editorUtils'
// import { useGetSetState } from 'react-use'
// import { createPortal } from 'react-dom'
// import INote from '../../icons/INote'
// import isHotkey from 'is-hotkey'
// import { runInAction } from 'mobx'
// import { Tooltip } from 'antd'
// import { IFileItem } from '../../types'
// import { useEditorStore } from '../../store/editor'
// import { getNodePath, isLink, parsePath } from '../../utils'
// import { useCoreContext } from '../../utils/env'
// import { IDelete } from '../../icons/IDelete'
// import { IPlanet } from '../../icons/IPlanet'
// import { ISort } from '../../icons/keyboard/ISort'
// import IClose from '../../icons/IClose'
// import { IFolder } from '../../icons/IFolder'

// const width = 370
// export const InsertLink = observer(() => {
//   const core = useCoreContext()
//   const store = useEditorStore()
//   const selRef = useRef<Selection>()
//   const inputRef = useRef<HTMLInputElement>(null)
//   const scrollRef = useRef<HTMLDivElement>(null)
//   const docMap = useRef(new Map<string, IFileItem>())
//   const [state, setState] = useGetSetState({
//     open: false,
//     left: 0,
//     y: 0,
//     mode: 'top',
//     inputKeyword: '',
//     selectDocId: '',
//     index: 0,
//     docs: [] as IFileItem[],
//     filterDocs: [] as IFileItem[],
//     anchors: [] as { item: IFileItem; value: string }[],
//     filterAnchors: [] as { item: IFileItem; value: string }[]
//   })

//   const getAnchors = useCallback((item: IFileItem) => {
//     return (item.schema || [])
//       .filter((e) => e.type === 'head')
//       .map((e) => {
//         let text = Node.string(e)
//         return { item, value: text }
//       })
//   }, [])

//   const setAnchors = useCallback(() => {
//     if (isLink(state().inputKeyword) || !state().selectDocId) return setState({ anchors: [] })
//     const parse = parsePath(state().inputKeyword)
//     if (state().selectDocId === core.tree.openedNote?.cid) {
//       const item = core.tree.openedNote
//       if (item) {
//         const anchors = getAnchors({
//           ...item,
//         })
//         setState({
//           anchors,
//           filterAnchors: parse.hash
//             ? anchors.filter((a) => a.value.includes(parse.hash))
//             : anchors
//         })
//         scrollRef.current?.scrollTo({ top: 0 })
//       } else {
//         setState({ anchors: [], filterAnchors: [] })
//       }
//       return
//     } else {
//       const item = core.tree.nodeMap.get(state().selectDocId)
//       if (item) {
//         const anchors = getAnchors(item)
//         setState({
//           anchors,
//           filterAnchors: parse.hash
//             ? anchors.filter((a) => a.value.includes(parse.hash))
//             : anchors
//         })
//         scrollRef.current?.scrollTo({ top: 0 })
//       } else {
//         setState({ anchors: [], filterAnchors: [] })
//       }
//     }
//   }, [])

//   const prevent = useCallback((e: WheelEvent) => {
//     e.preventDefault()
//   }, [])

//   const keydown = useCallback((e: KeyboardEvent) => {
//     if (isHotkey('esc', e)) {
//       close()
//     }
//     if (isHotkey('tab', e) && !isLink(state().inputKeyword)) {
//       if (state().filterAnchors.length) {
//         const target = state().filterAnchors[state().index]
//         if (target) {
//           e.preventDefault()
//           setState({ inputKeyword: target.item.path + '#' + target.value })
//         }
//       } else {
//         const target = state().filterDocs[state().index]
//         if (target) {
//           e.preventDefault()
//           setState({ inputKeyword: target.path! })
//         }
//       }
//     }
//     if (isHotkey('up', e)) {
//       e.preventDefault()
//       if (
//         (state().filterDocs.length || state().filterAnchors.length) &&
//         state().index > 0
//       ) {
//         setState({
//           index: state().index - 1
//         })
//       }
//     }
//     if (isHotkey('down', e)) {
//       e.preventDefault()
//       if (state().anchors.length) {
//         if (state().index < state().filterAnchors.length - 1) {
//           setState({
//             index: state().index + 1
//           })
//         }
//       } else if (state().index < state().filterDocs.length - 1) {
//         setState({
//           index: state().index + 1
//         })
//       }
//     }
//     if (isHotkey('enter', e)) {
//       e.preventDefault()
//       if (isLink(state().inputKeyword)) {
//         close({url: state().inputKeyword, docId: undefined, hash: undefined})
//       } else {
//         if (state().anchors.length) {
//           const target = state().filterAnchors[state().index]
//           if (target) {
//             close({
//               url: undefined,
//               docId: target.item.cid === core.tree.openedNote?.cid ? undefined : target.item.cid,
//               hash: target.value
//             })
//           } else {
//             close({
//               url: state().inputKeyword,
//               docId: undefined,
//               hash: undefined
//             })
//           }
//         } else {
//           const target = state().filterDocs[state().index]
//           if (target) {
//             close({ url: undefined, docId: target.cid, hash: undefined })
//           } else {
//             close({url: state().inputKeyword, docId: undefined, hash: undefined})
//           }
//         }
//       }
//     }
//     const target = scrollRef.current?.children[state().index] as HTMLDivElement
//     if (target) {
//       const { scrollTop, clientHeight } = scrollRef.current!
//       if (target.offsetTop > scrollTop + clientHeight - 50) {
//         scrollRef.current!.scroll({
//           top: target.offsetTop
//         })
//       }
//       if (target.offsetTop < scrollTop) {
//         scrollRef.current!.scroll({
//           top: target.offsetTop - 150
//         })
//       }
//     }
//   }, [])

//   useSubject(store.openInsertLink$, (sel) => {
//     if (store.domRect) {
//       selRef.current = sel
//       store.container!.parentElement?.addEventListener('wheel', prevent, {
//         passive: false
//       })
//       const mode =
//         window.innerHeight - store.domRect.top - store.domRect.height < 260
//           ? 'bottom'
//           : 'top'
//       let y =
//         mode === 'bottom'
//           ? window.innerHeight - store.domRect.top + 5
//           : store.domRect.top + store.domRect.height + 5
//       let left = store.domRect.x
//       left = left - (width - store.domRect.width) / 2
//       if (left > window.innerWidth - width) left = window.innerWidth - width - 4
//       if (left < 4) left = 4
//       if (left + width > window.innerWidth - 4) {
//         left = window.innerWidth - 4 - width
//       }
//       const {docs, map} = core.tree.docsOrFolders
//       const notes = docs.filter((t) => t !== core.tree.openedNote)
//       docMap.current = map
//       let filterNotes = notes
//       const leaf = EditorUtils.getLink(store.editor)
//       let path = leaf?.url || ''
//       if (leaf?.docId) {
//         const target = core.tree.nodeMap.get(leaf.docId)
//         if (target) {
//           path = core.tree.nodeMap.get(leaf.docId)?.path!
//           filterNotes = [target]
//           setState({selectDocId: leaf.docId})
//         }
//       }
//       if (leaf?.hash) {
//         path += `#${leaf.hash}`
//         if (!leaf.docId) {
//           setState({selectDocId: core.tree.openedNote!.cid})
//         }
//         setState({inputKeyword: path})
//         setAnchors()
//       } else {
//         setState({anchors: []})
//       }
//       if (!path && leaf?.docId) {
//         path = 'not found'
//         filterNotes = []
//       }
//       setState({
//         left,
//         y,
//         mode,
//         open: true,
//         filterDocs: filterNotes,
//         docs: notes,
//         inputKeyword: path
//       })
//       setTimeout(() => {
//         inputRef.current?.focus()
//       }, 16)
//       window.addEventListener('keydown', keydown)
//     }
//   }, [])

//   const close = useCallback((data?: {url?: string, docId?: string, hash?: string} | null) => {
//     store.container!.parentElement?.removeEventListener('wheel', prevent)
//     setState({ open: false })
//     Transforms.select(store.editor, selRef.current!)
//     EditorUtils.focus(store.editor)
//     if (data === null) {
//       Transforms.setNodes(
//         store.editor,
//         { url: undefined, docId: undefined, hash: undefined },
//         { match: Text.isText, split: true }
//       )
//     }
//     if (data) {
//       Transforms.setNodes(
//         store.editor,
//         { ...data },
//         { match: Text.isText, split: true }
//       )
//     }
//     window.removeEventListener('keydown', keydown)
//     runInAction(() => {
//       store.openLinkPanel = false
//     })
//   }, [])
//   if (!state().open) return null
//   return createPortal(
//     <div className={'fixed z-[100] inset-0'} onClick={() => close()}>
//       <div
//         onClick={(e) => e.stopPropagation()}
//         className={'absolute z-30 w-[370px] ctx-panel pt-3 flex flex-col'}
//         style={{
//           left: state().left,
//           top: state().mode === 'top' ? state().y : undefined,
//           bottom: state().mode === 'bottom' ? state().y : undefined
//         }}
//       >
//         <div className={'px-3 flex items-center'}>
//           <input
//             ref={inputRef}
//             value={state().inputKeyword}
//             spellCheck={false}
//             onKeyDown={(e) => {
//               if (e.key === '#') {
//                 if (!state().inputKeyword) {
//                   setState({
//                     selectDocId: core.tree.openedNote?.cid || ''
//                   })
//                 } else {
//                   const p = parsePath(state().inputKeyword)
//                   setState({
//                     selectDocId: docMap.current.get(p.path)?.cid || ''
//                   })
//                 }
//                 setAnchors()
//               }
//               if (
//                 e.key.toLowerCase() === 'backspace' &&
//                 state().anchors.length &&
//                 (e.metaKey ||
//                   e.altKey ||
//                   state().inputKeyword.endsWith('#') ||
//                   !state().inputKeyword.includes('#'))
//               ) {
//                 setState({
//                   anchors: [],
//                   filterAnchors: [],
//                   selectDocId: ''
//                 })
//               }
//             }}
//             onChange={(e) => {
//               const key = e.target.value.toLowerCase()
//               if (state().anchors.length) {
//                 const parse = parsePath(key)
//                 const filterAnchors = state().anchors.filter((d) => {
//                   return !parse.hash || d.value.toLowerCase().includes(parse.hash)
//                 })
//                 setState({
//                   filterAnchors
//                 })
//               } else {
//                 const filterDocs = state().docs.filter((d) => {
//                   return d.path!.toLowerCase().includes(key)
//                 })
//                 setState({
//                   filterDocs
//                 })
//               }
//               setState({
//                 inputKeyword: e.target.value,
//                 index: 0
//               })
//             }}
//             placeholder={'Link or search docs'}
//             className={`flex-1 text-sm border rounded dark:border-gray-200/30 border-gray-300 h-8 px-2 outline-none bg-zinc-100 dark:bg-black/30`}
//           />
//           <Tooltip title={core.config.zh ? '移除链接' : 'Remove link'} mouseEnterDelay={0.5}>
//             <div
//               className={
//                 'p-1 text-base rounded ml-1 hover:bg-gray-200/70 cursor-pointer dark:hover:bg-gray-100/10 text-gray-600 dark:text-gray-300'
//               }
//               onClick={() => {
//                 close(null)
//               }}
//             >
//               <IDelete />
//             </div>
//           </Tooltip>
//         </div>
//         <div
//           className={'flex-1 overflow-y-auto py-2 max-h-[200px] px-2 text-[15px] relative'}
//           ref={scrollRef}
//         >
//           {isLink(state().inputKeyword) && !!state().inputKeyword ? (
//             <>
//               <div
//                 onClick={(e) => {
//                   close({ url: state().inputKeyword })
//                 }}
//                 className={`flex justify-center py-1.5 rounded bg-gray-200/70 dark:bg-gray-100/10 cursor-pointer px-2 flex-col`}
//               >
//                 <div className={'text-gray-600 dark:text-gray-300 flex'}>
//                   <IPlanet className={'flex-shrink-0 h-5'} />
//                   <span className={'ml-1 flex-1 max-w-full text-sm break-all'}>
//                     {state().inputKeyword}
//                   </span>
//                 </div>
//               </div>
//             </>
//           ) : (
//             <>
//               {!!state().anchors.length &&
//                 state().filterAnchors.map((a, i) => (
//                   <div
//                     key={i}
//                     onMouseEnter={(e) => {
//                       setState({ index: i })
//                     }}
//                     onClick={(e) => {
//                       close({
//                         docId: a.item.cid === core.tree.openedNote?.cid ? undefined : a.item.cid,
//                         hash: a.value
//                       })
//                     }}
//                     className={`flex justify-center py-0.5 rounded ${
//                       state().index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''
//                     } cursor-pointer px-2 flex-col`}
//                   >
//                     <div className={'text-gray-600 dark:text-gray-300 flex items-start leading-6'}>
//                       <div className={'h-6 flex items-center'}>
//                         <INote />
//                       </div>
//                       <span className={'ml-1 flex-1 max-w-full break-all text-sm'}>
//                         {a.item.cid === store.openCid ? '' : a.item.name}#{a.value}
//                       </span>
//                     </div>
//                     {!!a.item.parent && !a.item.parent.root && (
//                       <div
//                         className={
//                           'text-gray-500 dark:text-gray-400 text-sm pl-[18px] break-all text-[13px]'
//                         }
//                       >
//                         {a.item.path?.split('/').slice(0, -1).join('/')}
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               {!state().anchors.length &&
//                 state().filterDocs.map((f, i) => {
//                   return (
//                     <div
//                       key={f.cid}
//                       onMouseEnter={(e) => {
//                         setState({ index: i })
//                       }}
//                       onClick={(e) => {
//                         close({ docId: f.cid })
//                       }}
//                       className={`flex justify-center py-0.5 rounded ${
//                         state().index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''
//                       } cursor-pointer px-2 flex-col ${f.cid === store.openCid ? 'hidden' : ''}`}
//                     >
//                       <div
//                         className={
//                           'text-gray-600 dark:text-white/90 flex items-start leading-6 text-sm'
//                         }
//                       >
//                         <div className={'h-6 flex items-center'}>
//                           {f.folder ? <IFolder/> :  <INote />}
//                         </div>
//                         <span className={'ml-1 flex-1 max-w-full break-all'}>{f.name}</span>
//                       </div>
//                       {!!f.parent && !f.parent.root && (
//                         <div
//                           className={
//                             'text-gray-500 dark:text-white/70 pl-[18px] break-all text-[13px]'
//                           }
//                         >
//                           {getNodePath(f).slice(0, -1).join('/')}
//                         </div>
//                       )}
//                     </div>
//                   )
//                 })}
//               {((!!state().anchors.length && !state().filterAnchors.length) ||
//                 (!!state().docs.length && !state().filterDocs.length) || (!state().anchors.length && !state().docs.length)) && (
//                 <div className={'py-4 text-center text-gray-400 text-sm'}>
//                   {core.config.zh ? '没有相关文档' : 'No related documents'}
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//         <div
//           className={
//             'flex items-center h-7 leading-7 border-t dark:border-white/5 dark:text-white/60 px-3 text-black/60 border-black/5'
//           }
//         >
//           <ISort className={'mr-1'}/>
//           <span className={'text-xs'}>to navigate</span>
//           <span className={'text-xs ml-2.5'}>
//             <span className={'font-bold'}>tab</span> to complete
//           </span>
//           <span className={'text-xs ml-2.5'}>
//             <span className={'font-bold'}>#</span> to link heading
//           </span>
//           <span className={'text-xs ml-2.5'}>
//             <span className={'font-bold'}>esc</span>
//             <IClose className={'ml-1 inline scale-105 relative'} />
//           </span>
//         </div>
//       </div>
//     </div>,
//     document.body
//   ) as ReactNode
// })
