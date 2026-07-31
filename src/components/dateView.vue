<template>
  <span v-if="(disabled || state.readonly) && plainText"
    :style="{ 'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
    {{ state.display }}
  </span>
  <el-select v-else-if="state.useWhiteList"
    v-model="whiteListData"
    :disabled="state.readonly || disabled || state.disable"
    :placeholder="selectPlaceHolder"
    :clearable="!state.require"
    style="width: 100%">
    <el-option v-for="item in state.whiteList"
      :key="item"
      :label="isYear ? item : dateFormat(item + '', isFullDate, isYear)"
      :value="item"></el-option>
  </el-select>
  <el-date-picker v-else
    v-model="data"
    :type="isYear ? 'year' : isYearMonth ? 'month' : isFullDate ? 'datetime' : 'date'"
    :placeholder="!state.readonly && state.default && dateFormat(state.default, isFullDate, isYear) || selectPlaceHolder"
    :disabled="state.readonly || disabled || state.disable"
    :value-format="isYear ? 'YYYY' : null"
    :disabled-date="disabledDate"
    style="width: 100%"
  ></el-date-picker>
</template>

<script lang="ts" setup>
import {
  AsSuggest, BlackList, DataNode, Default, Disable, Display, isNull,
  NS_SYSTEM_FULL_DATE, NS_SYSTEM_YEAR, NS_SYSTEM_YEARMONTH, ReadOnly, Require,
  sformat, WhiteList,
} from 'schema-node-core'
import { computed, onMounted, onUnmounted, reactive, toRaw } from 'vue'
import { _L } from '../utility/locale'

// Define props
const props = defineProps<{ node: DataNode, plainText?: any, disabled?: boolean }>()
const node = toRaw(props.node)

// date kind derived from the runtime type name
const isYear = node.type.name === NS_SYSTEM_YEAR
const isYearMonth = node.type.name === NS_SYSTEM_YEARMONTH
const isFullDate = node.type.name === NS_SYSTEM_FULL_DATE

// display state
const state = reactive<{
  data?: any,
  default?: any,
  display?: any,
  disable?: boolean,
  require?: boolean,
  asSuggest?: boolean,
  readonly?: boolean,
  useWhiteList?: boolean,
  whiteList?: any[],
  changed?: boolean
}>({})

// placeholder
const selectPlaceHolder = computed(() => sformat("PLACEHOLDER_SELECT", node.getPropertyValue(Display) ?? node.name))

// Data
const data = computed({
  get(): any {
    return isYear ? `${state.data}` : state.data
  },
  set(value: any) {
    node.value = value
  }
})

// white list
const whiteListData = computed({
  get() {
    return node.value ? dateFormat(node.value, isFullDate, isYear) : null
  },
  set(newValue) {
    if (!isNull(newValue)) {
      if (isYear) {
        node.value = parseInt(newValue!)
      } else {
        node.value = newValue ? new Date(newValue) : null
      }
    } else {
      node.value = null
    }
  }
})

// data & state watcher
const subs: Function[] = []

onMounted(() => {
  subs.push(node.subscribe(() => {
    state.data = node.rawValue
    state.display = display()
    state.changed = node.changed
  }, true))

  subs.push(node.subscribeProperty(ReadOnly, () => state.readonly = node.readonly, true))
  subs.push(node.subscribeProperty(Default, (owner, propCtor, newValue) => state.default = newValue, true))
  subs.push(node.subscribeProperty(Disable, (owner, propCtor, newValue) => state.disable = newValue as boolean, true))
  subs.push(node.subscribeProperty(Require, (owner, propCtor, newValue) => state.require = newValue as boolean, true))
  subs.push(node.subscribeProperty(AsSuggest, (owner, propCtor, newValue) => state.asSuggest = newValue as boolean, true))

  // white/black list
  const refreshWhiteList = () => {
    const whiteList = node.getPropertyValue<string[]>(WhiteList)
    const blackList = node.getPropertyValue<string[]>(BlackList)
    if (whiteList?.length) {
      state.useWhiteList = true
      let list = whiteList.map((w: any) => typeof w === "object" && !(w instanceof Date) ? w.value : w)
      if (blackList?.length)
        list = list.filter((w: any) => blackList.findIndex((b: any) => `${b}` === `${w}`) < 0) as any
      state.whiteList = list
    } else {
      state.useWhiteList = false
      state.whiteList = []
    }
  }
  subs.push(node.subscribeProperty(WhiteList, refreshWhiteList, true))
  subs.push(node.subscribeProperty(BlackList, refreshWhiteList, true))
})

onUnmounted(() => {
  subs.forEach(sub => sub())
})

//#region Helper

// generate display
const display = () => {
  if (isYear) return node.value

  // check value
  let value: any = node.value
  if (value) {
    if (typeof (value) === "string") {
      value = new Date(value);
      if (isNaN(value.getFullYear())) value = null
    }
    if (!(value instanceof Date)) {
      value = null
    }
  }
  if (!value) return ""

  // display
  const date = value as unknown as Date
  if (isYearMonth) {
    return `${date.getFullYear()}-${date.getMonth() + 1}`
  }
  if (isFullDate) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.toLocaleTimeString()}`
  }

  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const disabledDate = (time: Date) => {
  if (node.readonly) return false

  const upLimit = (node as any).upLimit
  const lowLimit = (node as any).lowLimit

  if (isYear) {
    return (typeof upLimit === "number" && upLimit < time.getFullYear()) || (typeof lowLimit === "number" && lowLimit > time.getFullYear())
  }
  else if (isYearMonth) {
    if (upLimit instanceof Date) {
      if (upLimit.getFullYear() < time.getFullYear() || upLimit.getFullYear() === time.getFullYear() && upLimit.getMonth() < time.getMonth())
        return true
    }
    if (lowLimit instanceof Date) {
      if (lowLimit.getFullYear() > time.getFullYear() || lowLimit.getFullYear() === time.getFullYear() && lowLimit.getMonth() > time.getMonth())
        return true
    }
    return false
  }
  else {
    return (upLimit instanceof Date && upLimit < time) || (lowLimit instanceof Date && lowLimit > time)
  }
}

const dateFormat = (date: any, hasTime?: boolean, isyear?: boolean): string => {
  if (isyear) return date;
  const dateObj = new Date(date);
  const YY = dateObj.getFullYear() + "-";
  const MM = (dateObj.getMonth() + 1 < 10 ? "0" + (dateObj.getMonth() + 1) : dateObj.getMonth() + 1) + "-";
  const DD = dateObj.getDate() < 10 ? "0" + dateObj.getDate() : dateObj.getDate();
  const dateStr = YY + MM + DD;
  if (hasTime) {
    const hh = (dateObj.getHours() < 10 ? "0" + dateObj.getHours() : dateObj.getHours()) + ":";
    const mm = (dateObj.getMinutes() < 10 ? "0" + dateObj.getMinutes() : dateObj.getMinutes()) + ":";
    const ss = dateObj.getSeconds() < 10 ? "0" + dateObj.getSeconds() : dateObj.getSeconds();
    return `${dateStr} ${hh + mm + ss}`;
  }
  return dateStr;
}

//#endregion
</script>
