import React, { ReactNode } from 'react'
import { InfoCircleOutlined } from '@ant-design/icons'

interface Props {
  fallback: (e: any) => ReactNode
  children: ReactNode
}
export class ErrorBoundary extends React.Component<Props> {
  state = {
    hasError: false,
    error: null as null | Error
  }
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    console.error('error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.error)
    }
    return this.props.children
  }
}

export function ErrorFallback(props: { error: any }) {
  let message = ''
  if (props.error instanceof Error) message = props.error.message
  if (typeof props.error === 'string') message = props.error
  return (
    <div className={'mt-20'}>
      <div className={'text flex items-center flex-col dark:text-gray-400 text-gray-500'}>
        <div className={'text-orange-400'}>
          <InfoCircleOutlined />
          <span className={'ml-2'}>Oops, something went wrong.</span>
        </div>
        <div className={'max-w-[500px] text-sm mt-4 text-center'}>system: {message}</div>
        <div className={'mt-5'}>
          <span
            className={'link underline cursor-pointer'}
            onClick={() => {
              window.open('https://github.com/1943time/inkdown/issues')
            }}
          >
            Send report
          </span>
          <span className={'mx-3'}>|</span>
          <span className={'link underline cursor-pointer'} onClick={() => location.reload()}>
            Reload
          </span>
        </div>
      </div>
    </div>
  )
}
