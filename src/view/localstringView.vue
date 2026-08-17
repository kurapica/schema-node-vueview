<template>
  <section style="width: 100%; min-width: 120px;">
    <span v-if="state.readonly && text"
      :style="{ 'width': '100%', 'display': 'inline-block', 'text-align': text === true ? 'left' : text }">
      {{ _L(state.display) }}
    </span>
    <span v-else-if="state.isCombine && !state.showCombineKey"
      :style="{ 'width': '100%', 'display': 'inline-block', 'text-align': text === true ? 'left' : text }">
      {{ _L(state.combineData) }}
    </span>
    <schema-view v-else style="width: 100%;" :key="keyNode.id" :node="keyNode" :text="text"
      :disabled="state.disable || state.readonly" v-bind="$attrs">
      <template #append>
        <a v-if="state.isCombine" href="javascript:void(0)" @click="state.showCombineKey = false">{{ _L('CONFIRM') }}</a>
        <a v-else href="javascript:void(0)" @click="state.showTrans = true">{{ _L('frontend.locale.trans') }}</a>
      </template>
    </schema-view>

    <template v-if="state.readonly && text">
      <a href="javascript:void(0)" style="position: absolute; right: 1rem" @click="openTrans">{{
        _L('frontend.locale.trans') }}</a>
    </template>
    <template v-else-if="state.isCombine && !state.showCombineKey">
      <a href="javascript:void(0)" style="position: absolute; right: 1rem" @click="state.showCombineKey = true">{{ _L('EDIT') }}</a>
    </template>

    <!-- show trans -->
    <el-drawer v-model="state.showTrans" :title="_L('frontend.locale.trans') + ` ${keyNode.rawValue || ''}`" direction="rtl"
      size="50%" append-to-body @close="saveTrans">
      <el-container class="main" style="height: 80vh;">
        <el-main>
          <el-form :data="transNode">
            <el-table :data="state.trans" style="width: 100%;">
              <el-table-column :label="_L('system.localetran.lang')" prop="label" min-width="120" />
              <el-table-column :label="_L('frontend.locale.trans')" min-width="300">
                <template #default="scope">
                  <el-input v-if="!state.readonly" v-model="scope.row.tran"></el-input>
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
          <el-button @click="state.showTrans = false">{{ _L('CLOSE') }}</el-button>
        </el-footer>
      </el-container>
    </el-drawer>
  </section>
</template>

<script lang="ts" setup>
import { ArrayNode, DataNode, Disable, Display, getPropertyValue, isNull, LocaleString, ReadOnly, ScalarNode, StructNode } from 'schema-node-core'
import { onMounted, onUnmounted, reactive, ref, toRaw } from 'vue'
import schemaView from '../schemaView.vue'
import { _L, getLanguageEntries } from '../utility/locale'
import { subscribeAncestorProperty } from '../utility/toolset.js';

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{
  /** Struct Schema node (locale string struct with key + trans fields) */
  node: DataNode,
  
  /** Display readon only value as plain text */
  text?: any
}>();
const node = toRaw(props.node) as StructNode;
const keyNode = (node.getAccessValue("key") as ScalarNode)!;
const transNode = (node.getAccessValue("trans") as ArrayNode)!;

// ── UI State ──────────────────────────────────────────────────────
/** UI State */
const state = reactive<{
  readonly?: boolean
  disable?: boolean
  isCombine?: boolean
  showCombineKey?: boolean
  combineData?: any
  display?: any
  showTrans?: boolean
  trans?: TranItem[]
}>({
  isCombine: false,
  showCombineKey: false,
  combineData: { key: "" },
  display: node.rawValue,
  showTrans: false,
  trans: []
})

interface TranItem {
  lang: string,
  label: string,
  tran: string
}

// ── Utility ───────────────────────────────────────────────────────
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

  state.trans = _trans
}

const openTrans = async () => {
  refreshTrans()
  state.showTrans = true
}

const saveTrans = () => {
  if (state.readonly) return

  const data: any[] = []
  state.trans?.forEach(item => {
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

// ── Life Cycle ────────────────────────────────────────────────────
const subs: Function[] = [];

onMounted(() => {
  subs.push(keyNode.subscribe(() => {
    const data = keyNode.rawValue
    state.display = node.value
    state.isCombine = typeof data === "string" && data.indexOf("{") >= 0
    if (state.isCombine) {
      state.combineData = { key: data }
    }
  }, true))

  // state change
  subs.push(subscribeAncestorProperty(node, ReadOnly, (values: boolean[]) => state.readonly = node.readonly || values.some(v => v), true)); // readonly covers several properties
  subs.push(subscribeAncestorProperty(node, Disable, (values: boolean[]) => state.disable = values.some(v => v), true));  
})

onUnmounted(() => {
  subs.forEach(sub => sub())
})
</script>
