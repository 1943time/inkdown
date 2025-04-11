import { createContext, useContext } from 'react'
import { ChatStore } from './chat'
import { ModelApi } from './api/api'
import { MessageInstance } from 'antd/es/message/interface'
import { SettingsStore } from './settings'
export class Store {
  public readonly model = new ModelApi()
  public readonly chat = new ChatStore(this)
  public readonly settings = new SettingsStore(this)
  constructor(public readonly msg: MessageInstance) {}
}

export const StoreContext = createContext<Store>({} as any)

export const useStore = () => {
  return useContext(StoreContext)
}
