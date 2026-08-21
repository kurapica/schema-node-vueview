<template>
  <div v-if="!loaded && !invisible" ref="mask" style="width: 100%;height: 24px;">
    <el-skeleton animated v-bind="$attrs"></el-skeleton>
  </div>
  <template v-else-if="schemaNode && !invisible">
    <form-view v-if="inFormType === SchemaNodeFormType.Nest" :node="schemaNode" :in-form="inFormType" :label-width="labelWidth" :debug="debug"  :text="text"
      v-bind="$attrs">
      <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
        <component :is="slot" v-bind="slotProps" />
      </template>
    </form-view>
    <template v-else-if="component">
      <debug-view v-if="debug" :node="node"/>
      <component :is="component" :key="schemaNode.id" :node="schemaNode" :label-width="labelWidth" :debug="debug" :text="text"
        v-bind="{ ...$attrs, ...(inFormType ? { 'in-form': inFormType } : {}) }">
        <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
          <component :is="slot" v-bind="slotProps" />
        </template>
      </component>
    </template>
  </template>
</template>

<script setup lang="ts" name="SchemaView">
import { isReactive, isRef, onMounted, onUnmounted, ref, shallowRef, toRaw, useSlots, watch, type WatchHandle } from 'vue'
import formView from './view/formView.vue'
import { SchemaNodeFormType } from './enum/formType'
import { getSchemaTypeView, useSingleView } from './schemaView'
import { _L } from './utility/locale'
import { DataNode, getNodeType, InVisible, SCHEMA_KIND_STRUCT_FIELD, ValueType, Visible } from 'schema-node-core'
import { AppNode, Loaded } from 'schema-node-app'
import DebugView from './view/debugView.vue'

// props
const props = defineProps<{
  /** The schema node */
  node?: DataNode,

  /** The schema node type(if node not provided) */
  type?: string,

  /** The schema node value(if node not provided) */
  modelValue?: any,

  /** The value for display only, no model can be provided */
  value?: any,

  /** The schema node config(if node not provided)  */
  props?: Record<string, unknown>

  /** The skin to be use */
  skin?: string

  /** The form item display style */
  inForm?: boolean | "nest" | "expand" | "expandall" | ""

  /** The auto load container */
  rootDiv?: string | HTMLElement

  /** The text align */
  text?: boolean | 'left' | 'right' | 'center'

  /** The label width */
  labelWidth?: string
  
  /** instant validate the value */
  instantValid?: boolean

  /** Debug mode */
  debug?: boolean
}>()

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]

// model
const emit = defineEmits(['update:modelValue'])

// node
const schemaNode = shallowRef<DataNode | null>(null)
const component = shallowRef<any>(null)
const inFormType = ref<SchemaNodeFormType>(SchemaNodeFormType.None)
const invisible = ref(false)
const loaded = ref(true)
const mask = ref(null)

let observer: any = null

let configWatcher: WatchHandle | null = null
let updatevalue = false
let timeOut: number | null = null
let buildObserver: Function | null = null
let subscribes: Function[] = []

if (!props.node) {
  watch(() => props.modelValue, () => {
    if (updatevalue) return
    if (schemaNode.value)
      schemaNode.value!.value = toRaw(props.modelValue)
  })
}

onMounted(async () => {
  let node = props.node ? toRaw(props.node) : undefined

  // create the node if not provided
  if (!node) {
    if (props.type) {
      const type = await getNodeType(props.type) as ValueType
      node = type?.create(props.modelValue) as DataNode
      if (node && props.props) {
        if (isRef(props.props) || isReactive(props.props)) {
          configWatcher = watch(props.props, () => {
            const rawConfig = toRaw(props.props)
            if (!rawConfig) return
            node?.setPropertyValues(rawConfig, undefined, SCHEMA_KIND_STRUCT_FIELD)
          })
        }
        else
          node.setPropertyValues(toRaw(props.props), undefined, SCHEMA_KIND_STRUCT_FIELD)
      }
    }
  }
  if (!node) return

  // check if the node is the root node
  if (node.parent instanceof AppNode) {
    const root = typeof (props.rootDiv) === "string" ? document.querySelector(props.rootDiv) : props.rootDiv
    buildObserver = async ([entry]: any) => {
      observer?.disconnect()
      observer = null;

      if (node?.getPropertyValue<boolean>(Loaded) ?? false) {
        loaded.value = true
        return
      }

      if (entry && entry.isIntersecting && node?.visible) {
        await (node!.parent as AppNode).reload([node!], true)
        loaded.value = true
      }
      else {
        while (!mask.value && !loaded.value)
          await new Promise(r => timeOut = setTimeout(r, 100))
        if (loaded.value) return

        observer = new IntersectionObserver(buildObserver as any, {
          rootMargin: "0px 0px 100px 0px",
          root,
        })
        observer.observe(mask.value)
      }
    }

    // check if the field is loaded
    loaded.value = node?.getPropertyValue<boolean>(Loaded) ?? false;
    if (!loaded.value) buildObserver([])
  }
  else {
    loaded.value = true
  }

  if (props.inForm === true) {
    // use default
    inFormType.value = useSingleView(node.type, props.skin) ? SchemaNodeFormType.Nest : SchemaNodeFormType.Expand
  }
  else if (props.inForm) {
    inFormType.value = props.inForm as SchemaNodeFormType
  }
  else {
    inFormType.value = SchemaNodeFormType.None
  }

  // gets the schema view
  component.value = getSchemaTypeView(node, props.skin)
  subscribes.push(node.subscribe(() => {
    updatevalue = true
    emit('update:modelValue', node.value)
    setTimeout(() => updatevalue = false, 20)
    if (!loaded.value && node.getPropertyValue<boolean>(Loaded)) {
      loaded.value = true
    }
  }))

  // visible change
  subscribes.push(node.subscribeProperty(Visible, () => invisible.value = !node.visible))
  subscribes.push(node.subscribeProperty(InVisible, () => invisible.value = !node.visible, true))

  // loaded change
  if (node.parent instanceof AppNode) {
    subscribes.push(node.subscribeProperty(Loaded, (owner, propCtor, newValue, oldValue) => {
      // Re-trigger lazy load if the field was unloaded externally (e.g. activeWorkflow reload)
      if (loaded.value && node.parent instanceof AppNode && !newValue) {
        loaded.value = false
        buildObserver?.([])
      }
    }, true))
  }

  schemaNode.value = node || null
})

onUnmounted(() => {
  loaded.value = true
  subscribes.forEach((sub) => sub())
  if (configWatcher) configWatcher.stop()
  if (timeOut) clearTimeout(timeOut)
})

</script>