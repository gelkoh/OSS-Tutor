import { createApp, ref } from "vue"
import { createPinia } from "pinia"
import App from "./App.vue"
import hljs from "highlight.js"
import hljsVuePlugin from "@highlightjs/vue-plugin"
import "highlight.js/styles/github-dark.css"

import "devicon/devicon.min.css"

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(hljsVuePlugin)

app.config.globalProperties.$appName = "OSSTutor"

app.mount("#app")
