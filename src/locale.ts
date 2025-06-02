import { subscribeLanguage } from "schema-node"
import { ref } from "vue"

const _L = ref<{[key:string]: string}>({})

subscribeLanguage((_: string, locale: {[key:string]: string}) => _L.value = locale)

export default _L