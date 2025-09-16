import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

const maybeLoadUmami = () => {
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
  const scriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL
  const hostUrl = import.meta.env.VITE_UMAMI_HOST_URL
  console.log('maybeLoadUmami', { websiteId, scriptUrl })
  if (!websiteId || !scriptUrl) {
    console.log('Umami not configured: VITE_UMAMI_WEBSITE_ID or VITE_UMAMI_SCRIPT_URL is missing')
    return
  }

  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-website-id="${websiteId}"][data-umami="true"]`
  )
  if (existing) {
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.defer = true
  script.dataset.websiteId = websiteId
  script.dataset.umami = 'true'
  script.src = scriptUrl
  document.head.appendChild(script)
  console.log('Umami script loaded:', script.src, 'hostUrl:', hostUrl || '(not set)')
}

const app = createApp(App)

app.use(router)

app.mount('#app')

maybeLoadUmami()
