<template>

</template>

<script lang="ts" setup>
import { isNull, ScalarNode } from 'schema-node'
import { computed, onMounted, onUnmounted, ref } from 'vue';

// Define props
const props = defineProps<{
    /**
     * Scalar schema node
     */
    node: ScalarNode,

    /**
     * Display readon only value as plain text
     */
    plainText?: any, 
    
    /**
     * The place holder
     */
    placeholder?: string,
}>()

// Data
const inputdata = ref<string>("")
const data = computed({
    get (){
        inputdata.value
    },
    set(value) {
        inputdata.value = "" + value
        const node = props.node
        if (node.isNumber && inputdata.value !== "")
        {
            const res = Number(inputdata.value)
            if (Number.isFinite(res))
                node.data = res
            else
                node.data = inputdata.value
        }
        else
        {
            node.data = inputdata.value
        }
    }
})

// whitelist
const asSuggest = ref(false)
const useWhiteList = ref(false)
const whiteListRef = ref<any[]>([])
let backup: any = null

// data & state watcher
let dataWatcher: Function | null = null
let stateWatcher: Function | null = null

onMounted(() => {
    const node = props.node
    dataWatcher = node.subscribe(() => {
        const data = node.data
        inputdata.value = isNull(data) ? "" : ("" + data)
    }, true)
    stateWatcher = node.subscribeState(() => {
        asSuggest.value = node.rule.asSuggest || false
        if (node.rule.whiteList)
        {
            useWhiteList.value = true
            let whiteList = node.rule.whiteList
            const blackList = node.rule.blackList
            if (blackList && blackList.length)
                whiteList = whiteList.filter(w => typeof(w) === "object" ? blackList.findIndex(b => `${b}` === `${w.value}`) < 0 : blackList.findIndex(b => `${b}` === `${w}`) < 0) as any

            whiteListRef.value = whiteList
        }
        else
        {
            useWhiteList.value = false
            whiteListRef.value = []
        }
    }, true)
})

onUnmounted(() => {
    if (dataWatcher) dataWatcher()
    if (stateWatcher) stateWatcher()
})

</script>