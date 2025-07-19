<template>
  <span v-if="state.readonly && plainText" :style="{'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
    {{ state.display }}
  </span>
  <el-date-picker v-else-if="node.schemaName === NS_SYSTEM_RANGEDATE || node.schemaName === NS_SYSTEM_RANGEFULLDATE" 
    v-model="data" 
    :type="node.schemaName === NS_SYSTEM_RANGEDATE ? 'daterange' : 'datetimerange'"
    :placeholder="node.selectPlaceHolder"
    :clearable="!state.require"
    :disabled="state.readonly || state.disable"
    :disabled-date="disabledDate"
    range-separator="~"
    :start-placeholder="node.getField('start')?.display"
    :end-placeholder="node.getField('stop')?.display"
  ></el-date-picker>
  <div v-else
    style="display: flex; justify-content: space-between;">
    <schema-view :node="node.getField('start')" :disabled="state.disable"></schema-view>
    ~
    <schema-view :node="node.getField('stop')" :disabled="state.disable"></schema-view>
  </div>
</template>

<script setup lang="ts">
import { NS_SYSTEM_RANGEDATE, NS_SYSTEM_RANGEFULLDATE, ScalarNode, StructNode } from 'schema-node'
import { computed, isRef, onMounted, onUnmounted, reactive } from 'vue'
import schemaView from './schemaView.vue'

// Properties
const props = defineProps<{
    /**
     * The range date node
     */
    node: StructNode

    /**
     * Display readon only value as plain text
     */
    plainText?: any, 
}>()

// State
const state = reactive<{
    disable?: boolean,
    require?: boolean,
    readonly?: boolean,
    display?: string
}>({})

// Data
const data = computed(
{
  get() {
    const node = props.node
    return [ node.data.start, node.data.stop ]
  },
  set(newValue) {
    const node = props.node
    node.data = { start: newValue ? newValue[0] : null, stop: newValue ? newValue[1] : null }
  }
})

// data & state watcher
let dataWatcher: Function | null = null
let stateWatcher: Function | null = null

onMounted(() => {
    const node = props.node
    dataWatcher = node.subscribe(() => {
        const data = node.data
        state.display = display()
    }, true)

    stateWatcher = node.subscribeState(() => {
        state.disable = node.rule.disable
        state.readonly = node.require
        state.readonly = node.readonly
    }, true)
})

onUnmounted(() => {
    if (dataWatcher) dataWatcher()
    if (stateWatcher) stateWatcher()
})


// Helper

const getDisplay = (node: ScalarNode): string =>
{
  if (node.isYear) return node.data

  // validate date
  let value:any = isRef(node.data) ? node.data.value : node.data
  if (value)
  {
    if (typeof (value) == "string")
    {
      value = new Date(value)
      if (isNaN(value.getFullYear())) value = null
    }
    if (!(value instanceof Date))
    {
      value = null
    }
  }
  if (!value) return ""

  // gen result
  const date = value as unknown as Date
  if (node.isYearMonth)
  {
    return `${date.getFullYear()}-${date.getMonth() + 1}`
  }
  else if (node.isFullDate)
  {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.toLocaleTimeString}`
  }
  else
  {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  }
}

// 显示用
const display = () =>
{
  const node = props.node
  return `${getDisplay(node.getField('start') as unknown as ScalarNode)} 至 ${getDisplay(node.getField('stop') as unknown as ScalarNode)} `
}

// 时间范围
const disabledDate = (time: Date) => {
  const node = props.node
  if (node.readonly) return false

  const start = node.getField('start') as unknown as ScalarNode
  const stop = node.getField('stop') as unknown as ScalarNode
  const startUplimit = start?.upLimit
  const startLowLimit = start?.lowLimit
  const stopUplimit = stop?.upLimit
  const stopLowLimit = stop?.lowLimit

  return (startUplimit instanceof Date && startUplimit < time) || (startLowLimit instanceof Date && startLowLimit > time) || (stopUplimit instanceof Date && stopUplimit < time) || (stopLowLimit instanceof Date && stopLowLimit > time)
}

</script>