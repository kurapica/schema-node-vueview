<template>
  <schema-view v-if="fldnode"
    :key="fldnode.id"
    :node="fldnode"
    :in-form="getSubNodeFormType(fldnode, inForm, skin)"
    :skin="skin">
    <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
      <component :is="slot" v-bind="slotProps" />
    </template>
  </schema-view>
</template>

<script setup lang="ts">
import { DataNode, StructNode } from 'schema-node-core'
import { onMounted, onUnmounted, shallowRef, toRaw, useSlots } from 'vue'
import schemaView from '../schemaView.vue'
import { SchemaNodeFormType } from '../enum/formType'
import { getSubNodeFormType } from '../schemaView'
import { getField, isFieldChangable } from '../utility/node'

const props = defineProps<{
  /** Struct Schema node */
  node: DataNode,
  /** field name */
  field: string,
  /** In-form settings */
  inForm?: SchemaNodeFormType
  /** Skin */
  skin?: string
}>()

const node = toRaw(props.node) as StructNode

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]

const fldnode = shallowRef<DataNode | undefined>(getField(node, props.field))

const subs: Function[] = []

onMounted(() => {
  // When the field type is overrideable, the struct replaces the field node on
  // OverrideType changes (core's StructNode notifies subscribers when that happens).
  // Re-resolve the live field node by name on each struct notification.
  if (isFieldChangable(node, props.field)) {
    subs.push(node.subscribe(() => {
      const next = getField(node, props.field)
      if (next && next.id !== fldnode.value?.id) fldnode.value = next
    }))
  }
})

onUnmounted(() => {
  subs.forEach(sub => sub())
})
</script>

