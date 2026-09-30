import { autoUpdater } from 'electron-updater'

// Ruled by Ethan 2026-09-30: this is a maintained fork built from source, so the app must never
// replace itself with upstream's release. electron-updater defaults to downloading on check and
// installing on quit, which would silently undo the fork, so nothing is checked or downloaded.
// autoUpdater.setFeedURL({ url: 'https://api.hayase.watch/staging/files', provider: 'generic' })
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

export default class Updater {
  hasUpdate = false

  constructor () {
    autoUpdater.on('update-downloaded', () => {
      this.hasUpdate = true
    })
  }

  install (forceRunAfter = false) {
    if (this.hasUpdate) {
      autoUpdater.quitAndInstall(true, forceRunAfter)
      this.hasUpdate = false
      return true
    }
    return false
  }
}
