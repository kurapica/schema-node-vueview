<template>
  <span v-if="state.readonly && text"
    :style="{ 'width': '100%', 'text-align': text === true ? state.defaultAlign : text }">
    {{ state.display }}
  </span>
  <el-date-picker v-else
    v-model="data"
    :type="state.kind"
    :placeholder="!state.readonly && state.default && dateFormat(state.default) || state.selectPlaceHolder"
    :disabled="state.readonly || state.disable"
    :disabled-date="disabledDate"
    style="width: 100%"
  ></el-date-picker>
</template>

<script lang="ts" setup>
import { DataNode, DateNode, Default, Disable, Display, NS_SYSTEM_FULL_DATE, NS_SYSTEM_YEARMONTH, ReadOnly, Require, ScalarType, formatLocaleString, subscribeLanguage, parseDate } from 'schema-node-core'
import { computed, onMounted, onUnmounted, reactive, toRaw } from 'vue'
import { _L } from '../utility/locale'
import { subscribeAncestorProperty } from '../utility/toolset';

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{ 
  /** Input schema node */
  node: DataNode, 
  
  /** The readonly mode */
  readonly?: boolean,
  
  /** Display readon only value as plain text */
  text?: boolean | 'left' | 'right' | 'center'
}>()
const node = toRaw(props.node) as DateNode

// ── UI State ──────────────────────────────────────────────────────
/** Display state */
const state = reactive<{
  data?: any,
  kind?: 'month' | 'date' | 'datetime',
  default?: any,
  display?: any,
  selectPlaceHolder?: string,
  defaultAlign?: "left" | "right" | "center",
  disable?: boolean,
  require?: boolean,
  readonly?: boolean,
  changed?: boolean
}>({ defaultAlign: "left" })

// Data
const data = computed({
  get(): any { return state.data },
  set(value: any) { node.value = value }
})

// ── Utility ───────────────────────────────────────────────────────

// generate display
const display = () => {
  // check value
  let value: Date | undefined = parseDate(node.value)
  if (!value) return ""

  // display
  if (state.kind === 'month') {
    return `${value.getFullYear()}-${value.getMonth() + 1}`
  }
  if (state.kind === 'datetime') {
    return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()} ${value.toLocaleTimeString()}`
  }
  return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`
}

// disabled date
const disabledDate = (time: Date) => {
  if (node.readonly) return false

  const upLimit = node.upLimit
  const lowLimit = node.lowLimit
  if (state.kind === 'month') {
    return upLimit && (upLimit.getFullYear() < time.getFullYear() || upLimit.getFullYear() === time.getFullYear() && upLimit.getMonth() < time.getMonth()) ||
            lowLimit && (lowLimit.getFullYear() > time.getFullYear() || lowLimit.getFullYear() === time.getFullYear() && lowLimit.getMonth() > time.getMonth())
  }
  else if (state.kind === 'date') {
    return upLimit && (upLimit.getFullYear() < time.getFullYear() || upLimit.getFullYear() === time.getFullYear() && upLimit.getMonth() < time.getMonth() && upLimit.getDate() < time.getDate()) ||
            lowLimit && (lowLimit.getFullYear() > time.getFullYear() || lowLimit.getFullYear() === time.getFullYear() && lowLimit.getMonth() > time.getMonth() && lowLimit.getDate() > time.getDate())
  }
  else if (state.kind === 'datetime') {
    return upLimit && (upLimit.getTime() < time.getTime()) ||
            lowLimit && (lowLimit.getTime() > time.getTime())
  }
  else {
    return false
  }
}

const dateFormat = (date: any): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const YY = dateObj.getFullYear() + "-";
  const MM = (dateObj.getMonth() + 1 < 10 ? "0" + (dateObj.getMonth() + 1) : dateObj.getMonth() + 1) + "-";
  const DD = dateObj.getDate() < 10 ? "0" + dateObj.getDate() : dateObj.getDate();
  const dateStr = YY + MM + DD;
  if (state.kind === 'datetime') {
    const hh = (dateObj.getHours() < 10 ? "0" + dateObj.getHours() : dateObj.getHours()) + ":";
    const mm = (dateObj.getMinutes() < 10 ? "0" + dateObj.getMinutes() : dateObj.getMinutes()) + ":";
    const ss = dateObj.getSeconds() < 10 ? "0" + dateObj.getSeconds() : dateObj.getSeconds();
    return `${dateStr} ${hh + mm + ss}`;
  }
  return dateStr;
}

const getKind = (type: ScalarType): 'month' | 'date' | 'datetime' => {
  if (type.name === NS_SYSTEM_FULL_DATE) return 'datetime'
  if (type.name === NS_SYSTEM_YEARMONTH) return 'month'
  return type.baseType ? getKind(type.baseType) : 'date'
}

// ── Life Cycle ────────────────────────────────────────────────────
/** Subscription */
const subs: Function[] = []

onMounted(async () => {
  state.kind = getKind(node.type as ScalarType);

  subs.push(node.subscribe(() => {
    state.data = node.rawValue
    if (props.text) state.display = display()
    state.changed = node.changed
  }, true))
  
  // state change
  if (props.readonly) {
    state.readonly = true;
  }
  else {
    subs.push(subscribeAncestorProperty(node, ReadOnly, (values: boolean[]) => state.readonly = values.some(v => v), true))
    subs.push(subscribeAncestorProperty(node, Disable, (values: boolean[]) => state.disable = values.some(v => v), true))
  }
  subs.push(node.subscribeProperty(Default, (owner, propCtor, newValue) => state.default = newValue, true))
  subs.push(node.subscribeProperty(Require, (owner, propCtor, newValue) => state.require = newValue as boolean, true))

  // language
  subs.push(subscribeLanguage(() => {
    state.selectPlaceHolder = formatLocaleString("PLACEHOLDER_SELECT", node.getPropertyValue(Display) ?? node.name);
  }, true));
})

onUnmounted(() => subs.forEach(sub => sub()))
</script>
