<template>
    <span v-if="state.readonly && plainText" :style="{'width': '100%', 'display': 'inline-block', 'text-align': plainText === true ? 'center' : plainText }">
        {{ state.display || placeHolder }}
    </span>
    <el-select
        v-else-if="state.useWhiteList"
        v-model="data"
        style="width: 100%;"
        :disabled="state.disable"
        :clearable="!state.require"
        :filterable="state.asSuggest"
        :allow-create="state.asSuggest"
        :default-first-option="state.asSuggest"
        :placeholder="placeHolder || node.selectPlaceHolder">
        <el-option
            v-for="item in state.whiteList"
            :key="typeof(item) === 'object' ? item.value : item"
            :label="typeof(item) === 'object' ? item.label : item"
            :value="typeof(item) === 'object' ? item.value : item">
        </el-option>
    </el-select>
    <el-input
        v-else
        v-model="data"
        :disabled="state.disable"
        style="width: 100%;"
        :placeholder="!state.readonly && !isNull(state.default) && `${state.default}` || placeHolder || node.inputPlaceHolder">
    ></el-input>
</template>

<script lang="ts" setup>
import { isNull, ScalarNode } from 'schema-node'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

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
    placeHolder?: string,
}>()

// display state
const state = reactive<{
    default?: any,
    display?: any,
    disable?: boolean,
    require?: boolean,
    asSuggest?: boolean,
    readonly?: boolean,
    useWhiteList?: boolean,
    whiteList?: any[]
}>({})

// Data
const inputdata = ref<string>("")
const data = computed({
    get (): any {
        inputdata.value
    },
    set(value: any) {
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

// data & state watcher
let dataWatcher: Function | null = null
let stateWatcher: Function | null = null

onMounted(() => {
    const node = props.node
    dataWatcher = node.subscribe(() => {
        const data = node.data
        state.display = `${data}`
        inputdata.value = isNull(data) ? "" : ("" + data)
    }, true)

    stateWatcher = node.subscribeState(() => {
        state.default = node.rule.default
        state.disable = node.rule.disable
        state.readonly = node.require
        state.asSuggest = node.rule.asSuggest || false
        state.readonly = node.readonly

        if (node.rule.whiteList)
        {
            state.useWhiteList = true
            let whiteList = node.rule.whiteList
            const blackList = node.rule.blackList
            if (blackList && blackList.length)
                whiteList = whiteList.filter(w => typeof(w) === "object" ? blackList.findIndex(b => `${b}` === `${w.value}`) < 0 : blackList.findIndex(b => `${b}` === `${w}`) < 0) as any
            state.whiteList = whiteList
        }
        else
        {
            state.useWhiteList = false
            state.whiteList = []
        }
    }, true)
})

onUnmounted(() => {
    if (dataWatcher) dataWatcher()
    if (stateWatcher) stateWatcher()
})

</script>