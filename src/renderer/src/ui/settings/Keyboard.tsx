import { Popconfirm, Popover } from 'antd'
import { observer } from 'mobx-react-lite'
import { useCallback, useMemo, useRef } from 'react'
import { Input, Button, Tag } from '@lobehub/ui'
import { useUpdate } from 'react-use'
import { useStore } from '@/store/store'
import { os } from '@/utils/common'
import { useLocalState } from '@/hooks/useLocalState'
import isHotkey from 'is-hotkey'
import { RotateCcw } from 'lucide-react'

const Item = observer(
  ({ task, labelMap }: { task: string; labelMap: Map<string, string>; refresh: boolean }) => {
    const store = useStore()
    const update = useUpdate()
    const inputRef = useRef<HTMLDivElement>(null)
    const [state, setState] = useLocalState({
      input: null as string | null | undefined,
      openInput: false
    })
    const getKeyText = useCallback(
      (item: { custom: string | undefined | null; system: string }) => {
        if (item.custom === null) return '未设置'
        return (item.custom || item.system)
          .split('+')
          .map((item) => {
            if (item === 'mod') {
              return os() === 'mac' ? '⌘' : 'Ctrl'
            }
            if (item === 'option') {
              return os() === 'mac' ? '⌥' : 'Alt'
            }
            if (item === 'shift') {
              return 'Shift'
            }
            return item.toUpperCase()
          })
          .join('+')
      },
      []
    )
    const save = useCallback((task: string, key: string | null | undefined) => {
      if (key) {
        const exist = Array.from(store.keyboard.taskMap).find(([t, item]) => {
          if (t !== task) {
            return item.custom === key || (item.custom === undefined && item.system === key)
          }
          return false
        })
        if (exist) {
          store.msg.open({ type: 'warning', content: '快捷键已存在' })
          return
        }
      }
      store.keyboard.setKeyboard(task, key)
      update()
      setState({ openInput: false })
    }, [])
    const keydown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, task: string) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        let key = e.code.startsWith('Key')
          ? e.code.slice(3)
          : e.code.startsWith('Digit')
            ? e.code.slice(5)
            : e.key

        if (e.code === 'Backquote') key = '`'
        if (e.code === 'Minus') key = '-'
        if (e.code === 'Equal') key = '='
        if (e.code === 'BracketLeft') key = '['
        if (e.code === 'BracketRight') key = ']'
        if (e.code === 'Backslash') key = '\\'
        if (e.code === 'Semicolon') key = ';'
        if (e.code === 'Quote') key = "'"
        if (e.code === 'Comma') key = ','
        if (e.code === 'Period') key = '.'
        if (e.code === 'Slash') key = '/'
        if (
          e.code === 'MetaLeft' ||
          e.code === 'MetaRight' ||
          e.code === 'ControlLeft' ||
          e.code === 'ControlRight' ||
          e.code === 'ShiftLeft' ||
          e.code === 'ShiftRight' ||
          e.code === 'AltLeft' ||
          e.code === 'AltRight'
        ) {
          return
        }
        if (e.altKey) key = `option+${key}`
        if (e.shiftKey) key = `shift+${key}`
        if (e.metaKey || e.ctrlKey) key = `mod+${key}`

        setState({ input: key })
      }
      if (isHotkey('backspace', e)) {
        setState({
          input: null
        })
      }
      if (isHotkey('enter', e)) {
        save(task, state.input)
      }
      e.preventDefault()
    }, [])
    return (
      <div className={'flex justify-between items-center pb-2'}>
        <div className={'text-sm'}>{labelMap.get(task)}</div>
        {store.keyboard.taskMap.get(task)?.disabled ? (
          <Tag size={'small'} className={'cursor-not-allowed'}>
            {getKeyText(store.keyboard.taskMap.get(task)!)}
          </Tag>
        ) : (
          <Popover
            trigger={'click'}
            placement={'bottom'}
            showArrow={false}
            open={state.openInput}
            onOpenChange={(v) => {
              if (v) {
                setState({ openInput: true })
                setState({ input: getKeyText(store.keyboard.taskMap.get(task)!) })
                setTimeout(() => {
                  inputRef.current?.querySelector<HTMLInputElement>('input')?.focus()
                }, 30)
              } else {
                setState({ openInput: false })
              }
            }}
            styles={{
              root: { zIndex: 2200 }
            }}
            content={
              <div ref={inputRef}>
                <Input
                  size={'small'}
                  className={'text-center key-input'}
                  value={getKeyText({
                    custom: state.input,
                    system: store.keyboard.taskMap.get(task)?.system || ''
                  })}
                  onKeyDown={(e) => keydown(e, task)}
                />
                <div className={'flex justify-between items-center mt-2 space-x-2'}>
                  <Button
                    size={'small'}
                    block={true}
                    type={'primary'}
                    onClick={() => save(task, state.input)}
                  >
                    保存
                  </Button>
                </div>
              </div>
            }
          >
            <div className={'text-sm'}>
              <Tag
                size={'small'}
                className={'w-32 text-center cursor-pointer text-xs'}
                color={'info'}
              >
                {getKeyText(store.keyboard.taskMap.get(task)!)}
              </Tag>
            </div>
          </Popover>
        )}
      </div>
    )
  }
)
export const Keyboard = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    refresh: false
  })
  const labelMap = useMemo(() => {
    return new Map<string, string>([
      ['insertTable', '插入Table'],
      ['insertCode', '插入代码围栏'],
      ['insertFormulaBlock', '插入公式块'],
      ['insertFormulaInline', '插入行内公式'],
      ['insertQuote', '插入引用'],
      ['selectAll', '全选'],
      ['selectLine', '选择行'],
      ['selectWord', '选择单词'],
      ['selectFormat', '选择格式'],
      ['pastePlainText', '粘贴纯文本'],
      ['pasteMarkdownCode', '粘贴Markdown代码'],
      ['newNote', '新建笔记'],
      ['openSearch', '打开搜索'],
      ['save', '保存'],
      ['newTab', '新建标签页'],
      ['closeCurrentTab', '关闭当前标签页'],
      ['quickOpenNote', '快速打开笔记'],
      ['lineBreakWithinParagraph', '段落内换行'],
      ['undo', '撤销'],
      ['redo', '重做'],
      ['localImage', '插入本地图片'],
      ['bulletedList', '无序列表'],
      ['numberedList', '有序列表'],
      ['taskList', '任务列表'],
      ['horizontalLine', '水平分割线'],
      ['head1', '一级标题'],
      ['head2', '二级标题'],
      ['head3', '三级标题'],
      ['head4', '四级标题'],
      ['paragraph', '段落'],
      ['increaseHead', '增加标题级别'],
      ['decreaseHead', '降低标题级别'],
      ['bold', '加粗'],
      ['italic', '斜体'],
      ['strikethrough', '删除线'],
      ['inlineCode', '行内代码'],
      ['clear', '清除格式'],
      ['openChat', '打开对话'],
      ['newDoc', '新建文档']
    ])
  }, [])

  return (
    <div className={'px-10 py-2 dark:text-white/80 text-black/80'}>
      <div className={'text-xs text-center mb-2 flex justify-between items-center'}>
        <span>使用组合键[⌘/Ctrl/Alt/Shift] + 字母或数字 自定义快捷键</span>
        <Popconfirm
          title={'确认重置所有快捷键吗'}
          styles={{
            root: { zIndex: 2200 }
          }}
          onConfirm={() => {
            store.keyboard.resetKeyboard()
            setState({ refresh: !state.refresh })
          }}
        >
          <Button size={'small'} type={'text'} icon={<RotateCcw size={14} />}>
            恢复默认
          </Button>
        </Popconfirm>
      </div>
      <div className={'text-sm font-bold mb-2 text-black dark:text-white'}>插入元素</div>
      <div className={'divide-y divide-gray-200 dark:divide-gray-200/10 space-y-2'}>
        <Item task={'insertTable'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'insertCode'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'localImage'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'insertQuote'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'bulletedList'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'numberedList'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'taskList'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'horizontalLine'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'head1'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'head2'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'head3'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'head4'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'paragraph'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'insertFormulaBlock'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'insertFormulaInline'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'increaseHead'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'decreaseHead'} labelMap={labelMap} refresh={state.refresh} />
      </div>
      <div className={'text-sm font-bold mb-2 text-black dark:text-white mt-5'}>格式化</div>
      <div className={'divide-y divide-gray-200 dark:divide-gray-200/10 space-y-2'}>
        <Item task={'bold'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'italic'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'strikethrough'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'inlineCode'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'clear'} labelMap={labelMap} refresh={state.refresh} />
      </div>
      <div className={'text-sm font-bold mb-2 text-black dark:text-white mt-5'}>选择文本</div>
      <div className={'divide-y divide-gray-200 dark:divide-gray-200/10 space-y-2'}>
        <Item task={'selectAll'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'selectLine'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'selectWord'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'selectFormat'} labelMap={labelMap} refresh={state.refresh} />
      </div>
      <div className={'text-sm font-bold mb-2 text-black dark:text-white mt-5'}>系统</div>
      <div className={'divide-y divide-gray-200 dark:divide-gray-200/10 space-y-2'}>
        <Item task={'save'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'newTab'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'newDoc'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'closeCurrentTab'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'quickOpenNote'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'openChat'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'lineBreakWithinParagraph'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'undo'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'redo'} labelMap={labelMap} refresh={state.refresh} />
      </div>
    </div>
  )
})
