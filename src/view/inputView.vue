<template>
  <span v-if="text && state.readonly" 
    :style="{'width': '100%', 'min-width': '120px', 'display': 'inline-block', 'text-align': text === true ? state.defaultAlign : text }">
    {{ _L(state.display) }}
  </span>
  <el-select v-else-if="state.enableOptions && state.single && !state.multiple"
    v-model="data"
    style="width: 100%;min-width: 120px;"
    :disabled="state.readonly || state.disable"
    :clearable="!state.require"
    :filterable="state.asSuggest"
    :allow-create="state.asSuggest"
    :default-first-option="state.asSuggest"
    :placeholder="state.selectPlaceHolder"
    v-bind="$attrs">
    <el-option
        v-for="item in options"
        :key="item.value"
        :label="_L(item.localename ?? item.label ?? item.value)"
        :value="item.value">
        <slot name="default" :node="item">
          <span>{{ item.label ?? item.value }}</span>
        </slot>
    </el-option>
  </el-select>
  <el-cascader v-else-if="state.enableOptions"
    v-model="data"
    :key="state.version"
    style="width: 100%;min-width: 120px"
    :options="options"
    :props="{
      emitPath: false,
      multiple: state.multiple,
      checkStrictly: !state.leafOnly && state.enableNoneLeafNode,
      lazy: true,
      lazyLoad
    }"
    :placeholder="state.selectPlaceHolder"
    :disabled="state.readonly || state.disable"
    :clearable="!state.require"
    v-bind="$attrs">
    <template #default="{ node }">
      <slot name="default" :node="node">
        <span>{{ node.label ?? node.value }}</span>
      </slot>
    </template>
  </el-cascader>
  <el-input v-else
    v-model="data"
    :disabled="state.readonly || state.disable"
    style="width: 100%;min-width: 120px"
    :placeholder="!state.readonly && !isNull(state.default) && `${state.default}` || state.inputPlaceHolder"
    v-bind="$attrs">
    <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
        <component :is="slot" v-bind="slotProps" />
    </template>
  </el-input>
</template>

<script lang="ts" setup>
import { AsSuggest, DataNode, Default, Disable, Display, Entry, getPropertyValue, isNull, LeafOnly, LocaleString, ReadOnly, Require, formatLocaleString, subscribeLanguage, ScalarNode, EntrySourceVersion, EntryAccess, NS_SYSTEM_SCHEMA_NODE_VALUE_KIND, NS_SYSTEM_BOOL, useQueueQuery, SCHEMA_KIND_ARRAY } from 'schema-node-core';
import { computed, onMounted, onUnmounted, reactive, shallowRef, toRaw, useSlots } from 'vue';
import { _L } from '../utility/locale';
import { subscribeAncestorProperty } from '../utility/toolset';

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{
  /** Input schema node */
  node: DataNode,

  /** The readonly mode */
  readonly?: boolean,

  /** Display readon only value as plain text */
  text?: boolean | 'left' | 'right' | 'center'
}>();
const node = (toRaw(props.node) as ScalarNode)!;

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]

// ── UI State ──────────────────────────────────────────────────────
/** Display state */
const state = reactive<{
  /** Data */
  data?: any,
  
  /** Display */
  display?: string | LocaleString,

  /** Input placeholder */
  inputPlaceHolder?: string,

  /** Select placeholder */
  selectPlaceHolder?: string,

  /** Default align */
  defaultAlign?: 'left' | 'right' | 'center',

  /** Default value */
  default?: any,

  /** Readonly */
  readonly?: boolean,

  /** Disable */
  disable?: boolean,

  /** Require */
  require?: boolean,

  /** Changed */
  changed?: boolean,

  /** Valid */
  valid?: boolean,

  /** Multiple */
  multiple?: boolean,

  /** As suggest */
  asSuggest?: boolean,

  /** Enable options */
  enableOptions?: boolean,

  /** Single */
  single?: boolean,

  /** Leaf only */
  leafOnly?: boolean,

  /** Whether to allow all root passed */
  enableNoneLeafNode?: boolean,

  version: number
}>({ version: 0 })

/** Data model */
const data = computed({
  get (): any { return state.data },
  set(value: any) { node.value = value }
})

// ── Entry List ────────────────────────────────────────────────────

/** Cascader option info */
interface ICascaderOptionInfo
{
  value: any
  localename?: LocaleString
  label: string
  disabled?: boolean
  disabledRoot?: boolean
  leaf: boolean
  children: ICascaderOptionInfo[] | undefined
}

/** Cascader options */
const options = shallowRef<ICascaderOptionInfo[]>([]);
const accessed = new Set<any>();

/** convert entry to option */
function entryToOptions(entries: Entry<any>[]): ICascaderOptionInfo[]
{
  const options = entries.map(entry => {
    return {
      value: entry.value,
      localename: getPropertyValue<LocaleString>(entry, Display),
      label: _L.value(getPropertyValue<LocaleString>(entry, Display) ?? entry.value),
      disabled: !entry.hasChildren && getPropertyValue<boolean>(entry, Disable),
      disabledRoot: getPropertyValue<boolean>(entry, Disable),
      leaf: !entry.hasChildren,
      children: undefined,
    }
  }).filter(o => !(o.leaf && o.disabled));
  return options;
}

/** convert entry access to option */
function saveEntryAccess(entryAccess: EntryAccess<any>[], options: ICascaderOptionInfo[])
{
  if (!entryAccess.length) return;
  if (options.length === 0)
    options.splice(0, 0, ...entryToOptions(entryAccess[0].children ?? []));

  if (entryAccess.length > 1)
  {
    entryAccess = entryAccess.slice(1);
    if (entryAccess[0].entry?.value)
    {
      const option = options.find(o => o.value === entryAccess[0].entry!.value);
      if (option && !option.leaf)
      {
        option.children = option.children ?? [];
        saveEntryAccess(entryAccess, option.children);
      }
    }
  }
}

/** lazy load options from entry source args */
const lazyLoad = async (treeNode: { value: any }, resolve: Function, reject: any): Promise<void> => {
  const { value } = treeNode
  accessed.add(value);
  const opt = inOptions(options.value, value);
  if (!opt || opt.leaf) return resolve([]);
  const list = await node.getSubEntryList(value);
  opt.children = entryToOptions(list);
  resolve(opt.children);
}

/** refresh options label */
function refreshOptionsLabel(options: ICascaderOptionInfo[])
{
  options.forEach(item => {
    item.label = _L.value(item.localename ?? item.label ?? item.value);
    if (item.children?.length) refreshOptionsLabel(item.children);
  })
}

function inOptions(options: ICascaderOptionInfo[], value: any): ICascaderOptionInfo | undefined
{
  if (!options.length) return undefined;
  for (const item of options) {
    if (item.value == value)
      return item;

    if (item.children?.length)
    {
      const child = inOptions(item.children, value);
      if (child) return child;
    }
  }
  return undefined;
}

async function rebuildOptions(incrVer = false)
{
  const values: ICascaderOptionInfo[] = [];
  const value = node.value;
  if (value) accessed.add(value);
  for(const item of accessed)
    saveEntryAccess(await node.getEntryAccessList(item), values);
  options.value = values.length ? values : entryToOptions(await node.getSubEntryList());
  if (incrVer) state.version++;
}

const queueRebuildOptions = useQueueQuery(rebuildOptions);

// ── Life Cycle ────────────────────────────────────────────────────
/** Subscription */
const subs: Function[] = []

// mounted
onMounted(async() => { 
  // data change
  subs.push(node.subscribe(async () => {
    state.data = node.rawValue;
    state.changed = node.changed;
    state.multiple = node.type.kind === SCHEMA_KIND_ARRAY;
    state.defaultAlign = typeof(state.data) === 'number' ? 'right' : 'left';

    if (props.text) state.display = await node.getDisplayValue(' / ');

    if (state.enableOptions && !isNull(state.data) && Array.isArray(state.data) ? state.data.some(d => !inOptions(options.value, d)) : !inOptions(options.value, state.data))
    {
      if (Array.isArray(state.data))
      {
        for(const d of state.data)
          accessed.add(d);
      }
      else
      {
        accessed.add(state.data);
      }
      await queueRebuildOptions(true);
    }
  }, true));

  // state change
  if (props.readonly) {
    state.readonly = true;
  }
  else {
    subs.push(subscribeAncestorProperty(node, ReadOnly, (values: boolean[]) => state.readonly = values.some(v => v), true));
    subs.push(subscribeAncestorProperty(node, Disable, (values: boolean[]) => state.disable = values.some(v => v), true));
  }
  subs.push(node.subscribeProperty(Default, (owner, propCtor, newValue, oldValue) => state.default = newValue, true));
  subs.push(node.subscribeProperty(Require, (owner, propCtor, newValue, oldValue) => state.require = newValue as boolean, true));
  subs.push(node.subscribeProperty(AsSuggest, (owner, propCtor, newValue, oldValue) => state.asSuggest = newValue as boolean, true));
  subs.push(node.subscribeProperty(LeafOnly, (owner, propCtor, newValue, oldValue) => state.leafOnly = newValue as boolean, true));
  subs.push(node.subscribeProperty(EntrySourceVersion, async (owner, propCtor, newValue, oldValue) => {
    state.enableOptions = node.hasEntrySource;
    state.single = node.isSingleLevel;
    state.enableNoneLeafNode = node.isNonLeafNodeSelectable;

    // rebuild options
    if (!state.enableOptions) {
      options.value = [];
      accessed.clear();
      return;
    }
    await queueRebuildOptions();
  }, true));

  // display
  subs.push(subscribeLanguage(async () => {
    state.inputPlaceHolder = formatLocaleString("PLACEHOLDER_INPUT", node.getPropertyValue(Display) ?? node.name);
    state.selectPlaceHolder = formatLocaleString("PLACEHOLDER_SELECT", node.getPropertyValue(Display) ?? node.name);
    if (props.text) state.display = await node.getDisplayValue(' / ');
    refreshOptionsLabel(options.value);
    options.value = [...options.value];
  }, true));

  subs.push(node.subscribeViolated(() => state.valid = node.isValid, true));

})

// destroy
onUnmounted(() => subs.forEach(sub => sub()))

</script>
