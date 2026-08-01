<template>
  <section v-if="keyNode" style="width: 100%; min-width: 120px;">
    <span v-if="keyNode.readonly && text"
      :style="{ 'width': '100%', 'display': 'inline-block', 'text-align': text === true ? 'left' : text }">
      {{ _L(displayData) }}
    </span>
    <span v-else-if="isCombine && !showCombineKey"
      :style="{ 'width': '100%', 'display': 'inline-block', 'text-align': text === true ? 'left' : text }">
      {{ _L(combineData) }}
    </span>
    <schema-view v-else style="width: 100%;" :key="keyNode.id" :node="keyNode" :text="text"
      :disabled="disabled" v-bind="$attrs">
      <template #append>
        <a v-if="isCombine" href="javascript:void(0)" @click="showCombineKey = false">{{ _L('CONFIRM') }}</a>
        <a v-else href="javascript:void(0)" @click="openTrans">{{ _L('system.localetran.tran') }}</a>
      </template>
    </schema-view>

    <template v-if="(disabled || keyNode.readonly) && text">
      <a href="javascript:void(0)" style="position: absolute; right: 1rem" @click="openTrans">{{
        _L('system.localetran.tran') }}</a>
    </template>
    <template v-else-if="isCombine && !showCombineKey">
      <a href="javascript:void(0)" style="position: absolute; right: 1rem" @click="showCombineKey = true">{{ _L('EDIT')
        }}</a>
    </template>

    <!-- show trans -->
    <el-drawer v-model="showTrans" :title="_L('system.localetran.tran') + ` ${keyNode.rawValue || ''}`" direction="rtl"
      size="50%" append-to-body @close="saveTrans">
      <el-container class="main" style="height: 80vh;">
        <el-main>
          <el-form :data="transNode">
            <el-table :data="trans" style="width: 100%;">
              <el-table-column :label="_L('system.localetran.lang')" prop="label" min-width="120" />
              <el-table-column :label="_L('system.localetran.tran')" min-width="300">
                <template #default="scope">
                  <el-input v-if="!(disabled || keyNode.readonly)" v-model="scope.row.tran"></el-input>
                  <span v-else>{{ scope.row.tran }}</span>
                </template>
              </el-table-column>
              <el-table-column :label="_L('MOVETOP')" min-width="120">
                <template #default="scope">
                  <a href="javascript:void(0)" @click="movetop(scope.row.lang)">{{ _L('MOVETOP') }}</a>
                </template>
              </el-table-column>
            </el-table>
          </el-form>
        </el-main>
        <el-footer>
          <br />
          <el-button @click="showTrans = false">{{ _L('CLOSE') }}</el-button>
        </el-footer>
      </el-container>
    </el-drawer>
  </section>
</template>

<script lang="ts" setup>
import { ArrayNode, DataNode, Display, getPropertyValue, isNull, LocaleString, StructNode } from 'schema-node-core'
import { onUnmounted, ref, toRaw } from 'vue'
import schemaView from '../schemaView.vue'
import { _L, getLanguageEntries } from '../utility/locale'

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{
  /** Struct Schema node (locale string struct with key + trans fields) */
  node: DataNode,
  
  /** Display readon only value as plain text */
  text?: any
}>()

const localeNode = toRaw(props.node) as StructNode
const keyNode = getField(localeNode, "key")
const transNode = getField(localeNode, "trans") as ArrayNode

const isCombine = ref(false)
const showCombineKey = ref(false)
const combineData = ref<any>({ key: "" })
const displayData = ref<any>(localeNode.rawValue)

interface TranItem {
  lang: string,
  label: string,
  tran: string
}

const trans = ref<TranItem[]>([])
const showTrans = ref(false)

const subs: Function[] = []

const refreshTrans = () => {
  const topOrders = localStorage["schema_node_locale_orders"] ? JSON.parse(localStorage["schema_node_locale_orders"]) : []
  const translate: { [key: string]: string } = {}

  const transData = (transNode?.value as any[]) || []
  transData.forEach((item: any) => {
    if (item.lang && item.tran)
      translate[item.lang] = item.tran
  })

  const entries = getLanguageEntries()
  const _trans: TranItem[] = []

  topOrders.forEach((lang: string) => {
    const entry = entries.find(e => e.value === lang)
    _trans.push({
      lang,
      label: entry ? _L.value(getPropertyValue<LocaleString>(entry, Display) ?? lang) : lang,
      tran: translate[lang] || ''
    })
  })

  entries.forEach((entry) => {
    if (topOrders.indexOf(entry.value) >= 0) return
    _trans.push({
      lang: entry.value,
      label: _L.value(getPropertyValue<LocaleString>(entry, Display) ?? entry.value),
      tran: translate[entry.value] || ''
    })
  })

  trans.value = _trans
}

const openTrans = async () => {
  refreshTrans()
  showTrans.value = true
}

const saveTrans = () => {
  if (!keyNode || keyNode.readonly) return

  const data: any[] = []
  trans.value.forEach(item => {
    if (!isNull(item.tran)) {
      data.push({
        lang: item.lang,
        tran: item.tran
      })
    }
  })

  if (transNode) transNode.value = data
}

const movetop = (lang: string) => {
  const topOrders = localStorage["schema_node_locale_orders"] ? JSON.parse(localStorage["schema_node_locale_orders"]) : []
  const idx = topOrders.indexOf(lang)
  if (idx >= 0) topOrders.splice(idx, 1)
  topOrders.unshift(lang)
  localStorage["schema_node_locale_orders"] = JSON.stringify(topOrders)
  refreshTrans()
}

if (keyNode) {
  subs.push(keyNode.subscribe(() => {
    const data = keyNode.rawValue
    displayData.value = localeNode.value
    isCombine.value = typeof data === "string" && data.indexOf("{") >= 0
    if (isCombine.value) {
      combineData.value = { key: data }
    }
  }, true))
}

onUnmounted(() => {
  subs.forEach(sub => sub())
})
</script>
