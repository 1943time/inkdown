import { ElectronAPI } from '@electron-toolkit/preload'
import {IThemedToken} from 'shiki'
import {dialog} from 'electron'
import * as fs from 'fs/promises'
import {AliApi} from './sdk/ali'
import {Sdk} from './sdk'
import nodeFetch, {RequestInit, Response} from 'node-fetch'
import {api} from './api'
declare global {
  interface Window {
    electron: ElectronAPI
    api: typeof api
  }
}
