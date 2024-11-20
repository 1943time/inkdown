import {message$} from '../../utils/index'
import ky from 'ky'
import { Core } from '../core'

export class ImageBed {
  constructor(
    private readonly core: Core
  ) {}
  route = ''
  initial() {
    if (this.core.config.state.turnOnImageBed) {
      this.route = localStorage.getItem('pick-route') || ''
    }
  }
  async uploadFile(files: {name: string, data: ArrayBuffer}[]) {
    message$.next({
      type: 'loading',
      content: 'uploading'
    })
    const form = new FormData()
    for (let f of files) {
      form.append(f.name, new File([f.data], f.name))
    }
    try {
      const res = await ky.post(this.route, {
        body: form
      }).json<{
        success: boolean
        message?: string
        fullResult: {
          imgUrl: string
        }[]
      }>()
      if (!res.success) {
        setTimeout(() => {
          message$.next({
            type: 'warning',
            content: res.message || 'upload failed'
          })
        }, 100)
      } else {
        return res.fullResult
      }
    } catch (e: any) {
      setTimeout(() => {
        message$.next({
          type: 'warning',
          content: e?.message || 'upload failed'
        })
      }, 100)
    } finally {
      message$.next('destroy')
    }
    return null
  }
}
