// import { getSelRect } from '../utils/dom'
// import { useGetSetState } from 'react-use'
// import { useCallback, useEffect, useRef } from 'react'
// import { Editor, Node, Text, Transforms } from 'slate'
// import { EditorUtils } from '../utils/editorUtils'
// import isHotkey from 'is-hotkey'

// let panelWidth = 350
// export function QuickLinkComplete() {
//   const core = useCoreContext()
//   const store = useEditorStore()
//   const scrollRef = useRef<HTMLDivElement>(null)
//   const [state, setState] = useGetSetState({
//     left: 0,
//     y: 0,
//     mode: 'top',
//     index: 0,
//     visible: false,
//     docs: [] as IFileItem[],
//     filterDocs: [] as IFileItem[]
//   })
//   useSubject(store.quickLinkText$, (ctx) => {
//     if (state().docs.length) {
//       setState({
//         index: 0,
//         filterDocs: ctx.text
//           ? state().docs.filter((n) => n.path?.toLowerCase().includes(ctx.text!.toLowerCase()))
//           : state().docs
//       })
//     }
//   })
//   const keydown = useCallback((e: KeyboardEvent) => {
//     if (!store.openQuickLinkComplete) {
//       return
//     }
//     if (isHotkey('esc', e)) {
//       close()
//     }
//     if (isHotkey('up', e)) {
//       e.preventDefault()
//       e.stopPropagation()
//       if (state().filterDocs.length && state().index > 0) {
//         setState({
//           index: state().index - 1
//         })
//       }
//     }
//     if (isHotkey('down', e)) {
//       e.preventDefault()
//       e.stopPropagation()
//       if (state().index < state().filterDocs.length - 1) {
//         setState({
//           index: state().index + 1
//         })
//       }
//     }
//     if (isHotkey('enter', e)) {
//       e.preventDefault()
//       e.stopPropagation()
//       const target = state().filterDocs[state().index]
//       if (target) {
//         close({ docId: target.cid })
//       } else {
//         close()
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
//   useEffect(() => {
//     store.container
//       ?.querySelector<HTMLInputElement>('.edit-area')
//       ?.addEventListener('keydown', keydown)
//     return () => {
//       store.container
//         ?.querySelector<HTMLInputElement>('.edit-area')
//         ?.removeEventListener('keydown', keydown)
//     }
//   }, [])
//   const insertLink = useCallback((docId: string) => {
//     const [node] = Editor.nodes(store.editor, {
//       match: (n) => Text.isText(n),
//       mode: 'lowest'
//     })
//     const text = Node.string(node[0])
//     const match = text.match(/@[^\n@]*$/)
//     const target = core.tree.nodeMap.get(docId)
//     const sel = store.editor.selection
//     if (match && target && sel) {
//       Transforms.insertNodes(
//         store.editor,
//         {
//           text: target.name,
//           docId: docId
//         },
//         {
//           at: {
//             anchor: {
//               path: sel.focus.path,
//               offset: sel.focus.offset - match[0].length
//             },
//             focus: {
//               path: sel.focus.path,
//               offset: sel.focus.offset
//             }
//           },
//           select: true
//         }
//       )
//     }
//   }, [])
//   const close = useCallback((data?: { docId?: string } | null) => {
//     EditorUtils.focus(store.editor)
//     if (data && data.docId) {
//       insertLink(data.docId)
//     }
//     runInAction(() => {
//       store.openQuickLinkComplete = false
//     })
//   }, [])
//   const resize = useCallback(() => {
//     const rect = getSelRect()
//     if (!rect) {
//       return
//     }
//     const container = store.container!
//     const client = container!.querySelector('.edit-area')?.clientHeight!
//     const mode =
//       window.innerHeight - rect.top - rect.height < 260
//         ? 'bottom'
//         : 'top'
//     let y =
//       mode === 'bottom'
//         ? client - container.scrollTop - rect.bottom + 185
//         : container.scrollTop + rect.top - 15
//     if (core.tree.tabs.length > 1) {
//       y = mode === 'bottom' ? y + 30 : y - 30
//     }
//     let left = rect.x - 4
//     if (!core.tree.fold) left -= core.tree.width
//     if (left < 4) left = 4
//     if (left > container.clientWidth - panelWidth) left = container.clientWidth - panelWidth - 4
//     setState({
//       left,
//       y,
//       mode
//     })
//   }, [])
//   useEffect(() => {
//     if (store.openQuickLinkComplete) {
//       resize()
//       setState({
//         visible: true
//       })
//       const {docs} = core.tree.docsOrFolders
//       const notes = docs.filter((t) => t !== core.tree.openedNote)
//       setState({
//         docs: notes,
//         filterDocs: notes,
//         index: 0
//       })
//     } else {
//       setState({
//         visible: false
//       })
//     }
//   }, [store.openQuickLinkComplete, core.tree.tabs.length])
//   useEffect(() => {
//     if (store.openQuickLinkComplete) {
//       resize()
//     }
//   }, [core.tree.tabs.length])
//   if (!state().visible) {
//     return null
//   }
//   return (
//     <div
//       className={'rounded absolute ctx-panel select-none z-50'}
//       style={{
//         left: state().left,
//         top: state().mode === 'bottom' ? undefined : state().y,
//         bottom: state().mode === 'bottom' ? state().y : undefined,
//         width: panelWidth
//       }}
//     >
//       <div className={'overflow-y-auto max-h-[230px] p-2'} ref={scrollRef}>
//         {state().filterDocs.map((f, i) => {
//           return (
//             <div
//               key={f.cid}
//               onMouseEnter={(e) => {
//                 setState({ index: i })
//               }}
//               onClick={(e) => {
//                 close({ docId: f.cid })
//               }}
//               className={`flex justify-center py-0.5 rounded ${
//                 state().index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''
//               } cursor-pointer px-2 flex-col ${f.cid === store.openCid ? 'hidden' : ''}`}
//             >
//               <div
//                 className={'text-gray-600 dark:text-white/90 flex items-start leading-6 text-sm'}
//               >
//                 <div className={'h-6 flex items-center'}>
//                   {f.folder ? <IFolder/> : <INote/>}
//                 </div>
//                 <span className={'ml-1 flex-1 max-w-full break-all'}>{f.name}</span>
//               </div>
//               {!!f.parent && !f.parent.root && (
//                 <div className={'text-gray-500 dark:text-white/70 pl-[18px] break-all text-[13px]'}>
//                   {getNodePath(f).slice(0, -1).join('/')}
//                 </div>
//               )}
//             </div>
//           )
//         })}
//         {!state().filterDocs.length && (
//           <div className={'py-2 text-center text-gray-400 text-sm'}>No related documents</div>
//         )}

//       </div>
//       <div
//           className={
//             'text-xs h-6 flex items-center border-t leading-6 dark:border-white/5 dark:text-white/60 px-2 text-black/60 border-black/5'
//           }
//         >
//           <span className={'scale-90 inline-block'}>
//             Quickly insert space document link
//           </span>
//           <span className={'flex items-center'}>
//           <ISort className={'ml-2 mr-1'}/>
//           <span className={'text-xs'}>to navigate</span>
//           </span>
//         </div>
//     </div>
//   )
// }
