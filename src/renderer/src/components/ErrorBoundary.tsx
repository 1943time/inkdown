import React, {ReactNode} from 'react'
import {InfoCircleOutlined} from '@ant-design/icons'

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
    console.log('err', error)
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

export function ErrorFallback(props: {
  error: any
}) {
  let message = ''
  if (props.error instanceof Error) message = props.error.message
  if (typeof props.error === 'string') message = props.error
  return (
    <div className={'mt-20'}>
      <div className={'text text-orange-400 flex items-center flex-col'}>
        <div>
          <InfoCircleOutlined />
          <span className={'ml-2'}>Oops, something went wrong.</span>
        </div>
        <div className={'max-w-[500px] text-sm mt-4 text-center dark:text-gray-400 text-gray-500'}>
          {message}
        </div>
        <div className={'link mt-5 cursor-default underline'} onClick={() => {
          location.reload()
        }}>
          Reload
        </div>
      </div>
    </div>
  )
}
