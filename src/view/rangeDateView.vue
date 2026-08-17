<template>
  <span v-if="state.readonly && text" :style="{ 'width': '100%', 'text-align': text === true ? 'center' : text }">
    {{ state.display }}
  </span>
  <el-date-picker v-else-if="node.type.name === NS_SYSTEM_RANGE_DATE || node.type.name === NS_SYSTEM_RANGE_FULL_DATE"
    v-model="data"
    :type="node.type.name === NS_SYSTEM_RANGE_DATE ? 'daterange' : 'datetimerange'"
    :placeholder="state.selectPlaceHolder"
    :clearable="!state.require"
    :disabled="state.readonly || state.disable"
    :disabled-date="disabledDate"
    range-separator="~"
    :start-placeholder="_L(state.startFieldDisplay)"
    :end-placeholder="_L(state.stopFieldDisplay)"
  ></el-date-picker>
  <div v-else style="display: flex; justify-content: space-between;">
    <schema-view :node="startField!"></schema-view>
    ~
    <schema-view :node="stopField!"></schema-view>
  </div>
</template>

<script setup lang="ts">
import {
  DataNode, Disable, Display, NS_SYSTEM_RANGE_DATE, NS_SYSTEM_RANGE_FULL_DATE,
  NS_SYSTEM_YEAR, NS_SYSTEM_YEARMONTH, NS_SYSTEM_FULL_DATE, ReadOnly, Require, formatLocaleString,
  StructNode,
  ScalarNode,
  subscribeLanguage,
  LocaleString,
} from 'schema-node-core'
import { computed, onMounted, onUnmounted, reactive, toRaw } from 'vue'
import schemaView from '../schemaView.vue'
import { _L } from '../utility/locale'
import { subscribeAncestorProperty } from '../utility/toolset.js';

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{
  /** The range date node */
  node: DataNode,
  
  /** Display readon only value as plain text */
  text?: boolean | 'left' | 'right' | 'center'
}>()

const node = toRaw(props.node) as StructNode
const startField = node.getAccessValue("start") as ScalarNode
const stopField = node.getAccessValue("stop") as ScalarNode

// ── UI State ──────────────────────────────────────────────────────

/** UI State */
const state = reactive<{
  disable?: boolean,
  require?: boolean,
  readonly?: boolean,
  display?: string,
  changed?: boolean
  selectPlaceHolder?: string
  startFieldDisplay?: LocaleString | string
  stopFieldDisplay?: LocaleString | string
}>({
  startFieldDisplay: startField.getPropertyValue<LocaleString>(Display) ?? startField.name,
  stopFieldDisplay: stopField.getPropertyValue<LocaleString>(Display) ?? stopField.name,
})

// Data
const data = computed({
  get() {
    const value: any = node.value
    return [value?.start, value?.stop]
  },
  set(newValue) {
    node.value = { start: newValue ? newValue[0] : null, stop: newValue ? newValue[1] : null }
  }
})

// ── Utility ───────────────────────────────────────────────────────
/** Get display value of a date field */
const getDisplay = (field: DataNode | undefined): string => {
  if (!field) return ""
  if (field.type.name === NS_SYSTEM_YEAR) return field.value as any

  // validate date
  let value: any = field.value
  if (value) {
    if (typeof (value) === "string") {
      value = new Date(value)
      if (isNaN(value.getFullYear())) value = null
    }
    if (!(value instanceof Date)) {
      value = null
    }
  }
  if (!value) return ""

  // gen result
  const date = value as unknown as Date
  if (field.type.name === NS_SYSTEM_YEARMONTH) {
    return `${date.getFullYear()}-${date.getMonth() + 1}`
  }
  else if (field.type.name === NS_SYSTEM_FULL_DATE) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.toLocaleTimeString()}`
  }
  else {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  }
}

// gen display value
const display = () =>`${getDisplay(startField)} ~ ${getDisplay(stopField)}`

// check disabled date range
const disabledDate = (time: Date) => {
  if (node.readonly) return false

  const startUpLimit = (startField as any)?.upLimit
  const startLowLimit = (startField as any)?.lowLimit
  const stopUpLimit = (stopField as any)?.upLimit
  const stopLowLimit = (stopField as any)?.lowLimit

  return (startUpLimit instanceof Date && startUpLimit < time)
    || (startLowLimit instanceof Date && startLowLimit > time)
    || (stopUpLimit instanceof Date && stopUpLimit < time)
    || (stopLowLimit instanceof Date && stopLowLimit > time)
}

// ── Life Cycle ────────────────────────────────────────────────────
/** Subscription */
const subs: Function[] = [];

onMounted(() => {
  subs.push(node.subscribe(() => {
    state.display = display()
    state.changed = node.changed
  }, true));

  subs.push(subscribeAncestorProperty(node, ReadOnly, (values: boolean[]) => state.readonly = node.readonly || values.some(v => v), true));
  subs.push(subscribeAncestorProperty(node, Disable, (values: boolean[]) => state.disable = values.some(v => v), true));
  subs.push(node.subscribeProperty(Require, (owner, propCtor, newValue) => state.require = newValue as boolean, true));
  
  // language
  subs.push(subscribeLanguage(() => {
    state.selectPlaceHolder = formatLocaleString("PLACEHOLDER_SELECT", node.getPropertyValue(Display) ?? node.name);
  }, true));
});

onUnmounted(() => {
  subs.forEach(sub => sub())
});

</script>
