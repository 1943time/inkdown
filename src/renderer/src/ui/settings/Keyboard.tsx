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
import { useTranslation } from 'react-i18next'

const Item = observer(
  ({ task, labelMap }: { task: string; labelMap: Map<string, string>; refresh: boolean }) => {
    const store = useStore()
    const { t } = useTranslation()
    const update = useUpdate()
    const inputRef = useRef<HTMLDivElement>(null)
    const [state, setState] = useLocalState({
      input: null as string | null | undefined,
      openInput: false
    })
    const getKeyText = useCallback(
      (item: { custom: string | undefined | null; system: string }) => {
        if (item.custom === null) return t('keyboard.not_set')
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
          store.msg.open({ type: 'warning', content: t('keyboard.shortcut_exists') })
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
                    {t('keyboard.save')}
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
  const { t } = useTranslation()
  const [state, setState] = useLocalState({
    refresh: false
  })
  const labelMap = useMemo(() => {
    return new Map<string, string>([
      ['insertTable', t('keyboard.shortcuts.insertTable')],
      ['insertCode', t('keyboard.shortcuts.insertCode')],
      ['insertFormulaBlock', t('keyboard.shortcuts.insertFormulaBlock')],
      ['insertFormulaInline', t('keyboard.shortcuts.insertFormulaInline')],
      ['insertQuote', t('keyboard.shortcuts.insertQuote')],
      ['selectAll', t('keyboard.shortcuts.selectAll')],
      ['selectLine', t('keyboard.shortcuts.selectLine')],
      ['selectWord', t('keyboard.shortcuts.selectWord')],
      ['selectFormat', t('keyboard.shortcuts.selectFormat')],
      ['pastePlainText', t('keyboard.shortcuts.pastePlainText')],
      ['pasteMarkdownCode', t('keyboard.shortcuts.pasteMarkdownCode')],
      ['newNote', t('keyboard.shortcuts.newNote')],
      ['openSearch', t('keyboard.shortcuts.openSearch')],
      ['save', t('keyboard.shortcuts.save')],
      ['newTab', t('keyboard.shortcuts.newTab')],
      ['closeCurrentTab', t('keyboard.shortcuts.closeCurrentTab')],
      ['quickOpenNote', t('keyboard.shortcuts.quickOpenNote')],
      ['lineBreakWithinParagraph', t('keyboard.shortcuts.lineBreakWithinParagraph')],
      ['undo', t('keyboard.shortcuts.undo')],
      ['redo', t('keyboard.shortcuts.redo')],
      ['localImage', t('keyboard.shortcuts.localImage')],
      ['bulletedList', t('keyboard.shortcuts.bulletedList')],
      ['numberedList', t('keyboard.shortcuts.numberedList')],
      ['taskList', t('keyboard.shortcuts.taskList')],
      ['horizontalLine', t('keyboard.shortcuts.horizontalLine')],
      ['head1', t('keyboard.shortcuts.head1')],
      ['head2', t('keyboard.shortcuts.head2')],
      ['head3', t('keyboard.shortcuts.head3')],
      ['head4', t('keyboard.shortcuts.head4')],
      ['paragraph', t('keyboard.shortcuts.paragraph')],
      ['increaseHead', t('keyboard.shortcuts.increaseHead')],
      ['decreaseHead', t('keyboard.shortcuts.decreaseHead')],
      ['bold', t('keyboard.shortcuts.bold')],
      ['italic', t('keyboard.shortcuts.italic')],
      ['strikethrough', t('keyboard.shortcuts.strikethrough')],
      ['inlineCode', t('keyboard.shortcuts.inlineCode')],
      ['clear', t('keyboard.shortcuts.clear')],
      ['openChat', t('keyboard.shortcuts.openChat')],
      ['newDoc', t('keyboard.shortcuts.newDoc')],
      ['pasteMarkdownCode', t('keyboard.shortcuts.pasteMarkdownCode')],
      ['pastePlainText', t('keyboard.shortcuts.pastePlainText')]
    ])
  }, [t])

  return (
    <div className={'px-10 py-2 dark:text-white/80 text-black/80'}>
      <div className={'text-xs text-center mb-2 flex justify-between items-center'}>
        <span>{t('keyboard.shortcut_tip')}</span>
        <Popconfirm
          title={t('keyboard.reset_confirm')}
          styles={{
            root: { zIndex: 2200 }
          }}
          onConfirm={() => {
            store.keyboard.resetKeyboard()
            setState({ refresh: !state.refresh })
          }}
        >
          <Button size={'small'} type={'text'} icon={<RotateCcw size={14} />}>
            {t('keyboard.reset')}
          </Button>
        </Popconfirm>
      </div>
      <div className={'text-sm font-bold mb-2 text-black dark:text-white'}>
        {t('keyboard.insert_elements')}
      </div>
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
      <div className={'text-sm font-bold mb-2 text-black dark:text-white mt-5'}>
        {t('keyboard.format')}
      </div>
      <div className={'divide-y divide-gray-200 dark:divide-gray-200/10 space-y-2'}>
        <Item task={'bold'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'italic'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'strikethrough'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'inlineCode'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'clear'} labelMap={labelMap} refresh={state.refresh} />
      </div>
      <div className={'text-sm font-bold mb-2 text-black dark:text-white mt-5'}>
        {t('keyboard.select_text')}
      </div>
      <div className={'divide-y divide-gray-200 dark:divide-gray-200/10 space-y-2'}>
        <Item task={'selectAll'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'selectLine'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'selectWord'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'selectFormat'} labelMap={labelMap} refresh={state.refresh} />
      </div>
      <div className={'text-sm font-bold mb-2 text-black dark:text-white mt-5'}>
        {t('keyboard.system')}
      </div>
      <div className={'divide-y divide-gray-200 dark:divide-gray-200/10 space-y-2'}>
        <Item task={'save'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'newTab'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'newDoc'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'closeCurrentTab'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'quickOpenNote'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'pasteMarkdownCode'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'pastePlainText'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'openChat'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'lineBreakWithinParagraph'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'undo'} labelMap={labelMap} refresh={state.refresh} />
        <Item task={'redo'} labelMap={labelMap} refresh={state.refresh} />
      </div>
    </div>
  )
})
