// import { useCallback, useEffect, useMemo, useRef } from 'react'
// import { AttachNode, ElementProps } from '../../types/el'
// import { useSelStatus } from '../../hooks/editor'
// import { useGetSetState } from 'react-use'
// import { ILoading } from '../../icons/ILoading'
// import { ILink } from '../../icons/ILink'
// import { useCoreContext } from '../../utils/env'
// import { db } from '../../store/db'
// import { EditorUtils } from '../utils/editorUtils'
// import { sizeUnit } from '../../utils'
// import { nodeResize } from '../utils/dom'
// import { Transforms } from 'slate'
// import { Icon } from '@iconify/react'

// const previewSet = new Set(['pdf', 'md', 'txt', 'png', 'jpg', 'html', 'gif', 'svg', 'jpeg', 'webp'])
// export function Attachment({ element, attributes, children }: ElementProps<AttachNode>) {
//   const core = useCoreContext()
//   const ref = useRef<HTMLElement>(null)
//   const cancelRef = useRef<Function>()
//   const [state, setState] = useGetSetState({
//     loading: false,
//     uploadFailed: false,
//     progress: 0,
//     height: element.height,
//     dragging: false
//   })
//   const [selected, path, store] = useSelStatus(element)
//   const ext = useMemo(() => {
//     return (element.id || element.url || '').match(/\.(\w+)$/i)?.[1].toUpperCase() || 'FILE'
//   }, [])
//   const upload = useCallback(async (id: string) => {
//     const file = await db.file.get(id)
//     if (file?.data) {
//       setState({ loading: true })
//       const [up, cancel] = core.upload(id, file.data, (p) => setState({ progress: p }))
//       cancelRef.current = cancel
//       up.then(() => {
//         db.file.delete(id)
//         setState({ loading: false, progress: 0 })
//       }).catch(() => {
//         window.addEventListener(
//           'online',
//           () => {
//             upload(id)
//           },
//           { once: true }
//         )
//       })
//     }
//   }, [])
//   useEffect(() => {
//     if (element.id) {
//       upload(element.id)
//     }
//     return () => {
//       cancelRef.current?.()
//     }
//   }, [])
//   const url = useMemo(() => {
//     if (element.id) {
//       return core.service.getFileUrl(element.id)
//     } else {
//       return element.url
//     }
//   }, [element.id, element.url])
//   return (
//     <div
//       contentEditable={false}
//       className={`attach`}
//       data-be={'attach'}
//       {...attributes}
//       onMouseDown={(e) => {
//         e.stopPropagation()
//         if (!store.focus) {
//           EditorUtils.focus(store.editor)
//         }
//         EditorUtils.selectMedia(store, path)
//       }}
//     >
//       {element.preview ? (
//         <div
//           style={{
//             height: state().height || 360
//           }}
//           className={`relative group rounded border-2 ${selected ? 'border-gray-300 dark:border-gray-300/50' : 'border-transparent'}`}
//         >
//           <div
//             onClick={() => {
//               Transforms.setNodes(store.editor, { preview: false }, { at: path })
//             }}
//             className={
//               'absolute z-50 right-1 top-1 p-1 bg-black/60 text-white/90 rounded-sm hover:text-white duration-200 cursor-pointer hidden group-hover:block'
//             }
//           >
//             <Icon icon={'ic:round-zoom-in-map'} />
//           </div>
//           <div
//             className={`p-2 bg-black/5 dark:bg-white/10 flex-1 h-full`}
//             // @ts-ignore
//             ref={ref}
//           >
//             <object
//               data={url}
//               className={`w-full h-full select-none border-none rounded ${state().dragging ? 'pointer-events-none' : ''}`}
//             />
//           </div>
//           {selected && (
//             <div
//               draggable={false}
//               className={
//                 'w-20 h-[6px] rounded-lg bg-zinc-500 dark:bg-zinc-400 absolute z-50 left-1/2 -ml-10 -bottom-[3px] cursor-row-resize'
//               }
//               onMouseDown={(e) => {
//                 e.preventDefault()
//                 e.stopPropagation()
//                 setState({ dragging: true })
//                 nodeResize({
//                   e,
//                   height: state().height,
//                   dom: ref.current!,
//                   cb: (height: number) => {
//                     setState({ height })
//                     Transforms.setNodes(store.editor, { height }, { at: path })
//                     setState({ dragging: false })
//                   }
//                 })
//               }}
//             />
//           )}
//         </div>
//       ) : (
//         <div className={`file ${selected ? 'active' : ''}`}>
//           <div className={'flex items-center justify-between'}>
//             <div className={'flex items-center text-sm'}>
//               <div
//                 className={
//                   'px-1.5 py-0.5 rounded flex items-center bg-teal-500 text-white text-xs font-semibold'
//                 }
//               >
//                 {ext}
//               </div>
//               <div className={'mx-3 break-all'}>
//                 {element.name?.replace(/\.\w+$/, '')}
//                 <span className={'ml-1.5 text-xs text-black/70 dark:text-white/70'}>
//                   {sizeUnit(element.size || 0)}
//                 </span>
//               </div>
//             </div>
//             <div className={'flex items-center'}>
//               {!core.chrome && previewSet.has(ext.toLowerCase()) && !state().loading && (
//                 <div
//                   onClick={() => {
//                     Transforms.setNodes(store.editor, { preview: true }, { at: path })
//                   }}
//                   className={
//                     'mr-2 hover:bg-gray-200 duration-200 dark:hover:bg-white/15 rounded p-1 cursor-pointer text-sm'
//                   }
//                 >
//                   <Icon icon={'gravity-ui:eye'} />
//                 </div>
//               )}
//               <div
//                 className={
//                   'p-1 flex items-center rounded text-sm text-black/80 dark:text-white/80 cursor-pointer hover:bg-gray-200 duration-200 dark:hover:bg-white/15'
//                 }
//                 onClick={() => {
//                   if (!state().loading && !state().uploadFailed) {
//                     window.open(url)
//                   }
//                 }}
//               >
//                 {state().loading && (
//                   <>
//                     <span className={'text-xs mr-2'}>{state().progress}%</span>
//                     <ILoading />
//                   </>
//                 )}
//                 {!state().loading && !state().uploadFailed && <ILink />}
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//       <span className={'h-0 block'}>{children}</span>
//     </div>
//   )
// }
