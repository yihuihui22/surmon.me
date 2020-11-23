import './polyfill'

import { createWebHistory } from 'vue-router'
import { MUSIC_ALBUM_ID, GA_MEASUREMENT_ID, ADSENSE_CLIENT_ID } from '/@/config/app.config'
import { isProd, isSSR } from './environment'
import { Language } from '/@/language/data'
import { getFileCDNUrl } from '/@/transforms/url'
import gtag from './services/gtag'
import adsense from '/@/services/adsense'
import swiper from '/@/services/swiper'
import { getClientLocalTheme, Theme } from '/@/services/theme'
import { createDefer } from '/@/services/defer'
import { createMusic } from '/@/services/music'
import { createPopup } from '/@/services/popup'
import { createLoading } from '/@/services/loading'
import { consoleSlogan } from '/@/services/slogan'
import { enableCopyright } from '/@/services/copyright'
import { enableBaiduSeoPush } from '/@/services/baidu-seo-push'
import { enableAutoTitleSurprise } from './services/title-surprise'
import { exportAppToGlobal } from '/@/services/exporter'
import { exportLozadToGlobal } from '/@/services/lozad'
import { createVueApp } from './main'

import '/@/assets/styles/app.scss'

const { app, router, globalState, theme, i18n, helmet, store } = createVueApp({
  historyCreator: createWebHistory,
  language: navigator.language,
  userAgent: navigator.userAgent,
  theme: getClientLocalTheme()
})

const music = createMusic({ albumId: MUSIC_ALBUM_ID, autoStart: false })
const defer = createDefer()
const loading = createLoading()

app.use(swiper)
app.use(music)
app.use(loading, { exportToGlobal: true })
app.use(defer, { exportToGlobal: true })
app.use(createPopup(), { exportToGlobal: true })
app.use(adsense, { ID: ADSENSE_CLIENT_ID, enabledAutoAD: true })
app.use(gtag, {
  router,
  id: GA_MEASUREMENT_ID,
  customResourceURL: getFileCDNUrl('/scripts/gtag.js'),
})

// init
router.beforeEach((_, __, next) => {
  loading.start()
  next()
})
router.afterEach((_, __, failure) => {
  failure
    ? loading.fail(failure)
    : loading.finish()
})
globalState.resetOnClient()
i18n.set(globalState.userAgent.isZhUser ? Language.Zh : Language.En)
helmet.bindClient()
store.clientInit()
exportLozadToGlobal()
exportAppToGlobal(app)

// PC -> bind system switch
// Mobile -> reset to default
globalState.userAgent.isMobile
  ? theme.set(Theme.Default)
  : theme.bindClientSystem()

// mount (isHydrate -> (SSR -> true | SPA -> false))
app.mount('#app', isSSR).$nextTick(() => {
  // Desktop
  if (!globalState.userAgent.isMobile) {
    defer.addTask(music.start)
    enableAutoTitleSurprise()
  }

  // Production
  if (isProd) {
    enableCopyright()
    enableBaiduSeoPush(router)
    consoleSlogan(i18n)
  }
})