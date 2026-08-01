<template>
  <span v-if="text && state.readonly" 
    :style="{'width': '100%', 'min-width': '120px', 'display': 'inline-block', 'text-align': text === true ? state.defaultAlign : text }">
    {{ _L(state.display) }}
  </span>
  <el-select v-if="state.enableOptions && state.single"
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
    </el-option>
  </el-select>
  <el-cascader v-else-if="state.enableOptions"
    v-model="data"
    style="width: 100%;min-width: 120px"
    :options="options"
    :props="{
      emitPath: false,
      multiple: state.multiple,
      lazy: true,
      lazyLoad
    }"
    :placeholder="state.selectPlaceHolder"
    :disabled="state.readonly || state.disable"
    :clearable="!state.require"
    v-bind="$attrs"
  ></el-cascader>
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
import { AsSuggest, BlackList, Cascade, DataNode, Default, Disable, Display, ENTRY_ROOT, EntryAccess, EntrySource, EntryType, FuncCall, FunctionType, getNodeType, getProperty, getPropertyValue, isEmpty, isEqual, isNull, IValueAccess, LocaleString, NODE_SELF, NODE_TYPE, ReadOnly, Require, Root, sformat, subscribeLanguage, WhiteList } from 'schema-node-core';
import { computed, onMounted, onUnmounted, reactive, shallowRef, toRaw, useSlots } from 'vue';
import { _L } from '../utility/locale';

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{
  /** Input schema node */
  node: DataNode,

  /** Display readon only value as plain text */
  text?: boolean | 'left' | 'right' | 'center'
}>();
const node = toRaw(props.node);

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

  /** Multiple */
  multiple?: boolean,

  /** As suggest */
  asSuggest?: boolean,

  /** Enable options */
  enableOptions?: boolean,

  /** Single */
  single?: boolean,
}>({})

/** Data model */
const data = computed({
  get (): any { return state.data },
  set(value: any) { state.data = value }
})

// ── Entry List ────────────────────────────────────────────────────

/** Cascader option info */
interface ICascaderOptionInfo
{
  value: any
  localename?: LocaleString
  label: string
  disabled?: boolean
  leaf: boolean
  children: ICascaderOptionInfo[] | undefined | null
}

/** Entry source arg */
interface IEntrySourceArg
{
  source?: IValueAccess,
  value?: any,
  isroot?: boolean,
}

/** Cascader options */
const options = shallowRef<ICascaderOptionInfo[]>([]);

/** Entry source info */
const entrySourceInfo: {
  owner?: DataNode,
  source?: FunctionType,
  args?: IEntrySourceArg[],
  subscribes?: Function[],
  cascade?: number,
  root?: string,
  rootEntry?: EntryType<any>,
  whiteList?: string[],
  blackList?: string[],
  noEntry?: boolean,
} = {};

/** get access list from entry source args */
async function getAccessList(value: any, root?: any): Promise<EntryAccess<any>[]> {
  if (!entrySourceInfo.source || !entrySourceInfo.args) return []
  return await entrySourceInfo.source.call(entrySourceInfo.args.map(a => {
      if (a.source) return a.source === node ? value : a.source.getValue();
      if (a.isroot) return root;
      return a.value;
    })) as EntryAccess<any>[]
}

/** get entry access list from entry source args */
async function getSubEntryList(value: any): Promise<ICascaderOptionInfo[]> {
  if (entrySourceInfo.noEntry || !entrySourceInfo.source || !entrySourceInfo.args || !entrySourceInfo.rootEntry) return []
  let accessList = entrySourceInfo.rootEntry.getAccessList(value);
  let lastAccess = accessList?.[accessList.length - 1];
  if (lastAccess && !lastAccess.entry?.hasChildren) return []; // leaf node

  // query access list
  if (!lastAccess || !lastAccess.children?.length) {
    const queryAccessList =  await getAccessList(value, lastAccess?.entry?.value);

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
          queryAccessList.splice(i);
          if (i > 0)
          {
            const item = queryAccessList[i-1].children?.find(c => c.value == curr.entry?.value);
            if (item) // @TODO: may need update the options
              item.hasChildren = false;
          }
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
      localename: getPropertyValue<LocaleString>(a, Display),
      label: _L.value(getPropertyValue<LocaleString>(a, Display) ?? a.value),
      disabled: getPropertyValue<boolean>(a, Disable),
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

/** init options with entry source args */
async function initOptions(){
  entrySourceInfo.noEntry = false;
  if (entrySourceInfo.whiteList?.length)
  {
    const accesses: EntryAccess<any>[][] = [];
    const passKeys = new Set<string>();
    for (const item of entrySourceInfo.whiteList.filter(a => !entrySourceInfo.blackList?.includes(a)))
    {
      const queryAccessList = await getAccessList(item);
      if (!entrySourceInfo.root || queryAccessList.some(a => a.entry?.value == entrySourceInfo.root))
      {
        accesses.push(queryAccessList);
        queryAccessList.filter(a => a.entry?.value).forEach(a => passKeys.add(`${a.entry?.value}`));
      }
    }

    // no access list, allow none
    entrySourceInfo.noEntry = accesses.length == 0;

    // cut access list
    accesses.forEach(a => {
      for (let i = 0; i < a.length; i++)
      {
        const curr = a[i];
        curr.children = curr.children?.filter(a => passKeys.has(`${a.value}`) && !entrySourceInfo.blackList?.includes(`${a.value}`));
        if (!curr.children?.length && curr.entry?.hasChildren)
        {
          curr.entry.hasChildren = false;
          a.splice(i);
          if (i > 0)
          {
            const item = a[i-1].children?.find(c => c.value == curr.entry?.value);
            if (item)
              item.hasChildren = false;
          }
          break;
        }
      }
      entrySourceInfo.rootEntry!.saveAccessList(a);
    })
  }
  options.value = await getSubEntryList(entrySourceInfo.root);
  state.single = options.value.every(a => a.leaf);

  // load options to the value
  let value = node.getValue();
  if (!isEmpty(value))
  {
    if (!Array.isArray(value)) value = [value];
    for(let v of value as Array<any>)
    {
      await getSubEntryList(v);
      const accessList = entrySourceInfo.rootEntry!.getAccessList(v);
      if (!accessList?.length) continue;
      let subOptions = options.value;

      for (let i = 0; i < accessList.length; i++)
      {
        const curr = accessList[i];
        if (curr.entry?.value)
        {
          const opts = getOptionsByValue(subOptions, curr.entry?.value);
          if (!opts?.length) break;
          const last = opts[opts.length - 1];
          if (last.leaf) break;
          if (curr.entry?.hasChildren && curr.children?.length && !last.children?.length)
          {
            const isLeaf = entrySourceInfo.cascade && entrySourceInfo.cascade <= i + 1;
            last.children = curr.children.map(a => ({
              value: a.value,
              localename: getPropertyValue<LocaleString>(a, Display),
              label: _L.value(getPropertyValue<LocaleString>(a, Display) ?? a.value),
              disabled: getPropertyValue<boolean>(a, Disable),
              leaf: isLeaf || !a.hasChildren,
              children: undefined,
            }))
          }
          if (!last.children) break;
          subOptions = last.children;
        }
      }
    }
  }
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
        }
        else if (a.source)
        {
          const target = owner.getAccessValue(a.source);
          if (target)
          {
            result.source = target;
            entrySourceInfo.subscribes ??= [];
            entrySourceInfo.subscribes.push(target.subscribe(() => initOptions()));
          }
          console.error(`Entry source arg ${a.source} from ${(owner as DataNode).access} not found`);
        }
        return result;
      });

      // init options
      await initOptions();
    }

    // enable options
    state.enableOptions = true;
    return;
  }
  else if (entrySourceInfo?.source)
  {
    entrySourceInfo.source = undefined;
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

/** get option by value */
function getOptionsByValue(options: ICascaderOptionInfo[], value: any): ICascaderOptionInfo[] | undefined
{
  for (let i = 0; i < options.length; i++)
  {
    const item = options[i];
    if (item.value == value) return [item];
    const child = item.children?.length ? getOptionsByValue(item.children, value) : undefined;
    if (child?.length) return [item, ...child];
  }
  return undefined;
}

/** refresh options label */
function refreshOptionsLabel(options: ICascaderOptionInfo[])
{
  options.forEach(item => {
    item.label = _L.value(item.localename ?? item.label ?? item.value);
    if (item.children?.length) refreshOptionsLabel(item.children);
  })
}

/** refresh the display value */
function refreshDisplay() {
  if (state.enableOptions)
  {
    const items = getOptionsByValue(options.value, node.value);
    const item = items ? items[items.length - 1] : undefined;
    state.display = item?.localename ?? item?.label ?? (!isEmpty(node.value) ? `${node.value}` : "");
  }
  else
  {
    state.display = !isEmpty(node.value) ? `${node.value}` : "";
  }
}

// ── Life Cycle ────────────────────────────────────────────────────
/** Subscription */
const subs: Function[] = []

// mounted
onMounted(async() => { 
  // data change
  subs.push(node.subscribe(() => {
    state.data = node.value;
    state.changed = node.changed;
    state.multiple = Array.isArray(state.data);
    state.defaultAlign = typeof(state.data) === 'number' ? 'right' : 'left';

    if (props.text) refreshDisplay();
  }, true));

  // state change
  subs.push(node.subscribeProperty(ReadOnly, () => state.readonly = node.readonly, true)); // readonly covers several properties
  subs.push(node.subscribeProperty(Default, (owner, propCtor, newValue, oldValue) => state.default = newValue, true));
  subs.push(node.subscribeProperty(Disable, (owner, propCtor, newValue, oldValue) => state.disable = newValue as boolean, true));
  subs.push(node.subscribeProperty(Require, (owner, propCtor, newValue, oldValue) => state.require = newValue as boolean, true));
  subs.push(node.subscribeProperty(AsSuggest, (owner, propCtor, newValue, oldValue) => state.asSuggest = newValue as boolean, true));

  // options
  subs.push(node.subscribeProperty(WhiteList, refreshEntrySource));
  subs.push(node.subscribeProperty(BlackList, refreshEntrySource));
  subs.push(node.subscribeProperty(EntrySource, refreshEntrySource));
  subs.push(node.subscribeProperty(Root, refreshEntrySource));
  subs.push(node.subscribeProperty(Cascade, refreshEntrySource));

  // display
  subs.push(subscribeLanguage(() => {
    state.inputPlaceHolder = sformat("PLACEHOLDER_INPUT", node.getPropertyValue(Display) ?? node.name);
    state.selectPlaceHolder = sformat("PLACEHOLDER_SELECT", node.getPropertyValue(Display) ?? node.name);
    if (props.text) refreshDisplay();
    refreshOptionsLabel(options.value);
  }, true));
  await refreshEntrySource();
})

// destroy
onUnmounted(() => {
  subs.forEach(sub => sub())
})

</script>
