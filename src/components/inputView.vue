<template>
  <el-cascader v-if="state.enableOptions"
    v-model="data"
    style="width: 100%;min-width: 120px"
    :options="options"
    :props="{
        emitPath: false,
        multiple: false,
        lazy: false,
        lazyLoad
    }"
    :placeholder="state.selectPlaceHolder"
    :disabled="state.readonly"
    :clearable="!state.require"
    v-bind="$attrs"
  ></el-cascader>
  <el-input v-else
    v-model="data"
    :disabled="state.readonly || state.disable"
    style="width: 100%;"
    :placeholder="!state.readonly && !isNull(state.default) && `${state.default}` || state.inputPlaceHolder"
    v-bind="$attrs">
    <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
        <component :is="slot" v-bind="slotProps" />
    </template>
  </el-input>
</template>

<script lang="ts" setup>
import { AsSuggest, BlackList, CallArg, Cascade, DataNode, Default, Disable, Display, Entry, ENTRY_ROOT, EntryAccess, EntrySource, EntryType, FuncCall, FunctionType, getNodeType, getProperty, isEqual, isNull, IValueAccess, LocaleString, NODE_SELF, NODE_TYPE, ReadOnly, Require, Root, sformat, subscribeLanguage, WhiteList } from 'schema-node-core';
import { computed, onMounted, onUnmounted, reactive, shallowRef, toRaw, useSlots } from 'vue';
import { _L } from '../utility/locale';

const props = defineProps<{
  /** Input schema node */
  node: DataNode,
}>();

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]

const node = toRaw(props.node);

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
    leaf: boolean
    children: ICascaderOptionInfo[] | undefined | null
}

interface IEntrySourceArg
{
  source?: IValueAccess,
  value?: any,
  isroot?: boolean,
}

const options = shallowRef<ICascaderOptionInfo[]>([]);
const entrySourceInfo: {
  owner?: DataNode,
  source?: FunctionType,
  args?: IEntrySourceArg[],
  enableRoot?: boolean,
  subscribes?: Function[],
  cascade?: number,
  root?: string,
  rootEntry?: EntryType<any>,
  whiteList?: string[],
  blackList?: string[],
} = {};

/** get entry access list from entry source args */
async function getSubEntryList(value: any): Promise<ICascaderOptionInfo[]> {
  if (!entrySourceInfo.source || !entrySourceInfo.args || !entrySourceInfo.rootEntry) return []
  let accessList = entrySourceInfo.rootEntry.getAccessList(value);
  let lastAccess = accessList?.[accessList.length - 1];
  if (lastAccess && !lastAccess.entry?.hasChildren) return []; // leaf node

  // query access list
  if (!lastAccess || !lastAccess.children?.length) {
    const queryAccessList = await entrySourceInfo.source.call(entrySourceInfo.args.map(a => {
      if (a.source) return a.source === node ? value : a.source.getValue();
      if (a.isroot) return lastAccess?.entry?.value;
      return a.value;
    })) as EntryAccess<any>[];

    // black list
    if (entrySourceInfo.blackList?.length)
    {
      for (let i = 0; i < queryAccessList.length; i++)
      {
        const curr = queryAccessList[i];
        if (curr.entry?.value && entrySourceInfo.blackList.includes(`${curr.entry.value}`))
        {
          queryAccessList.splice(i);
          break;
        }
        curr.children = curr.children?.filter(a => !entrySourceInfo.blackList!.includes(`${a.value}`));
        if (curr.entry?.hasChildren && !curr.children?.length)
        {
          curr.entry.hasChildren = false;
          queryAccessList.splice(i+1);
          break;
        }
      }
    }

    entrySourceInfo.rootEntry!.saveAccessList(queryAccessList);
    accessList = entrySourceInfo.rootEntry.getAccessList(value);
    lastAccess = accessList?.[accessList.length - 1];
  }

  // generate options
  if (!lastAccess || !lastAccess.children?.length) return []
  const isLeaf = entrySourceInfo.cascade && entrySourceInfo.cascade <= accessList!.length;
  return lastAccess.children!.map(a => {
    return {
      value: a.value,
      localename: getProperty(a, Display)?.getValue<LocaleString>(),
      label: _L.value(getProperty(a, Display)?.getValue<LocaleString>() ?? a.value),
      disabled: getProperty(a, Disable)?.getValue<boolean>(),
      leaf: isLeaf || !a.hasChildren,
      children: undefined,
    }
  })
}

/** lazy load options from entry source args */
const lazyLoad = async (treeNode: { value: any }, resolve: Function, reject: any): Promise<void> => {
  const { value } = treeNode
  resolve(await getSubEntryList(value));
}

/** refresh the options with entry source & white list & black list */
async function refreshEntrySource() {
  const whiteList = node.getPropertyValue<string[]>(WhiteList);
  const blackList = node.getPropertyValue<string[]>(BlackList);

  // entry source
  const entrySource = node.getPropertyValue<FuncCall>(EntrySource);
  const root = node.getPropertyValue<string>(Root);
  const cascade = node.getPropertyValue<number>(Cascade);
  const owner = node.getPropertySource(EntrySource) as DataNode;
  const entryFunc = entrySource?.func ? await getNodeType(entrySource.func) as FunctionType : undefined;
  
  if (entryFunc)
  {
    // refresh options if relatied properties changed
    if (entrySourceInfo?.source !== entryFunc || 
        entrySourceInfo?.cascade !== cascade || 
        entrySourceInfo?.root !== root ||
        entrySourceInfo?.owner !== owner ||
        !isEqual(entrySourceInfo.whiteList, whiteList) ||
        !isEqual(entrySourceInfo.blackList, blackList))
    {
      entrySourceInfo.owner = owner;
      entrySourceInfo.whiteList = whiteList;
      entrySourceInfo.blackList = blackList;
      entrySourceInfo.source = entryFunc;
      entrySourceInfo.enableRoot = false;
      entrySourceInfo.subscribes?.forEach(sub => sub());
      entrySourceInfo.subscribes = undefined;
      entrySourceInfo.rootEntry = new EntryType<any>();
      
      entrySourceInfo.args = entrySource!.args.map(a => {
        const result: IEntrySourceArg = { value: a.value };
        if (a.source === NODE_SELF)
        {
          result.source = node;
        }
        else if(a.source === NODE_TYPE)
        {
          result.value = node.type.name;
        }
        else if(a.source === ENTRY_ROOT)
        {
          result.isroot = true;
          entrySourceInfo.enableRoot = true;
        }
        else if (a.source)
        {
          const target = owner.getAccessValue(a.source);
          if (target)
          {
            result.source = target;
          }
          console.error(`Entry source arg ${a.source} from ${(owner as DataNode).access} not found`);
        }
        return result;
      });

      // init options
      options.value = await getSubEntryList(entrySourceInfo.root);
      if (entrySourceInfo.whiteList?.length)
        entrySourceInfo.rootEntry.maskWhiteList(entrySourceInfo.whiteList);
    }

    // enable options
    state.enableOptions = true;
    return;
  }
  else if (entrySourceInfo?.source)
  {
    entrySourceInfo.source = undefined;
    entrySourceInfo.enableRoot = false;
    entrySourceInfo.subscribes?.forEach(sub => sub());
    entrySourceInfo.subscribes = undefined;
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
  subs.push(node.subscribeProperty(WhiteList, refreshEntrySource))
  subs.push(node.subscribeProperty(BlackList, refreshEntrySource))
  subs.push(node.subscribeProperty(EntrySource, refreshEntrySource))
  subs.push(node.subscribeProperty(Root, refreshEntrySource))
  subs.push(node.subscribeProperty(Cascade, refreshEntrySource))

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
