import { subscribeLanguage, type LocaleFunction, getLocaleProxy } from "schema-node-core"
import { ref } from "vue"

/** reactive locale function */
export const _L = ref<LocaleFunction>(getLocaleProxy());

// force reload to force re-render
subscribeLanguage((lang: string) => _L.value = getLocaleProxy());
