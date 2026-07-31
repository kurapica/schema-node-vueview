<template>
</template>

<script lang="ts" setup>
import { AsSuggest, BlackList, DataNode, Default, Disable, Display, EntrySource, FuncCall, FunctionType, getNodeType, LocaleString, ReadOnly, Require, sformat, subscribeLanguage, WhiteList } from 'schema-node-core';
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
    localename?: LocaleString
    label: string
    disabled?: boolean
    enumlevel: number
    leaf: boolean
    children: ICascaderOptionInfo[] | undefined | null
}
const options = shallowRef<ICascaderOptionInfo[]>([]);
let entrySource: FuncCall | undefined;
let entryFunc: FunctionType | undefined;

/** refresh the options with entry source & white list & black list */
async function refreshOptions() {
  const node = toRaw(props.node);
  const whiteList = node.getPropertyValue<string[]>(WhiteList);
  const blackList = node.getPropertyValue<string[]>(BlackList);

  // entry source
  entrySource = node.getPropertyValue<FuncCall>(EntrySource);
  if (entrySource?.func)
  {
    entryFunc = await getNodeType(entrySource.func) as FunctionType;
    if (entryFunc)
    {
      // init options
      options.value = entryFunc.call(node);
      state.enableOptions = true;
      return;
    }
  }
  
  // Simple case
  if (whiteList?.length)
  {
    state.enableOptions = true;
    options.value = whiteList.filter(item => !blackList?.includes(item)).map(item => ({
      value: item,
      label: item,
      disabled: false,
      enumlevel: 0,
      leaf: true,
      children: undefined,
    }));
  }
  else 
  {
    state.enableOptions = false;
    options.value = [];
  }
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
