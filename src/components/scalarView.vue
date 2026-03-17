<template>
    <span v-if="(disabled || state.readonly) && plainText" :style="{'width': '100%', 'display': 'inline-block', 'text-align': plainText === true ? 'center' : plainText }">
        {{ state.whiteList ? _L(state.whiteList.find(w => typeof(w) == 'object' && w.value == state.display)?.label ?? state.display) : state.display }}
    </span>
    <template v-else-if="state.useWhiteList">
        <el-select
            v-if="!state.cascade"
            v-model="data"
            style="width: 100%;min-width: 120px;"
            :disabled="disabled || state.readonly || state.disable"
            :clearable="!state.require"
            :filterable="state.asSuggest"
            :allow-create="state.asSuggest"
            :remote="state.enableRemote"
            :remote-method="remoteHanlder"
            :default-first-option="state.asSuggest"
            :placeholder="state.selectPlaceHolder"
            v-bind="$attrs">
            <el-option
                v-for="item in state.whiteList?.filter(w => !isNull(typeof(w) === 'object' ? w.value : w))"
                :key="typeof(item) === 'object' ? item.value : item"
                :label="typeof(item) === 'object' ? _L(item.label) : item"
                :value="typeof(item) === 'object' ? item.value : item">
            </el-option>
        </el-select>
        <el-cascader v-else
            v-model="data"
            style="width: 100%;min-width: 120px"
            :options="state.whiteList"
            :props="{
                emitPath: false,
                checkStrictly: state.anyLevel,
                multiple: false,
                lazy: false
            }"
            :placeholder="state.selectPlaceHolder"
            :disabled="disabled || state.readonly"
            :clearable="!state.require"
            v-bind="$attrs"
        ></el-cascader>
    </template>
    <el-input
        v-else
        v-model="data"
        :disabled="disabled || state.readonly || state.disable"
        style="width: 100%;"
        :placeholder="!state.readonly && !isNull(state.default) && `${state.default}` || state.inputPlaceHolder"
        v-bind="$attrs">
        <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
            <component :is="slot" v-bind="slotProps" />
        </template>
    </el-input>
</template>

<script lang="ts" setup>
import { isNull, RelationType, ScalarNode, NODE_SELF, ScalarRule, subscribeLanguage } from 'schema-node'
import { computed, onMounted, onUnmounted, reactive, toRaw, useSlots } from 'vue'
import { _L } from '../locale'

// Define props
const props = defineProps<{
    /**
     * Scalar schema node
     */
    node: ScalarNode,

    /**
     * Display readon only value as plain text alignment. false - not use plain text display, 'left' | 'center' | 'right' - alignment
     */
    disabled?: boolean,

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
    whiteList?: any[],
    cascade?: boolean,
    anyLevel?: boolean,
    inputPlaceHolder?: string
    selectPlaceHolder?: string
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
let langWatcher: Function | null = null

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

        if (node.rule.whiteList?.length || node.rule.entries?.length || whiteListPush && !state.asSuggest)
        {
            state.useWhiteList = true
            let list = node.rule.whiteList?.length ? [...node.rule.whiteList] : node.rule.entries?.length ? [...node.rule.entries] : node.rule.asSuggest ? [node.rawData] : []
            const blackList = node.rule.blackList
            if (blackList && blackList.length)
                list = list.filter(w => typeof(w) === "object" ? blackList.findIndex((b:any) => `${b}` === `${w.value}`) < 0 : blackList.findIndex((b:any) => `${b}` === `${w}`) < 0) as any
            state.whiteList = parseWhiteList(list)
            state.cascade = list.some(w => typeof(w) === "object" && w.children && Array.isArray(w.children) && w.children.length)
            state.anyLevel = list.some(w => typeof(w) === "object" && w.children?.length && w.match)
        }
        else
        {
            state.useWhiteList = false
            state.whiteList = []
            state.cascade = false
            state.anyLevel = false
        }
    }, true)

    langWatcher = subscribeLanguage(() => {
        state.inputPlaceHolder = scalarNode.inputPlaceHolder
        state.selectPlaceHolder = scalarNode.selectPlaceHolder
    }, true)
})

const parseWhiteList = (entries: any[]) =>
{
    return entries.map(e => {
        if (typeof(e) === 'object' && e !== null)
        {
            const item: any = {
                value: e.value,
                label: _L.value(e.label)
            }
            if (e.children && Array.isArray(e.children))
                item.children = parseWhiteList(e.children)
            if (e.match)
                item.match = e.match
            return item
        }
        else
        {
            return e
        }
    })
}

onUnmounted(() => {
    if (dataWatcher) dataWatcher()
    if (stateWatcher) stateWatcher()
    if (langWatcher) langWatcher()
})

</script>