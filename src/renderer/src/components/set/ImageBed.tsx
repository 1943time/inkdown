import {observer} from 'mobx-react-lite'
import {Alert, Button, Checkbox, Form, Input} from 'antd'
import {useCallback, useEffect} from 'react'
import {message$} from '../../utils'
import {imageBed} from '../../utils/imageBed'

export const ImageBed = observer(() => {
  const [form] = Form.useForm()
  useEffect(() => {
    const route = localStorage.getItem('pick-route') as string
    if (route) {
      route.split('')
    }
    form.setFieldsValue({
      route: route || ''
    })
  }, [])
  const save = useCallback(async () => {
    const v = await form.validateFields()
    localStorage.setItem('pick-route', v.route)
    message$.next({
      type: 'success',
      content: 'Saved successfully'
    })
    imageBed.initial()
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem('pick-route')
    form.resetFields()
    imageBed.initial()
    message$.next({
      type: 'success',
      content: 'Reset successfully'
    })
  }, [])
  return (
    <div
      className={'text-gray-600 dark:text-gray-300 px-4 py-2 h-[600px] overflow-y-auto'}>
      <div className={'text-center text-sm text-gray-400 dark:text-gray-500 mt-5 mb-5'}>
        <div>
          <span>An image upload and manage tool。</span>
          <a className={'link'} href={'https://github.com/Kuingsmile/PicList'} target={'_blank'}>Details</a>
        </div>
        <div className={'text-center mt-1'}>
          <span className={'mt-1'}>When enabled, adding images will automatically upload and use the network address.</span>
        </div>
      </div>
      <div className={'max-w-[400px] mx-auto'}>
        <Form layout={'vertical'} form={form}>
          <Form.Item
            label={'App'}
          >
            <Input value={'PickGo(PicList)'} disabled={true}/>
          </Form.Item>
          <Form.Item
            label={'Server Upload Route'}
            name={'route'}
            rules={[{required: true}]}
          >
            <Input placeholder={'http://127.0.0.1:36677/upload?key=[optional]'}/>
          </Form.Item>
          <div className={'flex mt-4'}>
            <Button typeof={'primary'} block={true} onClick={reset}>Reset</Button>
            <Button typeof={'primary'} className={'ml-4'} block={true} type={'primary'} onClick={save}>Save</Button>
          </div>
        </Form>
      </div>
    </div>
  )
})
