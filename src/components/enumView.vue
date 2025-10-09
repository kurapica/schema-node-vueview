<template>
    <span v-if="state.readonly && plainText" :style="{'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
        {{ _L(state.display) }}
    </span>
    <el-cascader v-else
        v-model="data"
        style="width: 100%;min-width: 120px"
        :options="options"
        :props="{
            emitPath: false,
            checkStrictly: state.anylevel || false,
            multiple: state.multiple,
            lazy: true,
            lazyLoad
        }"
        :show-all-levels="showAllLevels || false"
        :placeholder="enumNode.inputPlaceHolder"
        :disabled="state.readonly || state.disabled"
        :clearable="!state.require"
        :filterable="enumNode.cascadeLevel === 1"
        v-bind="$attrs"
    ></el-cascader>
</template>

<script setup lang="ts">
import { EnumNode, getEnumAccessList, getEnumSubList, IEnumValueInfo, isEqual, IEnumValueAccess, isNull, ILocaleString, subscribeLanguage } from 'schema-node'
import { computed, onMounted, onUnmounted, reactive, shallowRef, toRaw } from 'vue'
import { _L } from '../locale'

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
     * Show all cascade levels
     */
    showAllLevels?: boolean
}>()
const enumNode = toRaw(props.node)

// display state
const options = shallowRef<ICascaderOptionInfo[]>([])
const state = reactive<{
    data?: any
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
}>({
    display: "",
    cascade: 1,
})

// data
const data = computed({
    get (): any {
        return enumNode.view
    },
    set(value: any) {
        enumNode.data = value
    }
})

// change handler
let dataHandler: Function | null = null
let stateHandler: Function | null = null
let langHandler: Function | null = null

onMounted(() => {
    const node = enumNode

    // data change
    dataHandler = node.subscribe(() => {
        state.data = node.view
        if (node.readonly && props.plainText)
            refreshDisplay()
    }, true)

    // state change
    stateHandler = node.subscribeState(async() => {
        // cascader option rebuild check
        const rebuild = options.value.length === 0 ||
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
            if (state.whiteList?.length)
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
                        currwhite = currwhite[a.value]
                    }
                    const last = accessList[accessList.length - 1]
                    currwhite[last.value] = currwhite[last.value] || true
                }
            }

            // root
            if (!isNull(state.root))
            {
                const accessList = await getEnumAccessList(node.schemaName, state.root)
                if (accessList?.length)
                {
                    let currwhite = whiteTree
                    for(let j = 0; j < accessList.length; j++)
                    {
                        if (!currwhite) break

                        const a = accessList[j]
                        currwhite = currwhite[a.value]
                        if (currwhite === true) currwhite = null
                    }
                    options.value = toCascaderOptionInfos(await getEnumSubList(node.schemaName, state.root), accessList.length + 1, currwhite)
                    return
                }
            }
            
            // default
            options.value = toCascaderOptionInfos(await getEnumSubList(node.schemaName), 1, whiteTree)
        }
    }, true)

    langHandler = subscribeLanguage(() => {
        refrehOptions(options.value)
        options.value = [...options.value]
    })
})

onUnmounted(() => {
    if (dataHandler) dataHandler()
    if (stateHandler) stateHandler()
    if (langHandler) langHandler()
})

//#region Helpers

const refreshDisplay = async() => {
    const node = enumNode
    const data = node.view
    if (Array.isArray(data))
    {
        const labels: string[] = []
        for (let i = 0; i < data.length; i++)
        {
            const paths = (await getEnumAccessList(node.schemaName, data[i]))?.map((v: IEnumValueAccess) => v.subList.find((s: IEnumValueInfo) => s.value === v.value)?.name || v.value) || []
            const label = paths.length === 0 ? "" : (!props.showAllLevels ? paths[paths.length - 1] : paths.join(" / "))
            if (label) labels.push(label)
        }
        state.display = labels.join(", ") || ""
    }
    else if (!isNull(data))
    {
        const paths = (await getEnumAccessList(node.schemaName, data))?.map((v: IEnumValueAccess) => v.subList.find((s: IEnumValueInfo) => s.value === v.value)?.name || v.value) || []
        state.display = paths.length === 0 ? "" : (!props.showAllLevels ? paths[paths.length - 1] : paths.join(" / "))
    }
    else
    {
        state.display = ""
    }
}

const toCascaderOptionInfos = (values: IEnumValueInfo[], level: number, whitelist?: any): ICascaderOptionInfo[] => {
    if (state.cascade < level) return []

    if (state.blackList?.length) values = values.filter(e => state.blackList!.findIndex(b => `${b}` === `${e.value}`) < 0)
    if (whitelist && typeof whitelist === "object") values = values.filter(e => whitelist[e.value])

    return values.map(e => ({
        value: e.value,
        localename: e.name,
        label: _L.value(e.name),
        disabled: e.disable,
        enumlevel: level,
        leaf: (!e.hasSubList && !e.subList?.length) || (state.cascade <= level),
        children: (e.hasSubList || e.subList?.length) && state.cascade > level && e.subList 
            ? toCascaderOptionInfos(e.subList, level + 1, whitelist && typeof whitelist === "object" ? whitelist[e.value]: null)
            : null
    } as ICascaderOptionInfo))
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

const lazyLoad = (node: { value: any, level: number }, resolve: Function, reject: any):void => {
    const { value } = node
    const vnode = getCascadeInfo(value, options.value)
    if (!vnode || vnode.leaf) return resolve([])

    getEnumSubList(enumNode.schemaName, value).then((values: IEnumValueInfo[]) => {
        const map = toCascaderOptionInfos(value, vnode.enumlevel + 1)
        vnode.children = map
        return resolve(map)
    }).catch(reject)
}

const refrehOptions = (options: ICascaderOptionInfo[]) => {
    options.forEach(o => {
        o.label = _L.value(o.localename)
        if (o.children?.length) refrehOptions(o.children)
    })
}

interface ICascaderOptionInfo
{
    value: any
    localename: ILocaleString
    label: string
    disabled?: boolean
    enumlevel: number
    leaf: boolean
    children: ICascaderOptionInfo[] | undefined | null
}

//#endregion
</script>