import { subscribeLanguage } from "schema-node"
import { ref } from "vue"
import { type ILocaleString, LocaleFunction } from "schema-node"

export const _L = ref<LocaleFunction>(new Proxy(function(key: string | ILocaleString):string { return ""} as LocaleFunction, {}))

subscribeLanguage((lang: string, locale: {[key:string]: string}) => {
    // force reload
    _L.value = new Proxy(function(key: string) { return locale[key] ?? key } as LocaleFunction, {
        get (target, prop) {
            if (typeof(prop) === "string")
            {
                if (prop in locale) return locale[prop]
                return prop
            }
        },
        apply(target, thisArg, args) {
            let [key, prop] = args
            
            if (!key) return ""
            if (typeof(key) === "string")
            {
                if (key in locale) return locale[key]
                return key
            }
            else if(typeof(key) === "object") 
            {
                const l = key as ILocaleString
                const tran = l.trans?.find(t => lang.startsWith(t.lang) || t.lang.startsWith(lang))
                return tran?.tran || locale[l.key] || l.key
            }
        }
    })
})