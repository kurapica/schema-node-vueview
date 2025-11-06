import { subscribeLanguage, isNull, type ILocaleString, LocaleFunction, localeStringToString } from "schema-node"
import { ref } from "vue"

export const _L = ref<LocaleFunction>(new Proxy(function(key: string | ILocaleString):string { return ""} as LocaleFunction, {}))

subscribeLanguage((lang: string, locale: {[key:string]: string}) => {
    // force reload
    _L.value = new Proxy(function(key: string) { return locale[key] ?? key } as LocaleFunction, {
        get (target, prop) {
            return typeof(prop) === "string" && prop in locale ? locale[prop] : prop
        },
        apply(target, thisArg, args) {
            let [key] = args
            return localeStringToString(key)
        }
    })
})