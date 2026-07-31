<template>
  <span v-if="(disabled || state.readonly) && plainText" :style="{ 'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
    {{ state.display }}
  </span>
  <el-date-picker v-else-if="node.type.name === NS_SYSTEM_RANGE_DATE || node.type.name === NS_SYSTEM_RANGE_FULL_DATE"
    v-model="data"
    :type="node.type.name === NS_SYSTEM_RANGE_DATE ? 'daterange' : 'datetimerange'"
    :placeholder="selectPlaceHolder"
    :clearable="!state.require"
    :disabled="disabled || state.readonly || state.disable"
    :disabled-date="disabledDate"
    range-separator="~"
    :start-placeholder="_L(startFieldDisplay)"
    :end-placeholder="_L(stopFieldDisplay)"
  ></el-date-picker>
  <div v-else style="display: flex; justify-content: space-between;">
    <schema-view :node="startField!" :disabled="disabled || state.disable"></schema-view>
    ~
    <schema-view :node="stopField!" :disabled="disabled || state.disable"></schema-view>
  </div>
</template>

<script setup lang="ts">
import {
  DataNode, Disable, Display, NS_SYSTEM_RANGE_DATE, NS_SYSTEM_RANGE_FULL_DATE,
  NS_SYSTEM_YEAR, NS_SYSTEM_YEARMONTH, NS_SYSTEM_FULL_DATE, ReadOnly, Require, sformat,
} from 'schema-node-core'
import { computed, onMounted, onUnmounted, reactive, toRaw } from 'vue'
import schemaView from '../schemaView.vue'
import { _L } from '../utility/locale'
import { getField } from '../utility/node'

// Properties
const props = defineProps<{
  /** The range date node */
  node: DataNode,
  /** Disable input */
  disabled?: boolean,
  /** Display readon only value as plain text */
  plainText?: any,
}>()

const node = toRaw(props.node)
const startField = getField(node, "start")
const stopField = getField(node, "stop")

// State
const state = reactive<{
  disable?: boolean,
  require?: boolean,
  readonly?: boolean,
  display?: string,
  changed?: boolean
}>({})

// placeholder
const selectPlaceHolder = computed(() => sformat("PLACEHOLDER_SELECT", node.getPropertyValue(Display) ?? node.name))
const startFieldDisplay = computed(() => startField?.getPropertyValue<import('schema-node-core').LocaleString>(Display) ?? startField?.name)
const stopFieldDisplay = computed(() => stopField?.getPropertyValue<import('schema-node-core').LocaleString>(Display) ?? stopField?.name)

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

// data & state watcher
const subs: Function[] = []

onMounted(() => {
  subs.push(node.subscribe(() => {
    state.display = display()
    state.changed = node.changed
  }, true))

  subs.push(node.subscribeProperty(ReadOnly, () => state.readonly = node.readonly, true))
  subs.push(node.subscribeProperty(Disable, (owner, propCtor, newValue) => state.disable = newValue as boolean, true))
  subs.push(node.subscribeProperty(Require, (owner, propCtor, newValue) => state.require = newValue as boolean, true))
})

onUnmounted(() => {
  subs.forEach(sub => sub())
})

// Helper

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

// 显示用
const display = () => {
  return `${getDisplay(startField)} ~ ${getDisplay(stopField)}`
}

// 时间范围
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
</script>
