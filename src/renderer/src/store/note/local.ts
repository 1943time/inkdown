import { makeAutoObservable, runInAction } from 'mobx'
import { Store } from '../store'
import { copy, nid } from '@/utils/common'
import { IDoc } from 'types/model'
export interface ImportTree {
  cid: string
  name: string
  path: string
  sort?: number
  folder?: boolean
  schema?: any[]
  parentCid?: string
  isset: boolean
  children?: ImportTree[]
}

const getFileText = async (file: File) => {
  const enc = new TextDecoder('utf-8')
  return enc.decode(await file.arrayBuffer())
}

export class LocalFile {
  downLoadTotal = 0
  downloaded = 0
  rewriteNode = new Set<string>()
  constructor(private readonly store: Store) {
    makeAutoObservable(this)
  }
  get writePath() {
    return this.store.note.state.currentSpace?.writeFolderPath
  }
  get saveLocal() {
    return Boolean(this.writePath)
  }

  getMdParser() {
    return import('@/editor/parser/worker').then((res) => res.parse)
  }
  getDocLocalPath(doc: IDoc) {
    const { join } = window.api.path
    return join(this.writePath!, this.store.note.getDocPath(doc).join('/'), '.md')
  }
  async deleteDocByIds(docs: string[]) {
    if (this.saveLocal) {
      try {
        // const space = await db.space.get(spaceCid)
        // if (this.store.desktop && space?.filePath) {
        //   for (const cid of docs) {
        //     const path = await this.getDocPath(cid)
        //     if (path) {
        //       const filePath = window.api.path.join(space.filePath, path)
        //       if (window.api.fs.existsSync(filePath)) {
        //         window.api.fs.moveToTrash(filePath)
        //       }
        //     }
        //   }
        // }
      } catch (e) {
        console.error(e)
      }
    }
  }

  chooseLocalFolder(defaultFilePath?: string) {
    return this.store.system.showOpenDialog({
      defaultPath: defaultFilePath,
      properties: ['openDirectory', 'createDirectory']
    })
  }

  private async parseLocalNodes(node: IDoc) {
    this.rewriteNode.clear()
    const path = this.getDocLocalPath(node)
    if (node.folder) {
      window.api.fs.mkdirSync(path, { recursive: true })
      if (node.children?.length) {
        for (const item of node.children) {
          await this.localWriteNode(item)
        }
      }
    } else {
      this.rewriteNode.add(node.id)
      // const depLinks = this.store.tree.depMap.get(node.cid)
      // if (depLinks?.size) {
      //   for (const item of depLinks) {
      //     this.rewriteNode.add(item)
      //   }
      // }
    }
  }
  async localWriteNode(node: IDoc) {
    if (!this.saveLocal) return
    this.parseLocalNodes(node).then(() => {
      this.writeNodes()
    })
  }

  async localDeleteAssetsFile(name: string) {
    if (!this.saveLocal) return
    const { join } = window.api.path
    const path = join(this.writePath!, '.files', name)
    if (window.api.fs.existsSync(path)) {
      window.api.fs.moveToTrash(path)
    }
  }

  async localSaveFile(path: string, name: string) {
    if (!this.saveLocal) return
    const { join } = window.api.path
    const filePath = join(this.writePath!, '.files', name)
    if (!window.api.fs.existsSync(filePath)) {
      window.api.fs.cp(path, filePath)
    }
  }

  async writeNodes() {
    if (!this.saveLocal) return
    const nodes = this.store.note.state.nodes
    for (const id of this.rewriteNode) {
      const node = nodes[id]
      if (node) {
        const path = this.getDocLocalPath(node)
        const parent = window.api.path.join(path, '..')
        if (!window.api.fs.existsSync(parent)) {
          window.api.fs.mkdirSync(parent, { recursive: true })
        }
        if (!node.folder) {
          // const res = await this.store.output.toMarkdown({
          //   node,
          //   exportRootPath: this.store.tree.root.filePath
          // })
          // await window.api.fs.writeFile(path, res.md, { encoding: 'utf-8' })
        }
      }
    }
    this.rewriteNode.clear()
  }
  localRename(from: string, node: IDoc) {
    if (!this.saveLocal) return
    const to = this.getDocLocalPath(node)
    if (window.api.fs.existsSync(from)) {
      const parent = window.api.path.join(to, '..')
      if (!window.api.fs.existsSync(parent)) {
        window.api.fs.mkdirSync(parent, { recursive: true })
      }
      window.api.fs.renameSync(from, to)
    }
    this.localWriteNode(node)
  }

  async showInFinder(doc: IDoc) {
    if (!this.saveLocal) {
      this.store.note.openConfirmDialog$.next({
        title: 'Kind tips',
        description:
          'After setting up a workspace to bind a folder, you can use "Reveal in Finder"',
        okText: 'Go to Settings',
        okType: 'primary',
        onConfirm: () => {
          this.store.note.openEditSpace$.next(this.store.note.state.currentSpace?.id!)
        }
      })
    } else {
      const path = this.store.note.getDocPath(doc)
      window.api.fs.showInFinder(window.api.path.join(this.writePath!, path.join('/'), '.md'))
    }
  }

  public async copyFile(filePath: string) {
    const name = nid() + window.api.path.extname(filePath)
    // @ts-ignore
    return new File([(await window.api.fs.readFile(filePath)).buffer], name, {
      type: window.api.fs.lookup(filePath) || undefined
    })
  }
  async getSingleDocSchemaByMd(md: string) {
    const parser = await this.getMdParser()
    const schema = parser(md)
    const deepFilter = async (schema: any[], filterData: any[] = []) => {
      for (let item of schema) {
        if (item.type === 'media') {
          if (!item.url || !/^https?:\/\//.test(item.url)) {
            continue
          }
        }
        if (item.text && (!item.url || !item.url.startsWith('https'))) {
          delete item.url
        }
        if (item.children) {
          item.children = await deepFilter(item.children)
        }
        filterData.push(item)
      }
      return filterData
    }
    return deepFilter(schema)
  }
  async newDocFromlocal(parentNode: IDoc) {
    try {
      let md = '',
        name = ''
      const res = await this.store.system.showOpenDialog({
        filters: [{ name: 'md', extensions: ['md'] }]
      })
      if (!res.filePaths.length) {
        throw new Error()
      }
      md = window.api.fs.readFileSync(res.filePaths[0], { encoding: 'utf-8' })
      name = window.api.path.basename(res.filePaths[0])
      const schema = await this.getSingleDocSchemaByMd(md)
      name = name.replace(/\.md$/, '')
      // name = this.store.menu.getCreateName(parentNode, name)
      // this.store.menu.createDoc({
      //   parent: parentNode,
      //   newName: name,
      //   schema
      // })
    } catch (e) {}
  }

  async initialRewrite(nodes: Record<string, IDoc>) {
    if (this.saveLocal) {
      try {
        const { join } = window.api.path
        window.api.fs.readdirSync(this.writePath!)
        for (const node of Object.values(nodes)) {
          if (!node.folder && node.schema) {
            try {
              const target = join(
                this.writePath!,
                this.store.note.getDocPath(node).join('/'),
                '.md'
              )
              if (!window.api.fs.existsSync(target)) {
                const parent = join(target, '..')
                if (!window.api.fs.existsSync(parent)) {
                  window.api.fs.mkdirSync(parent, { recursive: true })
                }
                // const res = await this.store.output.toMarkdown({
                //   node,
                //   exportRootPath: this.writePath!
                // })
                // await window.api.fs.writeFile(target, res.md, { encoding: 'utf-8' })
              }
            } catch (e) {
              console.error('write err', e)
            }
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
  }
}
