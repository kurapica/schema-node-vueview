<template>
    <span v-if="state.readonly && plainText" :style="{'width': '100%', 'display': 'inline-block', 'text-align': plainText === true ? 'center' : plainText }">
        {{ state.display }}
    </span>
    <el-select
        v-else-if="state.useWhiteList"
        v-model="data"
        style="width: 100%;min-width: 120px;"
        :disabled="state.readonly || state.disable"
        :clearable="!state.require"
        :filterable="state.asSuggest"
        :allow-create="state.asSuggest"
        :remote="state.enableRemote"
        :remote-method="remoteHanlder"
        :default-first-option="state.asSuggest"
        :placeholder="scalarNode.selectPlaceHolder">
        <el-option
            v-for="item in state.whiteList?.filter(w => !isNull(typeof(w) === 'object' ? w.value : w))"
            :key="typeof(item) === 'object' ? item.value : item"
            :label="typeof(item) === 'object' ? _L(item.label) : item"
            :value="typeof(item) === 'object' ? item.value : item">
        </el-option>
    </el-select>
    <el-input
        v-else
        v-model="data"
        :disabled="state.readonly || state.disable"
        style="width: 100%;"
        :placeholder="!state.readonly && !isNull(state.default) && `${state.default}` || scalarNode.inputPlaceHolder">
    >
        <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
            <component :is="slot" v-bind="slotProps" />
        </template>
    </el-input>
</template>

<script lang="ts" setup>
import { isNull, RelationType, ScalarNode, NODE_SELF } from 'schema-node'
import { computed, onMounted, onUnmounted, reactive, toRaw, useSlots } from 'vue'
import { _L } from '../locale';

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

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]

// display state
const state = reactive<{
    data?: any,
    default?: any,
    display?: any,
    disable?: boolean,
    require?: boolean,
    changed?: boolean,
    asSuggest?: boolean,
    enableRemote?: boolean,
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

const remoteHanlder = (value:string) => {
    if (value) data.value = value
}

// data & state watcher
let dataWatcher: Function | null = null
let stateWatcher: Function | null = null

onMounted(() => {
    const node = scalarNode
    dataWatcher = node.subscribe(() => {
        const data = node.rawData
        state.data = data
        state.display = `${!isNull(data) ? data : ''}`
        state.changed = node.changed
    }, true)

    stateWatcher = node.subscribeState(() => {
        const whiteListPush = node.ruleSchema?.pushSchemas?.find((p:any) => p.type === RelationType.WhiteList)

        state.default = node.rule.default
        state.disable = node.rule.disable
        state.require = node.require
        state.asSuggest = node.rule.asSuggest || false
        state.readonly = node.readonly
        state.enableRemote = state.asSuggest && whiteListPush?.args?.find((a:any) => a.field === NODE_SELF || a.field === node.name) ? true : false

        if (node.rule.whiteList?.length || whiteListPush)
        {
            state.useWhiteList = true
            let list = node.rule.whiteList?.length ? [...node.rule.whiteList] : node.rule.asSuggest ? [node.rawData] : []
            const blackList = node.rule.blackList
            if (blackList && blackList.length)
                list = list.filter(w => typeof(w) === "object" ? blackList.findIndex((b:any) => `${b}` === `${w.value}`) < 0 : blackList.findIndex((b:any) => `${b}` === `${w}`) < 0) as any
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