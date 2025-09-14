import { AnySchemaNode, subscribeLanguage } from "schema-node"
import { ref } from "vue"

export const _L = ref<{[key:string]: string}>({})
const _Label = ref<Map<AnySchemaNode, string>>(new Map())
const _Desc = ref<Map<AnySchemaNode, string>>(new Map())
const _InputPlaceHolder = ref<Map<AnySchemaNode, string>>(new Map())
const _SelectPlaceHolder = ref<Map<AnySchemaNode, string>>(new Map())

subscribeLanguage((_: string, locale: {[key:string]: string}) => {
    _L.value = new Proxy(locale, {
        get (target, prop) {
            if (typeof(prop) === "string")
            {
                if (prop in target)
                    return target[prop]
                return prop
            }
        }
    })
    _Label.value = new Proxy(new Map(), {
        get (target, prop: any) {
            if (prop === "get")
            {
                return (key: AnySchemaNode) => {
                    return `${key?.config.display || ""}` + `${key?.unit ? `(${key.unit})` : ``}`
                }
            }
            if (typeof(prop) === "object")
            {
                return (prop?.display || "") + `${prop?.unit ? `(${prop.unit})` : ``}`
            }
        }
    })
    _Desc.value = new Proxy(new Map(), {
        get (target, prop: any) {
            if (prop === "get")
            {
                return (key: AnySchemaNode) => {
                    return `${key?.config.desc || ""}`
                }
            }
            if (typeof(prop) === "object")
            {
                return prop?.desc
            }
        }
    })
    _InputPlaceHolder.value = new Proxy(new Map(), {
        get (target, prop: any) {
            if (prop === "get")
            {
                return (key: AnySchemaNode) => {
                    return key?.inputPlaceHolder
                }
            }
            if (typeof(prop) === "object")
            {
                return prop?.inputPlaceHolder
            }
        }
    })
    _SelectPlaceHolder.value = new Proxy(new Map(), {
        get (target, prop: any) {
            if (prop === "get")
            {
                return (key: AnySchemaNode) => {
                    return key?.selectPlaceHolder
                }
            }
            if (typeof(prop) === "object")
            {
                return prop?.selectPlaceHolder
            }
        }
    })
})

export function getNodeLabel(node: AnySchemaNode)
{
    return _Label.value.get(node)
}

export function getNodeDesc(node: AnySchemaNode)
{
    return _Desc.value.get(node)
}

export function getInputPlaceHolder(node: AnySchemaNode)
{
    return _InputPlaceHolder.value.get(node)
}

export function getSelectPlaceHolder(node: AnySchemaNode)
{
    return _SelectPlaceHolder.value.get(node)
}