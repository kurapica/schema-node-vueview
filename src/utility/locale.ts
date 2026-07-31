import enUS from "../locale/enUS.json"
import zhCN from "../locale/zhCN.json"
import { subscribeLanguage, type LocaleFunction, getLocaleProxy, importLanguage, type LocaleString, Entry } from "schema-node-core"
import { ref } from "vue"

/** reactive locale function */
export const _L = ref<LocaleFunction>(getLocaleProxy());

// force reload to force re-render
subscribeLanguage((lang: string) => _L.value = getLocaleProxy());

importLanguage("enUS", enUS)
importLanguage("zhCN", zhCN)

// ── Supported languages ────────────────────────────────────────────────────
// Each entry is an Entry<string> (value = language code like "zhCN") carrying an
// optional `display` LocaleString for localized labels. Concrete projects (e.g.
// schema-node-man) configure the supported list via setLanguageEntries().
let languageEntries: Entry<string>[] = []

/**
 * Configure the supported language entries.
 * Called by host projects to declare which languages the locale string editor supports.
 */
export function setLanguageEntries(entries: Entry<string>[]) {
  languageEntries = entries
}

/**
 * Get the supported language entries.
 * Returns Entry<string>-compatible entries; use `display` for localized labels.
 */
export function getLanguageEntries(): Entry<string>[] {
  return languageEntries
}
