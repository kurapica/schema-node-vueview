<template>
    <span v-if="state.readonly && plainText" :style="{'width': '100%', 'display': 'inline-block', 'text-align': plainText === true ? 'center' : plainText }">
        {{ state.display }}
    </span>
    <el-select
        v-else-if="state.useWhiteList"
        v-model="data"
        style="width: 100%;min-width: 60px;"
        :disabled="state.readonly || state.disable"
        :clearable="!state.require"
        :filterable="state.asSuggest"
        :allow-create="state.asSuggest"
        :default-first-option="state.asSuggest"
        :placeholder="getSelectPlaceHolder(scalarNode)">
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
        :disabled="state.readonly || state.disable"
        style="width: 100%;"
        :placeholder="!state.readonly && !isNull(state.default) && `${state.default}` || getInputPlaceHolder(scalarNode)">
    ></el-input>
</template>

<script lang="ts" setup>
import { isNull, ScalarNode } from 'schema-node'
import { computed, onMounted, onUnmounted, reactive, toRaw } from 'vue'
import { getInputPlaceHolder, getSelectPlaceHolder } from '../locale';

// Define props
const props = defineProps<{
    /**
     * Scalar schema node
     */
    node: ScalarNode,

    /**
     * Display readon only value as plain text
     */
    plainText?: any
}>()
const scalarNode = toRaw(props.node)

// display state
const state = reactive<{
    data?: any,
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
const data = computed({
    get (): any {
        return state.data
    },
    set(value: any) {
        scalarNode.data = value
    }
})

// data & state watcher
let dataWatcher: Function | null = null
let stateWatcher: Function | null = null

onMounted(() => {
    const node = scalarNode
    dataWatcher = node.subscribe(() => {
        const data = node.rawData
        state.data = data
        state.display = `${!isNull(data) ? data : ''}`
    }, true)

    stateWatcher = node.subscribeState(() => {
        state.default = node.rule.default
        state.disable = node.rule.disable
        state.require = node.require
        state.asSuggest = node.rule.asSuggest || false
        state.readonly = node.readonly

        if (node.rule.whiteList?.length)
        {
            state.useWhiteList = true
            let list = [...node.rule.whiteList]
            const blackList = node.rule.blackList
            if (blackList && blackList.length)
                list = list.filter(w => typeof(w) === "object" ? blackList.findIndex(b => `${b}` === `${w.value}`) < 0 : blackList.findIndex(b => `${b}` === `${w}`) < 0) as any
            state.whiteList = list
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