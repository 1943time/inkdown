import { Form, Select, Popconfirm, Button } from 'antd'
import { useStore } from '@/store/store'
import { useCallback, useEffect, useMemo } from 'react'
import { useGetSetState } from 'react-use'
import { IClient } from 'types/model'
import { Collapse, Input } from '@lobehub/ui'
import { AiModeLabel, openAiModels } from '@/store/model/data/data'
import { ModelIcon } from '../chat/ModelIcon'
import { CircleCheckBig, CircleX } from 'lucide-react'
import { copy } from '@/utils/common'
import { nanoid } from 'nanoid'

function ModelItem(props: {
  model?: IClient
  id?: string
  onRemove: () => void
  initOpen: boolean
}) {
  const [form] = Form.useForm()
  const [state, setState] = useGetSetState({
    loading: false,
    error: '',
    checking: false,
    checked: false,
    open: props.initOpen,
    provider: props.model?.mode,
    name: props.model?.name
  })
  const store = useStore()
  const models = store.settings.useState((state) => state.models)
  const currentChat = store.chat.useState((state) => state.activeChat)
  const check = useCallback(() => {
    form.validateFields().then((data) => {
      setState({ checking: true })
      store.chat
        .checkLLMApiConnection({
          provider: openAiModels.has(data.mode) ? 'openai' : data.mode,
          baseUrl: data.baseUrl,
          apiKey: data.apiKey,
          model: data.models[0],
          mode: data.mode
        })
        .then(async (res) => {
          console.log('res', res)
          if (res.success) {
            store.msg.success('检查通过')
            setState({ checked: true, error: '' })
          } else {
            setState({ error: res.message, checked: false })
          }
        })
        .finally(() => {
          setState({ checking: false })
        })
    })
  }, [form])
  const save = useCallback(() => {
    form.validateFields().then(async (data) => {
      const model = {
        id: data.id,
        name: data.name,
        mode: data.mode,
        baseUrl: data.baseUrl,
        apiKey: data.apiKey,
        models: data.models,
        sort: data.sort || models.length
      }
      if (models.find((m) => m.id === model.id)) {
        await store.model.updateClient(model.id, model)
      } else {
        await store.model.createClient(model)
      }
      const target = models.find((item) => item.id === data.id)
      if (!target) {
        store.settings.useState.setState((state) => {
          state.models = [...state.models, model]
        })
        store.settings.setDefaultModel(data.id, model.models[0])
      } else {
        await store.settings.getModels()
        store.chat.setChatModel(
          data.id,
          currentChat?.model ||
            store.settings.useState.getState().defaultModel?.model ||
            model.models[0]
        )
      }
      store.msg.success('保存成功')
    })
  }, [form, models, currentChat, store])

  useEffect(() => {
    if (props.model) {
      form.setFieldsValue({
        id: props.model.id,
        name: props.model.name,
        mode: props.model.mode,
        apiKey: props.model.apiKey,
        baseUrl: props.model.baseUrl,
        models: props.model.models
      })
    } else {
      form.setFieldsValue({
        id: props.id
      })
    }
  }, [props.model])
  const label = useMemo(() => {
    return (
      <div className={'flex items-center gap-2 select-none'}>
        {state().provider && <ModelIcon mode={state().provider as any} size={16} />}
        <span>{state().name || '未命名'}</span>
      </div>
    )
  }, [state().provider, state().name])
  return (
    <Collapse
      activeKey={state().open ? ['model'] : []}
      onChange={() => {
        setState({ open: !state().open })
      }}
      items={[
        {
          label,
          key: 'model',
          children: (
            <div className={'p-4 rounded'}>
              <Form form={form} layout={'vertical'} labelAlign={'right'}>
                <Form.Item label={'名称'} name={'id'} hidden={true}>
                  <Input />
                </Form.Item>
                <Form.Item label={'名称'} name={'name'} rules={[{ required: true }]}>
                  <Input placeholder={'自定义名称'} />
                </Form.Item>
                <Form.Item
                  label={'Api 提供方'}
                  name={'mode'}
                  rules={[{ required: true }]}
                  tooltip={
                    '很多模型都与OpenAi 的api兼容，如果未列出您所使用的模型，可以考虑使用OpenAi模式'
                  }
                >
                  <Select
                    options={Array.from(AiModeLabel.entries()).map(([key, value]) => ({
                      label: (
                        <div className={'flex items-center gap-2'}>
                          {' '}
                          <ModelIcon mode={key} size={16} /> <span>{value}</span>
                        </div>
                      ),
                      value: key
                    }))}
                    onChange={(value) => {
                      setState({ provider: value })
                    }}
                    placeholder={'请选择Api 提供方'}
                  />
                </Form.Item>
                <Form.Item rules={[{ required: true }]} label={'Api Key'} name={'apiKey'}>
                  <Input placeholder={'请输入Api Key'} />
                </Form.Item>
                <Form.Item
                  rules={[{ required: true, type: 'array' }]}
                  label={'模型'}
                  name={'models'}
                >
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    placeholder="使用回车添加模型，可添加多个"
                  />
                </Form.Item>
                <Form.Item rules={[{ type: 'url' }]} label={'Api Base Url'} name={'baseUrl'}>
                  <Input placeholder={'Default use: https://api.openai.com'} />
                </Form.Item>
                <div className={'flex justify-between items-center space-x-3'}>
                  <div className={'ml-10'}>
                    {state().checked && (
                      <div className={'flex items-center'}>
                        <CircleCheckBig className={'w-4 h-4 mr-2 text-green-500'} />
                        检查通过
                      </div>
                    )}
                    {!state().checked && !!state().error && (
                      <div className={'text-red-500 flex items-center'}>
                        <CircleX className={'w-4 h-4 mr-2 text-red-500'} />
                        {state().error || ''}
                      </div>
                    )}
                  </div>
                  <div className={'space-x-3 flex-shrink-0'}>
                    <Popconfirm title={'确定删除该模型吗？'} onConfirm={props.onRemove}>
                      <Button danger={true} size={'middle'}>
                        删除
                      </Button>
                    </Popconfirm>
                    <Button
                      type={'default'}
                      size={'middle'}
                      onClick={check}
                      loading={state().checking}
                    >
                      检查
                    </Button>
                    <Button size={'middle'} onClick={save} loading={state().loading}>
                      保存
                    </Button>
                  </div>
                </div>
              </Form>
            </div>
          )
        }
      ]}
    />
  )
}
export function ModelSettings() {
  const store = useStore()
  const [state, setState] = useGetSetState({
    loadings: [] as number[],
    editModels: store.settings.useState
      .getState()
      .models.map((m) => ({ id: m.id, model: copy(m), create: false })) as {
      id?: string
      model?: IClient
      create: boolean
    }[],
    errors: {} as Record<number, string>
  })
  const models = store.settings.useState((state) => state.models)
  const remove = useCallback((id: string) => {
    if (models.find((m) => m.id === id)) {
      store.settings.removeModel(id)
    }
    setState({
      editModels: state().editModels.filter((m) => m.id !== id)
    })
  }, [])
  return (
    <div className={'py-5 max-w-[500px] mx-auto'}>
      <div className={'space-y-5'}>
        {state().editModels.map((m) => (
          <ModelItem
            key={m.id}
            model={m.model}
            id={m.id}
            initOpen={m.create}
            onRemove={() => remove(m.id!)}
          />
        ))}
      </div>
      <div className={'mt-5'}>
        <Button
          block={true}
          onClick={() => {
            setState({
              editModels: [
                ...state().editModels,
                {
                  id: nanoid(),
                  create: true
                }
              ]
            })
          }}
          disabled={state().editModels.length > models.length}
        >
          添加模型
        </Button>
      </div>
    </div>
  )
}
