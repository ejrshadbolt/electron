// import { platform, arch } from 'node:process'

import { app } from 'electron'

import store from './store.ts'

// const IS_LINUX = ['linux', 'freebsd', 'openbsd', 'netbsd', 'dragonfly', 'sunos'].includes(platform)

const flags: Array<[string, string | undefined] | [string]> = [
  // not sure if safe?
  ['disable-gpu-sandbox'], ['disable-direct-composition-video-overlays'], ['double-buffer-compositing'], ['enable-zero-copy'], ['ignore-gpu-blocklist'],
  ['force_high_performance_gpu'],
  // ['force-gpu-mem-available-mb=2048'],
  // should be safe
  ['enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay'],
  // safe performance and compatibility stuff
  ['enable-features', 'PlatformEncryptedDolbyVision,CanvasOopRasterization,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,UseSkiaRenderer,WebAssemblyLazyCompilation,FluentOverlayScrollbar,FluentOverlayScrollbars,WindowsScrollingPersonality,AutoPictureInPictureForVideoPlayback'], // + (IS_LINUX ? ',Vulkan,VulkanFromANGLE' : '')
  // disabling shit widget layering aka right click context menus [I think] for macOS [I think]
  ['disable-features', 'WidgetLayering'], // ,MediaEngagementBypassAutoplayPolicies,PreloadMediaEngagementData,RecordMediaEngagementScores might not be good,
  // HTMLMediaElement.audioTracks / videoTracks. Upstream used to enable this here and in the window's
  // enableBlinkFeatures, then moved it into their private patched Electron build (b384bb6, "multi-track
  // hack"). This local build runs stock Electron, where the API is off by default, so without this flag
  // the player never sees a second audio track: no Audio menu, and no way to pick the Japanese track on
  // dual-audio releases. A command-line switch rather than webPreferences because upstream noted the
  // per-window setting is ignored when the first load is served by the UI's service worker under COEP.
  // Chosen here, not ruled (2026-09-30). Measured on stock Electron 44.3.0 with a five-track MKV: the
  // flag exposes every track Chromium can decode and switching between them works.
  ['enable-blink-features', 'AudioVideoTracks'],
  // utility stuff, aka website security that's useless for a native app:
  ['autoplay-policy', 'no-user-gesture-required'], ['disable-notifications'], ['disable-logging'], ['disable-permissions-api'], ['no-zygote'],
  // bypasses W3C API permissions which require visiblity to run, IE local fonts, this DOES NOT disable background throttling and thus doesnt break pause on lost visibility
  ['disable-renderer-backgrounding'],
  // chromium throttles stuff if it detects slow network, nono, this is native, dont do that
  ['force-effective-connection-type', '4G'],
  // image video etc cache, hopefully lets video buffer more and remembers more images, might be bad to touch this?
  ['disk-cache-size', '500000000'],
  // custom angle setting
  ['use-angle', store.get('angle') || 'default']
]

// if (IS_LINUX || (platform === 'win32' && arch === 'arm64') || store.get('unsafeWebGPU')) {
//   flags.push(['enable-unsafe-webgpu'])
// }

for (const [flag, value] of flags) {
  app.commandLine.appendSwitch(flag, value)
}

// mainWindow.setThumbarButtons([
//   {
//     tooltip: 'button1',
//     icon: nativeImage.createFromPath('path'),
//     click () { console.log('button1 clicked') }
//   }, {
//     tooltip: 'button2',
//     icon: nativeImage.createFromPath('path'),
//     click () { console.log('button2 clicked.') }
//   }
// ])
