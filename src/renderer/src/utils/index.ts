import {existsSync, readFileSync, statSync} from 'fs'
import {extname, join} from 'path'
import {treeStore} from '../store/tree'
import {mediaType} from '../editor/utils/dom'
import {Subject} from 'rxjs'
import {ArgsProps} from 'antd/es/message'

const kb = 1024
const mb = kb * 1024
const gb = mb * 1024
export const sizeUnit = (size: number) => {
  size = Number(size)
  if (size > gb) return (size / gb).toFixed(2) + ' GB'
  if (size > mb) return (size / mb).toFixed(2) + ' MB'
  if (size > kb) return (size / kb).toFixed(2) + ' KB'
  return size + ' B'
}

export const stat = (filePath: string) => {
  try {
    return statSync(filePath)
  } catch (e) {
    return null
  }
}

export const getImageData = (filePath: string = '') => {
  const dev = process.env.NODE_ENV === 'development'
  if (existsSync(filePath)) {
    if (dev && mediaType(filePath) === 'image') {
      const base64 = readFileSync(filePath, {'encoding': 'base64'})
      return `data:image/${extname(filePath).slice(1)};base64,${base64}`
    } else {
      return `file://${filePath}`
    }
  } else {
    return
  }
}


export const download = (data: Blob | Uint8Array, fileName: string) => {
  data = data instanceof Uint8Array ? new Blob([data]) : data
  const link = document.createElement('a')
  if (link.download !== undefined) {
    const url = URL.createObjectURL(data)
    link.addEventListener('click', e => e.stopPropagation())
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export const message$ = new Subject<ArgsProps>()


export const encodeHtml = (str: string) => {
  const encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;'},
    matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
  return str.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m; })
}
