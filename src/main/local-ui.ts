import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { net, type Session } from 'electron'
import log from 'electron-log/main'

import store from './store.ts'

// Ruled by Ethan 2026-09-30: this is a maintained fork, so the UI (../interface) is built and shipped
// inside the app instead of being loaded from upstream's server. It is served under the remote UI's
// own origin, which keeps the profile's IndexedDB, local storage and logins exactly as they were.
// Every other https request is forwarded untouched; measured 2026-09-30 on Electron 44: the session's
// webRequest listeners still fire for forwarded requests, and the page is cross-origin isolated.
export const UI_HOST = 'ui-staging.hayase.app'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.mkv': 'video/x-matroska',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
}

/** The built UI to serve: the copy packaged into the app, or the sibling checkout's build when running unpackaged. */
export function findLocalUi (): string | null {
  const candidates = [join(process.resourcesPath, 'ui'), resolve(__dirname, '../../../interface/build')]
  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.html'))) return resolve(dir)
  }
  return null
}

export async function serveLocalUi (root: string, ses: Session) {
  // The build id is the hash of index.html, which embeds every asset hash. When it changes, the
  // previous build's service worker and precache are dropped so the first load is the new build;
  // IndexedDB and local storage are not touched.
  const build = createHash('sha256').update(readFileSync(join(root, 'index.html'))).digest('hex').slice(0, 16)
  if (store.get('localUiBuild') !== build) {
    await ses.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] })
    store.set('localUiBuild', build)
    log.info(`[local-ui] new UI build ${build}, cleared the previous service worker and cache`)
  }

  ses.protocol.handle('https', request => {
    const url = new URL(request.url)
    if (url.host !== UI_HOST) return net.fetch(request, { bypassCustomProtocolHandlers: true })
    return serveFile(root, url.pathname)
  })
  log.info(`[local-ui] serving ${root} as https://${UI_HOST}/ (build ${build})`)
}

async function serveFile (root: string, pathname: string): Promise<Response> {
  let file: string
  try {
    file = normalize(join(root, decodeURIComponent(pathname)))
  } catch {
    file = root
  }
  // The UI uses a hash router, so any path that is not a file in the build is the app shell.
  if (!file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html')

  const res = await net.fetch(pathToFileURL(file).toString())
  const headers = new Headers(res.headers)
  headers.set('content-type', MIME[extname(file).toLowerCase()] ?? headers.get('content-type') ?? 'application/octet-stream')
  // The same isolation headers the remote UI is served with: jassub and the wasm audio decoders need SharedArrayBuffer.
  headers.set('cross-origin-opener-policy', 'same-origin')
  headers.set('cross-origin-embedder-policy', 'credentialless')
  headers.set('cache-control', file.includes(`${sep}_app${sep}immutable${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache')
  return new Response(res.body, { status: res.status, headers })
}
