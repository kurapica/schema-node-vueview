<template>
</template>

<script lang="ts" setup>
import { AsSuggest, BlackList, DataNode, Default, Disable, Display, EntrySource, FuncCall, LocaleString, ReadOnly, Require, sformat, subscribeLanguage, WhiteList } from 'schema-node-core';
import { computed, onMounted, onUnmounted, reactive, shallowRef, toRaw } from 'vue';
import { _L } from '../utility/locale';

const props = defineProps<{
  /** Input schema node */
  node: DataNode,
}>();

// ── State ──────────────────────────────────────────────────────────
// the display state
const state = reactive<{
  data?: any,

  // display
  inputPlaceHolder?: string,
  selectPlaceHolder?: string,

  // base state
  default?: any,
  readonly?: boolean,
  disable?: boolean,
  require?: boolean,
  changed?: boolean,

  multiple?: boolean,

  // entry state
  asSuggest?: boolean,
  enableOptions?: boolean,
}>({})
const subs: Function[] = []

// data model
const data = computed({
  get (): any { return state.data },
  set(value: any) { state.data = value }
})

// ── Entry List ────────────────────────────────────────────────────

interface ICascaderOptionInfo
{
    value: any
    localename: LocaleString
    label: string
    disabled?: boolean
    enumlevel: number
    leaf: boolean
    children: ICascaderOptionInfo[] | undefined | null
}
const options = shallowRef<ICascaderOptionInfo[]>([]);

/** refresh the options with entry source & white list & black list */
async function refreshOptions() {
  const node = toRaw(props.node);

  // entry source first
  const entrySource = node.getPropertyValue<FuncCall>(EntrySource);
}

// ── Life Cycle ────────────────────────────────────────────────────
// mounted
onMounted(async() => {
  const node = toRaw(props.node);

  // data change
  subs.push(node.subscribe(() => {
    state.data = node.value;
    state.changed = node.changed;
  }, true))

  // state change
  subs.push(node.subscribeProperty(ReadOnly, () => state.readonly = node.readonly, true)); // readonly covers several properties
  subs.push(node.subscribeProperty(Default, (owner, propCtor, newValue, oldValue) => state.default = newValue, true));
  subs.push(node.subscribeProperty(Disable, (owner, propCtor, newValue, oldValue) => state.disable = newValue as boolean, true));
  subs.push(node.subscribeProperty(Require, (owner, propCtor, newValue, oldValue) => state.require = newValue as boolean, true));
  subs.push(node.subscribeProperty(AsSuggest, (owner, propCtor, newValue, oldValue) => state.asSuggest = newValue as boolean, true));

  // options
  subs.push(node.subscribeProperty(WhiteList, refreshOptions))
  subs.push(node.subscribeProperty(BlackList, refreshOptions))
  subs.push(node.subscribeProperty(EntrySource, refreshOptions))

  // display
  subs.push(subscribeLanguage(() => {
    state.inputPlaceHolder = sformat("PLACEHOLDER_INPUT", node.getPropertyValue(Display) ?? node.name)
    state.selectPlaceHolder = sformat("PLACEHOLDER_SELECT", node.getPropertyValue(Display) ?? node.name)
  }))
})

// destroy
onUnmounted(() => {
  subs.forEach(sub => sub())
})

</script>
