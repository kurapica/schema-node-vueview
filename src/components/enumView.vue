<template>
    <span v-if="state.readonly && plainText" :style="{'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
        {{ state.display }}
    </span>
    <el-select v-else-if="state.cascade === 1"
        v-model="data"
        style="width: 100%;"
        :placeholder="placeHolder || node.inputPlaceHolder"
        :multiple="state.multiple"
        :disabled="state.disabled"
        :clearable="!state.require"
        v-bind="$attrs">
        <el-option v-for="item in state.options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
            :disabled="item.disabled"
        ></el-option>
    </el-select>
    <el-cascader v-else
        v-model="data"
        style="width: 100%;"
        :options="state.options"
        :props="{
            emitPath: false,
            checkStrictly: state.anylevel || false,
            multiple: state.multiple,
            lazy: true,
            lazyLoad
        }"
        :show-all-levels="showAllLevels || false"
        :placeholder="placeHolder || node.inputPlaceHolder"
        :disabled="state.disabled"
        :clearable="!state.require"
        v-bind="$attrs"></el-cascader>
</template>

<script setup lang="ts">
import { no } from 'element-plus/es/locale';
import { EnumNode, getEnumAccessList, getEnumSubList, IEnumValueInfo, isEqual, isNull } from 'schema-node'
import { computed, onMounted, onUnmounted, reactive } from 'vue'

// properties
const props = defineProps<{
    /**
     * The schema node
     */
    node: EnumNode

    /**
     * Display readon only value as plain text
     */
    plainText?: any,

    /**
     * The place holder
     */
    placeHolder?: string,

    /**
     * Show all cascade levels
     */
    showAllLevels?: boolean
}>()

// display state
const state = reactive<{
    display: string
    readonly?: boolean
    multiple?: boolean
    disabled?: boolean
    require?: boolean
    anylevel?: boolean
    root?: any
    whiteList?: any[]
    blackList?: any[]
    cascade: number
    options: ICascaderOptionInfo[]
}>({
    display: "",
    cascade: 1,
    options: []
})

// data
const data = computed({
    get (): any {
        return props.node.view
    },
    set(value: any) {
        props.node.data = value
    }
})

// change handler
let dataHandler: Function | null = null
let stateHandler: Function | null = null

onMounted(() => {
    const node = props.node

    // state change
    stateHandler = node.subscribeState(async() => {
        if (node.readonly && props.plainText)
        {
            dataHandler ||= node.subscribe(refreshDisplay, true)
            return
        }

        // cascader option rebuild check
        const rebuild = state.options.length === 0 ||
            !isEqual(state.root, node.root) ||
            !isEqual(state.cascade, node.cascade || node.cascadeLevel) ||
            !isEqual(state.whiteList, node.whiteList) ||
            !isEqual(state.blackList, node.blackList)

        state.readonly = node.readonly
        state.multiple = node.isMultiple
        state.disabled = node.rule.disable
        state.require = node.require
        state.anylevel = node.anyLevel
        state.root = node.root
        state.cascade = node.cascade || node.cascadeLevel
        state.whiteList = node.whiteList ? [...node.whiteList] : undefined
        state.blackList = node.blackList ? [...node.blackList] : undefined

        let whiteTree: any = null

        if (rebuild)
        {
            // pre-load
            await refreshDisplay()

            // combine with whitelist
            if (state.whiteList)
            {
                whiteTree = {}
                const whiteList = state.blackList ? state.whiteList.filter(w => state.blackList!.findIndex(b => `${b}` === `${w}`) < 0) : state.whiteList
                for(let i = 0; i < whiteList.length; i++)
                {
                    // preload and get access paths
                    const accessList = await getEnumAccessList(node.schemaName, whiteList[i])
                    if (!accessList?.length) continue

                    let currwhite = whiteTree
                    for(let j = 0; j < accessList.length - 1; j++)
                    {
                        const a = accessList[j]
                        if (!currwhite[a.value] || currwhite[a.value] === true)
                            currwhite[a.value] = {}
                    }
                    const last = accessList[accessList.length - 1]
                    currwhite[last.value] = currwhite[last.value] || true
                }
            }

            state.options = toCascaderOptionInfos(await getEnumSubList(node.schemaName), 1, whiteTree)
        }
    }, true)
})

onUnmounted(() => {
    if (dataHandler) dataHandler()
    if (stateHandler) stateHandler()
})

//#region Helpers

const refreshDisplay = async() => {
    const node = props.node
    const data = node.view
    if (Array.isArray(data))
    {
        const labels: string[] = []
        for (let i = 0; i < data.length; i++)
        {
            const paths = (await getEnumAccessList(node.schemaName, data[i]))?.map(v => v.name) || []
            const label = paths.length === 0 ? "" : (!props.showAllLevels ? paths[paths.length - 1] : paths.join(" / "))
            if (label) labels.push(label)
        }
        state.display = labels.join(", ") || ""
    }
    else if (!isNull(data))
    {
        const paths = (await getEnumAccessList(node.schemaName, data))?.map(v => v.name) || []
        state.display = paths.length === 0 ? "" : (!props.showAllLevels ? paths[paths.length - 1] : paths.join(" / "))
    }
    else
    {
        state.display = ""
    }
}

const toCascaderOptionInfos = (values: IEnumValueInfo[], level: number, whitelist?: any): ICascaderOptionInfo[] => {
    if (state.blackList?.length) values = values.filter(e => state.blackList!.findIndex(b => `${b}` === `${e.value}`) < 0)
    if (typeof whitelist === "object") values = values.filter(e => whitelist[e.value])

    return values.map(e => ({
        value: e.value,
        label: e.name,
        disabled: e.disabled,
        enumlevel: level,
        leaf: !e.hasSubList || (state.cascade <= level),
        children: e.hasSubList && state.cascade > level && e.subList 
            ? toCascaderOptionInfos(e.subList, level + 1, typeof whitelist === "object" ? whitelist[e.value]: null)
            : null
    }))
}

const getCascadeInfo = (value: any, options: ICascaderOptionInfo[]): ICascaderOptionInfo | undefined => {
    let info = options.find(o => o.value === value)
    if (info) return info

    for(let i = 0; i < options.length; i++)
    {
        if (!options[i].children?.length) continue
        info = getCascadeInfo(value, options[i].children!)
        if (info) return info
    }
}

const lazyLoad = (node: { value: any, level: number }, resolve: Function, reject: Function):void => {
    const { value } = node
    const vnode = getCascadeInfo(value, state.options)
    if (!vnode || vnode.leaf) return resolve([])

    getEnumSubList(props.node.schemaName, value).then((values: IEnumValueInfo[]) => {
        const map = toCascaderOptionInfos(value, vnode.enumlevel + 1)
        vnode.children = map
        return resolve(map)
    }).catch(ex => reject(ex))
}

interface ICascaderOptionInfo
{
  value: any
  label: string
  disabled?: boolean
  enumlevel: number
  leaf: boolean
  children: ICascaderOptionInfo[] | undefined | null
}

//#endregion
</script>