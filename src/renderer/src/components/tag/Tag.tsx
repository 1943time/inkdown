// import {observer} from 'mobx-react-lite'
// import {Fragment, useEffect} from 'react'
// import {tagStore} from '../../store/tag'
// import {treeStore} from '../../store/tree'
// import {PlusCircleOutlined, TagOutlined} from '@ant-design/icons'
// import {action} from 'mobx'
// import ArrowRight from '../../icons/ArrowRight'
// import {ITagFile} from '../../store/db'
// import {basename} from 'path'
// import {AddTag} from './AddTag'
// import {useLocalState} from '../../hooks/useLocalState'
// import {configStore} from '../../store/config'
//
// const getClass = (c: ITagFile) => {
//   if (tagStore.selectedItem === c) return 'dark:bg-sky-500/10 bg-sky-500/20'
//   if (treeStore.openedNote && treeStore.openedNote.filePath === c.filePath) return 'dark:bg-gray-400/10 bg-gray-300/50'
//   return 'dark:hover:bg-gray-600/10 hover:bg-gray-300/30'
// }
//
// export const Tag = observer(() => {
//   useEffect(() => {
//     tagStore.init()
//   }, [])
//   return (
//     <div className={'pt-5'}>
//       <div
//         className={`py-1 mb-1 flex justify-between items-center px-5 dark:text-gray-400 text-gray-500 duration-200 dark:hover:text-gray-300 hover:text-gray-600`}
//       >
//         <span className={'font-medium text-[15px]'}>Tags</span>
//         <div onClick={() => {
//           tagStore.openEditTag$.next(null)
//         }}>
//           <PlusCircleOutlined className={'cursor-pointer'}/>
//         </div>
//       </div>
//       <div className={'px-2 mt-2'}>
//         {!tagStore.tree.length &&
//           <div className={'text-center text-sm mt-5 text-gray-500 dark:text-gray-400'}>{configStore.zh ? '未添加标签' : 'No tags added'}</div>
//         }
//         {tagStore.tree.map(t =>
//           <Fragment key={t.id}>
//             <div
//               data-el={'file-item'}
//               className={`rounded ${tagStore.dropNode === t ? 'bg-sky-500/10' : 'dark:hover:bg-gray-600/10 hover:bg-gray-300/30'}`}
//             >
//               <div
//                 className={`dark:text-zinc-100/80 dark:hover:text-zinc-100/90 text-zinc-600 hover:text-zinc-700
//               flex items-center text-sm space-x-1 cursor-default select-none h-7 px-2 mb-0.5
//               `}
//                 onDragOver={e => {
//                   e.preventDefault()
//                   if (tagStore.dragNode) {
//                     tagStore.setState({dropNode: t})
//                   }
//                 }}
//                 onDragLeave={e => {
//                   tagStore.setState({dropNode: null})
//                 }}
//                 onDrop={e => {
//                   tagStore.moveTo(t)
//                 }}
//                 onContextMenu={(e) => {
//                   e.stopPropagation()
//                   tagStore.setState({ctxNode: t})
//                   window.electron.ipcRenderer.send('tag-menu')
//                 }}
//                 onClick={action((e) => {
//                   e.stopPropagation()
//                   if (tagStore.expandTags.includes(t.id!)) {
//                     tagStore.setState({
//                       expandTags: tagStore.expandTags.filter(id => id !== t.id)
//                     })
//                   } else {
//                     tagStore.setState({
//                       expandTags: [...tagStore.expandTags, t.id!]
//                     })
//                   }
//                 })}
//               >
//                 <ArrowRight
//                   className={`w-[11px] h-[11px] dark:text-gray-500 text-gray-400 duration-200 ${tagStore.expandTags.includes(t.id!) ? 'rotate-90' : ''}`}
//                 />
//                 <TagOutlined className={'text-xs'}/>
//                 <span className={'truncate w-[100%_-_10px]'}>
//                 {t.title}
//               </span>
//               </div>
//             </div>
//             {tagStore.expandTags.includes(t.id!) && !!t.children?.length &&
//               <>
//                 {t.children.map(item =>
//                   <div
//                     key={item.id}
//                     // title={item.filePath}
//                     data-el={'file-item'}
//                     className={`rounded ${getClass(item)}`}
//                   >
//                     <div
//                       className={`${treeStore.openedNote && treeStore.openedNote?.filePath === item.filePath ? 'dark:text-zinc-100 text-zinc-700 font-semibold' : 'dark:text-zinc-100/80 dark:hover:text-zinc-100/90 text-zinc-600 hover:text-zinc-700'}
//               flex items-center text-sm space-x-1 cursor-default select-none h-7 px-2 mb-0.5
//               `}
//                       draggable={true}
//                       onDragEnd={e => {
//                         treeStore.setState({dragNode: null, dropNode: null})
//                       }}
//                       onDragStart={e => {
//                         tagStore.setState({dragNode: item})
//                         // e.dataTransfer.setData('text/html', '<span></span>')
//                       }}
//                       onContextMenu={(e) => {
//                         // e.stopPropagation()
//                         // window.electron.ipcRenderer.send('tag-menu', item.filePath)
//                         tagStore.setState({ctxNode: item})
//                       }}
//                       onClick={action((e) => {
//                         e.stopPropagation()
//                         tagStore.selectedItem = item
//                         if (e.metaKey || e.ctrlKey) {
//                           // treeStore.appendTab(item.filePath)
//                         } else {
//                           // treeStore.openNote(item.filePath)
//                         }
//                       })}
//                     >
//                         <span style={{paddingLeft: 30}} className={'truncate w-[100%_-_10px]'}>
//                           {/*{basename(item.filePath)}*/}
//                         </span>
//                     </div>
//                   </div>
//                 )}
//               </>
//             }
//           </Fragment>
//         )}
//       </div>
//       <AddTag/>
//     </div>
//   )
// })
