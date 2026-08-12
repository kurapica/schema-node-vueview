<template>
  <span v-if="text && state.readonly" 
    :style="{'width': '100%', 'min-width': '120px', 'display': 'inline-block', 'text-align': text === true ? state.defaultAlign : text }">
    {{ _L(state.display) }}
  </span>
  <el-cascader
    v-model="data"
    style="width: 100%;min-width: 120px"
    :options="options"
    :props="{
      emitPath: false,
      multiple: !state.single,
      lazy: false
    }"
    :placeholder="state.selectPlaceHolder"
    :disabled="state.readonly || state.disable"
    :clearable="!state.require"
    v-bind="$attrs"
  ></el-cascader>
</template>

<script setup lang="ts">
import { DataNode, Disable, Display, EnumType, getPropertyValue, LocaleString, ReadOnly, Require, formatLocaleString, SingleFlag, subscribeLanguage } from 'schema-node-core';
import { computed, onMounted, onUnmounted, reactive, ref, toRaw } from 'vue';
import { _L } from '../utility/locale';
import { subscribeAncestorProperty } from '../utility/toolset';

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{
  /** Input schema node */
  node: DataNode,

  /** Use text mode when readonly  */
  text?: boolean | 'left' | 'right' | 'center',
}>();
const node = toRaw(props.node);

// ── UI State ──────────────────────────────────────────────────────
/** State */
const state = reactive<{
  /** Data */
  data?: number | number[],
  
  /** Display value */
  display?: string | LocaleString,

  /** Select placeholder */
  selectPlaceHolder?: string,
  
  /** Default align */
  defaultAlign?: 'left' | 'right' | 'center',

  /** Readonly */
  readonly?: boolean,
  
  /** Disable */
  disable?: boolean,
  
  /** Require */
  require?: boolean,
  
  /** Single flag */
  single?: boolean,
}>({ defaultAlign: 'right' });

/** Data model */
const data = computed({
  get (): any { return state.data },
  set(value: any) { state.data = Array.isArray(value) ? value.includes(0) && options.value.some(a => a.value === 0) ? 0 : joinFlags(value) : value; }
})

// ── Entry List ────────────────────────────────────────────────────
/** Entry list */
interface ICascaderOptionInfo
{
  value: any
  localename?: LocaleString
  label: string
  disabled?: boolean
  leaf: boolean
}

/** Entry list of flag enum view */
const options = ref<ICascaderOptionInfo[]>([]);

// ── Utility ───────────────────────────────────────────────────────

/** Split flags into binary array */
const splitFlags = (flags: number): number[] => {
  return flags.toString(2).split('').reverse().map((a, i) => Number(a) * Math.pow(2, i)).filter(a => a > 0)
}

/** Join binary array into flags */
const joinFlags = (flags: number[]): number => {
  return flags.reduce((a, b) => a | b, 0)
}

/** refresh the display value */
function refreshDisplay() {
  const displays = splitFlags(node.value as number).map(a => options.value.find(b => b.value === a)?.label ?? a);
  state.display = displays.join(', ');
}

// ── Life Cycle ────────────────────────────────────────────────────
/** Subscription */
const subs: Function[] = [];

onMounted(async () => {
  // state change
  subs.push(subscribeAncestorProperty(node, ReadOnly, (values: boolean[]) => state.readonly = node.readonly || values.some(v => v), true)); // readonly covers several properties
  subs.push(subscribeAncestorProperty(node, Disable, (values: boolean[]) => state.disable = values.some(v => v), true));
  subs.push(node.subscribeProperty(Require, (owner, propCtor, newValue, oldValue) => state.require = newValue as boolean, true));
  subs.push(node.subscribeProperty(SingleFlag, (owner, propChange, newValue, oldValue) => { state.single = newValue as boolean; }, true));

  // data change
  subs.push(node.subscribe(() => {
    state.data = state.single ? node.value as number : splitFlags(node.value as number);
    refreshDisplay();
  }, true));

  // options
  const access = await (node.type as EnumType).getEnumEntryAccess(); // root;
  options.value = access[0].children?.map(a => ({
    value: a.value,
    localename: getPropertyValue<LocaleString>(a, Display),
    label: _L.value(getPropertyValue<LocaleString>(a, Display) ?? a.value),
    disabled: getPropertyValue<boolean>(a, Disable),
    leaf: true,
  })) || [];

  // language change
  subs.push(subscribeLanguage(() => {
    state.selectPlaceHolder = formatLocaleString("PLACEHOLDER_SELECT", node.getPropertyValue(Display) ?? node.name);
    options.value = options.value.map(a => {
      a.label = _L.value(a.localename ?? a.value);
      return a;
    });
    refreshDisplay();
  }, true))
})

onUnmounted(() => {
  subs.forEach(a => a())
})
</script>