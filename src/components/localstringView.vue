<template>
    <section style="width: 100%; min-width: 120px;">
        <span v-if="(keyNode.readonly && plainText)" :style="{'width': '100%', 'display': 'inline-block', 'text-align': plainText === true ? 'center' : plainText }">
            {{ _L(node.data) }}
        </span>
        <span v-else-if="isCombine && !showCombineKey" :style="{'width': '100%', 'display': 'inline-block', 'text-align': plainText === true ? 'center' : plainText }">
            {{ _L(combineData) }}
        </span>
        <schema-view
            v-else
            style="width: 100%;"
            :key="localeNode.guid"
            :node="keyNode"
            :plainText="plainText"
            v-bind="$attrs">
            <template #append>
                <a v-if="isCombine" href="javascript:void(0)" @click="showCombineKey = false">{{ _L["CONFIRM"] }}</a>
                <a v-else href="javascript:void(0)" @click="openTrans">{{ _L["system.localetran.tran"] }}</a>
            </template>
        </schema-view>

        <template v-if="keyNode.readonly && plainText">
            <a href="javascript:void(0)" style="position: absolute; right: 1rem" @click="openTrans">{{ _L["system.localetran.tran"] }}</a>
        </template>
        <template v-else-if="isCombine && !showCombineKey">
            <a href="javascript:void(0)" style="position: absolute; right: 1rem" @click="showCombineKey = true">{{ _L["EDIT"] }}</a>
        </template>

        <!-- show trans -->
        <el-drawer v-model="showTrans" :title="_L['system.localetran.tran'] + ` ${keyNode.rawData || ''}`" direction="rtl" size="50%" append-to-body @close="saveTrans">
            <el-container class="main" style="height: 80vh;">
                <el-main>
                    <el-form :data="transNode">
                        <el-table :data="trans" style="width: 100%;">
                            <el-table-column :label="_L['system.localetran.lang']" prop="label" min-width="120" />
                            <el-table-column :label="_L['system.localetran.tran']" min-width="300">
                                <template #default="scope">
                                    <el-input v-if="!keyNode.readonly" v-model="scope.row.tran"></el-input>
                                    <span v-else>{{ scope.row.tran }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column :label="_L['MOVETOP']" min-width="120">
                                <template #default="scope">
                                    <a href="javascript:void(0)" @click="movetop(scope.row.lang)">{{ _L["MOVETOP"] }}</a>
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-form>
                </el-main>
                <el-footer>
                    <br/>
                    <el-button @click="showTrans = false">{{ _L["CLOSE"] }}</el-button>
                </el-footer>
            </el-container>
        </el-drawer>
    </section>
</template>

<script lang="ts" setup>
import { ArrayNode, isNull, SCHEMA_LANGUAGES, StructNode } from 'schema-node'
import {  onUnmounted, ref, toRaw } from 'vue'
import schemaView from './schemaView.vue'
import { _L } from '../locale'

const props = defineProps<{
    /**
     * Struct Schema node
     */
    node: StructNode,

    /**
     * Display readon only value as plain text
     */
    plainText?: any
}>()

const localeNode = toRaw(props.node) as StructNode
const keyNode = localeNode.getField("key")
const transNode = localeNode.getField("trans") as ArrayNode
const isCombine = ref(false)
const showCombineKey = ref(false)
const combineData = ref({ key: ""})

interface TranItem {
    lang: string,
    label: string,
    tran: string
}

const trans = ref<TranItem[]>([])

const showTrans = ref(false)

const refreshTrans = () => {
    const topOrders = localStorage["schema_node_locale_orders"] ? JSON.parse(localStorage["schema_node_locale_orders"]) : []
    const translate: {[key:string]: string} = {}

    transNode.data.forEach((item: any) => {
        if (item.lang && item.tran)
            translate[item.lang] = item.tran
    })

    const _trans: TranItem[] = []
    topOrders.forEach((lang: string) => {
        _trans.push({
            lang: lang,
            label: SCHEMA_LANGUAGES.find(l => l.value === lang)?.label || lang,
            tran: translate[lang] || ''
        })
    })

    SCHEMA_LANGUAGES.forEach(lang => {
        if (topOrders.indexOf(lang.value) >= 0) return

        _trans.push({
            lang: lang.value,
            label: lang.label,
            tran: translate[lang.value] || ''
        })
    })

    trans.value = _trans
}

const openTrans = async () => {
    refreshTrans()
    showTrans.value = true
}

const saveTrans = () => {
    if (keyNode.readonly) return

    const data: any[] = []
    trans.value.forEach(item => {
        if (!isNull(item.tran)) {
            data.push({
                lang: item.lang,
                tran: item.tran
            })
        }
    })

    transNode.data = data
}

const movetop = (lang: string) => {
    const topOrders = localStorage["schema_node_locale_orders"] ? JSON.parse(localStorage["schema_node_locale_orders"]) : []
    const idx = topOrders.indexOf(lang)
    if (idx >= 0) topOrders.splice(idx, 1)
    topOrders.unshift(lang)
    localStorage["schema_node_locale_orders"] = JSON.stringify(topOrders)
    refreshTrans()
}

const dataHandler = keyNode.subscribe(() => {
    const data = keyNode.rawData
    isCombine.value = typeof data === "string" && data.indexOf("{") >= 0
    if (isCombine.value) {
        combineData.value = { key: data }
    }
}, true)

onUnmounted(() => {
    dataHandler()
})

</script>