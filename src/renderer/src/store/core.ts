import { createContext, useContext } from 'react'
import { TreeStore } from './tree'
import { MessageInstance } from 'antd/es/message/interface'
import { ConfigStore } from './config'
import { NodeStore } from './node'
import { ImageBed } from './logic/imageBed'
import { Refactor } from './logic/refactor'
import { KeyboardTask } from './logic/keyboard'

export class Core {
  tree: TreeStore
  config: ConfigStore
  node: NodeStore
  imageBed: ImageBed
  refactor: Refactor
  keyboard: KeyboardTask
  get curEditor() {
    return this.tree.currentTab.store.editor
  }
  constructor(
    public readonly message: MessageInstance
  ) {
    this.tree = new TreeStore(this)
    this.config = new ConfigStore(this)
    this.node = new NodeStore(this)
    this.imageBed = new ImageBed(this)
    this.refactor = new Refactor(this)
    this.keyboard = new KeyboardTask(this)
  }
}

export const CoreContext = createContext<Core>({} as any)

export const useCoreContext = () => {
  return useContext(CoreContext)
}
