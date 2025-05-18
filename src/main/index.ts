import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { Bound, createWindow, lastCloseWindow, winMap } from './window'
import { knex } from './database/model'
import { modelReady } from './database/api'
import './handle'
import { registerUpdate } from './update'
app.whenReady().then(() => {
  modelReady()
  electronApp.setAppUserModelId('com.inkdown')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  knex('setting')
    .where('key', 'windows')
    .first()
    .then((row) => {
      if (row) {
        try {
          const data = JSON.parse(row.value)
          for (const item of data) {
            createWindow(item)
          }
        } catch (e) {
          createWindow()
        }
      }
    })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  registerUpdate()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  const wins = BrowserWindow.getAllWindows()
  let data: Bound[] = []
  if (wins.length) {
    for (const w of wins) {
      const bound = w.getBounds()
      data.push({
        width: bound.width,
        height: bound.height,
        x: bound.x,
        y: bound.y,
        id: winMap.get(w),
        focus: w.isFocused()
      })
    }
  } else if (lastCloseWindow) {
    data.push(lastCloseWindow)
  }
  const row = await knex('setting').where('key', 'windows').first()
  if (row) {
    return knex('setting')
      .where('key', 'windows')
      .update({ value: JSON.stringify(data) })
  }
  return knex('setting').insert({ key: 'windows', value: JSON.stringify(data) })
})
