import { useContext, createContext } from 'react'
import { TabStore } from './tab'

export const TabContext = createContext<TabStore>({} as any)

export const useTab = () => {
  return useContext(TabContext)
}
