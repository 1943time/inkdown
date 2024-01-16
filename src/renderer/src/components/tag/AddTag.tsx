import {observer} from 'mobx-react-lite'
import {Dialog} from '../Dialog'
import {Button, Input, message} from 'antd'
import {useLocalState} from '../../hooks/useLocalState'
import {useCallback} from 'react'
import {db, ITag} from '../../store/db'
import {nanoid} from 'nanoid'
import {tagStore} from '../../store/tag'
import {useSubject} from '../../hooks/subscribe'
import {message$} from '../../utils'
import {configStore} from '../../store/config'
import {runInAction} from 'mobx'

export const AddTag = observer(() => {
  const [state, setState] = useLocalState({
    tagName: '',
    curTag: null as null | ITag,
    open: false
  })
  const create = useCallback(async () => {
    if (state.tagName) {
      if (tagStore.tree.some(t => t.title === state.tagName)) {
        return message$.next({
          type: 'warning',
          content: configStore.zh ? '标签名已存在' : 'The tag name already exists'
        })
      }
      if (!state.curTag) {
        const data: ITag = {
          id: nanoid(),
          title: state.tagName
        }
        await db.tag.add(data)
        data.children = []
        tagStore.setState({
          tree: tagStore.sortTags([...tagStore.tree, data])
        })
      } else {
        db.tag.where('id').equals(state.curTag.id!).modify({
          title: state.tagName
        })
        runInAction(() => state.curTag!.title = state.tagName)
      }
      close()
    }
  }, [])

  useSubject(tagStore.openEditTag$, data => {
    setState({curTag: data, tagName: data?.title || '', open: true})
  })

  const close = useCallback(() => {
    setState({tagName: '', open: false, curTag: null})
  }, [])

  return (
    <Dialog
      open={state.open}
      onClose={close}
    >
      <div className={'w-[300px] p-4 flex flex-col space-y-4'}>
        <div className={'text-center font-medium dark:text-gray-400 text-gray-500 text-sm'}>{configStore.zh ? '标签' : 'Tag'}</div>
        <Input
          className={'w-full'} placeholder={'tag name'} autoFocus={true} maxLength={50}
          value={state.tagName}
          onChange={e => setState({tagName: e.target.value})}
        />
        <div className={'flex space-x-3'}>
          <Button block={true} onClick={close}>{configStore.zh ? '取消' : 'Cancel'}</Button>
          <Button type={'primary'} block={true} disabled={!state.tagName} onClick={create}>
            {configStore.zh ? state.curTag ? '保存' : '添加' : state.curTag ? 'Save' : 'Add'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
})
