import enUS from "../locale/enUS.json"
import zhCN from "../locale/zhCN.json"
import { subscribeLanguage, type LocaleFunction, getLocaleProxy, importLanguage } from "schema-node-core"
import { ref } from "vue"

/** reactive locale function */
export const _L = ref<LocaleFunction>(getLocaleProxy());

// force reload to force re-render
subscribeLanguage((lang: string) => _L.value = getLocaleProxy());

importLanguage("enUS", enUS)
importLanguage("zhCN", zhCN)