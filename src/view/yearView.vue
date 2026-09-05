<template>
  <span v-if="state.readonly && text"
    :style="{ 'width': '100%', 'text-align': text === true ? state.defaultAlign : text }">
    {{ state.data }}
  </span>
  <el-select v-else-if="state.useWhiteList"
    v-model="data"
    :disabled="state.readonly || state.disable"
    :placeholder="state.selectPlaceHolder"
    :clearable="!state.require"
    :filterable="state.asSuggest"
    :allow-create="state.asSuggest"
    :default-first-option="state.asSuggest"
    style="width: 100%">
    <el-option v-for="item in state.whiteList"
      :key="item"
      :label="item"
      :value="item"></el-option>
  </el-select>
  <el-date-picker v-else
    v-model="data"
    type="year"
    :placeholder="!state.readonly && !isNull(state.default) && `${state.default}` || state.selectPlaceHolder"
    :disabled="state.readonly || state.disable"
    value-format="YYYY"
    :disabled-date="disabledDate"
    style="width: 100%"
  ></el-date-picker>
</template>

<script lang="ts" setup>
import { AsSuggest, BlackList, DataNode, Default, Disable, Display, IntNode, isNull, ReadOnly, Require, formatLocaleString, subscribeLanguage, WhiteList } from 'schema-node-core'
import { computed, onMounted, onUnmounted, reactive, toRaw } from 'vue'
import { _L } from '../utility/locale'
import { subscribeAncestorProperty } from '../utility/toolset';

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{ 
  /** Input schema node */
  node: DataNode,

  /** Whether to show readonly */
  readonly?: boolean,

  /** Display readon only value as plain text */
  text?: boolean | 'left' | 'right' | 'center'
}>()
const node = (toRaw(props.node) as IntNode)!

// ── UI State ──────────────────────────────────────────────────────
/** Display state */
const state = reactive<{
  data?: any,
  default?: any,
  selectPlaceHolder?: string,
  defaultAlign?: "left" | "right" | "center",
  disable?: boolean,
  require?: boolean,
  asSuggest?: boolean,
  readonly?: boolean,
  useWhiteList?: boolean,
  whiteList?: number[],
  blackList?: number[],
  changed?: boolean
}>({ defaultAlign: "left" })

// Data
const data = computed({
  get(): any { return state.data },
  set(value: any) { node.value = value }
})

// ── Utility ───────────────────────────────────────────────────────

const disabledDate = (time: Date) => {
  if (node.readonly) return false
  const upLimit = node.upLimit
  const lowLimit = node.lowLimit
  return (typeof upLimit === "number" && upLimit < time.getFullYear()) || 
         (typeof lowLimit === "number" && lowLimit > time.getFullYear()) ||
         (state.blackList?.length && state.blackList.includes(time.getFullYear()))
}

const parseYear = (year: any): number => {
  if (typeof year === "number") return year
  return Number(year)
}

// ── Life Cycle ────────────────────────────────────────────────────
/** Subscription */
const subs: Function[] = []

onMounted(async () => {
  subs.push(node.subscribe(() => {
    state.data = node.rawValue
    state.changed = node.changed
  }, true))

  if (props.readonly) {
    state.readonly = true
  } else {
    subs.push(subscribeAncestorProperty(node, ReadOnly, (values: boolean[]) => state.readonly = values.some(v => v), true))
    subs.push(subscribeAncestorProperty(node, Disable, (values: boolean[]) => state.disable = values.some(v => v), true))
  }
  subs.push(node.subscribeProperty(Default, (owner, propCtor, newValue) => state.default = newValue, true))
  subs.push(node.subscribeProperty(Require, (owner, propCtor, newValue) => state.require = newValue as boolean, true))
  subs.push(node.subscribeProperty(AsSuggest, (owner, propCtor, newValue) => state.asSuggest = newValue as boolean, true))

  // white/black list
  const refreshWhiteList = () => {
    let whiteList = node.getPropertyValue<string[]>(WhiteList)?.filter(f => !isNull(f))?.map(parseYear)
    const blackList = node.getPropertyValue<string[]>(BlackList)?.filter(f => !isNull(f))?.map(parseYear)
    if (whiteList?.length) {
      state.useWhiteList = true
      if (blackList?.length) whiteList = whiteList.filter((w: number) => !blackList.includes(w))
      state.whiteList = whiteList
    } else {
      state.useWhiteList = false
      state.whiteList = undefined
      state.blackList = blackList?.length ? blackList : undefined
    }
  }
  subs.push(node.subscribeProperty(WhiteList, refreshWhiteList))
  subs.push(node.subscribeProperty(BlackList, refreshWhiteList, true))

  // language
  subs.push(subscribeLanguage(() => {
    state.selectPlaceHolder = formatLocaleString("PLACEHOLDER_SELECT", node.getPropertyValue(Display) ?? node.name);
  }, true));
})

onUnmounted(() => subs.forEach(sub => sub()))
</script>
