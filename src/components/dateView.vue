<template>
  <span v-if="state.readonly && text"
    :style="{ 'width': '100%', 'text-align': text === true ? state.defaultAlign : text }">
    {{ state.display }}
  </span>
  <el-select v-else-if="state.useWhiteList"
    v-model="whiteListData"
    :disabled="state.readonly || state.disable"
    :placeholder="state.selectPlaceHolder"
    :clearable="!state.require"
    style="width: 100%">
    <el-option v-for="item in state.whiteList"
      :key="item"
      :label="state.kind === 'year' ? item : dateFormat(item)"
      :value="item"></el-option>
  </el-select>
  <el-date-picker v-else
    v-model="data"
    :type="state.kind"
    :placeholder="!state.readonly && state.default && dateFormat(state.default) || state.selectPlaceHolder"
    :disabled="state.readonly || state.disable"
    :value-format="state.kind === 'year' ? 'YYYY' : null"
    :disabled-date="disabledDate"
    style="width: 100%"
  ></el-date-picker>
</template>

<script lang="ts" setup>
import { AsSuggest, BlackList, DataNode, DateNode, Default, Disable, Display, getNodeType, IntNode, isNull, NS_SYSTEM_FULL_DATE, NS_SYSTEM_YEAR, NS_SYSTEM_YEARMONTH, ReadOnly, Require, ScalarType, sformat, subscribeLanguage, ValueType, WhiteList } from 'schema-node-core'
import { computed, onMounted, onUnmounted, reactive, toRaw } from 'vue'
import { _L } from '../utility/locale'
import { subscribeAncestorProperty } from '../utility/toolset';

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{ 
  /** Input schema node */
  node: DataNode, 

  /** Display readon only value as plain text */
  text?: boolean | 'left' | 'right' | 'center'
}>()
const node = toRaw(props.node)

// ── UI State ──────────────────────────────────────────────────────
/** Display state */
const state = reactive<{
  data?: any,
  kind?: 'year' | 'month' | 'date' | 'datetime',
  default?: any,
  display?: any,
  selectPlaceHolder?: string,
  defaultAlign?: "left" | "right" | "center",
  disable?: boolean,
  require?: boolean,
  asSuggest?: boolean,
  readonly?: boolean,
  useWhiteList?: boolean,
  whiteList?: any[],
  changed?: boolean
}>({ defaultAlign: "left" })

// Data
const data = computed({
  get(): any { return state.kind === 'year' ? `${state.data}` : state.data },
  set(value: any) { node.value = value }
})

// ── Utility ───────────────────────────────────────────────────────

// white list
const whiteListData = computed({
  get() {
    return node.value ? dateFormat(node.value) : null
  },
  set(newValue) {
    if (!isNull(newValue)) {
      if (state.kind === 'year') {
        node.value = parseInt(newValue!)
      } else {
        node.value = newValue ? new Date(newValue) : null
      }
    } else {
      node.value = null
    }
  }
})

// generate display
const display = () => {
  if (state.kind === 'year') return node.value

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
  if (state.kind === 'month') {
    return `${date.getFullYear()}-${date.getMonth() + 1}`
  }
  if (state.kind === 'datetime') {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.toLocaleTimeString()}`
  }

  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const disabledDate = (time: Date) => {
  if (node.readonly) return false

  if (state.kind === 'year') {
    const upLimit = (node as IntNode).upLimit
    const lowLimit = (node as IntNode).lowLimit
    return (typeof upLimit === "number" && upLimit < time.getFullYear()) || (typeof lowLimit === "number" && lowLimit > time.getFullYear())
  }
  else 
  {
    const upLimit = (node as DateNode).upLimit
    const lowLimit = (node as DateNode).lowLimit
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
}

const dateFormat = (date: any): string => {
  if (state.kind === 'year') return date;
  const dateObj = new Date(date);
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
  state.kind = node.type.isAssignableTo(await getNodeType(NS_SYSTEM_YEAR) as ValueType) ? 'year' : getKind(node.type as ScalarType);

  subs.push(node.subscribe(() => {
    state.data = node.rawValue
    if (props.text) state.display = display()
    state.changed = node.changed
  }, true))

  subs.push(subscribeAncestorProperty(node, ReadOnly, (values: boolean[]) => state.readonly = node.readonly || values.some(v => v), true))
  subs.push(subscribeAncestorProperty(node, Disable, (values: boolean[]) => state.disable = values.some(v => v), true))
  subs.push(node.subscribeProperty(Default, (owner, propCtor, newValue) => state.default = newValue, true))
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
  subs.push(node.subscribeProperty(WhiteList, refreshWhiteList))
  subs.push(node.subscribeProperty(BlackList, refreshWhiteList, true))

  // language
  subs.push(subscribeLanguage(() => {
    state.selectPlaceHolder = sformat("PLACEHOLDER_SELECT", node.getPropertyValue(Display) ?? node.name);
  }, true));
})

onUnmounted(() => {
  subs.forEach(sub => sub())
})
</script>
