import { Button, Input, Popover } from 'antd'
import { useCoreContext } from '../../utils/env.ts'
import { IGithub } from '../../icons/IGithub.tsx'
import { IUser2 } from '../../icons/IUser2.tsx'
import { ITime } from '../../icons/ITime.tsx'
import { SyncOutlined } from '@ant-design/icons'
import { ISettings } from '../../icons/ISettings.tsx'
import { useGetSetState } from 'react-use'
import { githubSyncDialog$ } from './GithubSyncDialog.tsx'
import dayjs from 'dayjs'
import { observer } from 'mobx-react-lite'
export const GithubSync = observer(() => {
  const core = useCoreContext()
  const [state, setState] = useGetSetState({
    popOpen: false,
    submitting: false,
    message: ''
  })
  if (!core.github.connected) {
    return null
  }
  return (
    <>
      <Popover
        zIndex={100}
        content={
          <div className={'w-[310px] pt-2 pb-1 relative'}>
            <div
              className={
                'w-5 h-5 absolute -right-1 -top-1 flex items-center justify-center cursor-pointer dark:hover:text-white z-10'
              }
              onClick={() => {
                setState({ popOpen: false })
                githubSyncDialog$.next(null)
              }}
            >
              <ISettings />
            </div>
            <div className={'flex items-center'}>
              <div className={'w-10 h-10 flex-shrink-0'}>
                <img src={`https://github.com/1943time.png`} className={'rounded-full'} />
              </div>
              <div className={'flex-1 ml-3 text-sm leading-4'}>
                <div
                  className={'flex items-center dark:hover:text-white duration-200 cursor-pointer'}
                  onClick={() => {
                    window.open(
                      `https://github.com/${core.github.config?.owner}/${core.github.config?.repo}/tree/${core.github.config?.branch}`
                    )
                  }}
                >
                  <IUser2 className={'text-white/60 flex-shrink-0'} />
                  <span className={'ml-1 truncate flex-1 max-w-[220px]'}>
                    {core.github.config?.owner} / {core.github.config?.repo}
                  </span>
                </div>
                <div className={'flex items-center mt-1.5'}>
                  <ITime className={'text-white/60'} />
                  <span className={'ml-1 truncate'}>
                    {core.github.lastCommitTime ? dayjs(core.github.lastCommitTime).fromNow() : ''}
                  </span>
                </div>
              </div>
            </div>
            <Input
              className={'mt-5'}
              placeholder={'Message: Optional, default to current time.'}
              value={state().message}
              onChange={(e) => {
                setState({ message: e.target.value })
              }}
            />
            <Button
              block={true}
              className={'mt-3'}
              icon={<SyncOutlined />}
              loading={state().submitting}
              onClick={() => {
                const { docs, map } = core.tree.docs
                setState({ submitting: true })
                core.github.syncGithub(docs, map, state().message).then(() => {
                  setState({message: ''})
                }).finally(() => setState({ submitting: false }))
              }}
            >
              Commit and Push
            </Button>
          </div>
        }
        title={null}
        trigger="click"
        placement={'bottomRight'}
        open={state().popOpen}
        onOpenChange={(v) => {
          setState({ popOpen: v })
        }}
        arrow={false}
      >
        <div
          className={
            'flex drag-none items-center justify-center w-[26px] h-[26px] rounded dark:hover:bg-gray-200/10 hover:bg-gray-200/60 cursor-pointer duration-200'
          }
        >
          <IGithub className={'text-xl'} />
        </div>
      </Popover>
    </>
  )
})
