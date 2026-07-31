<template>
  <template v-for="field in fields" :key="field.name">
    <struct-field-view v-if="isFieldChangable(node, field.name)"
      :node="node"
      :field="field.name"
      :in-form="inForm"
      :skin="skin"
      v-bind="$attrs">
      <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
        <component :is="slot" v-bind="slotProps" />
      </template>
    </struct-field-view>
    <schema-view v-else
      :key="field.node.id"
      :node="field.node"
      :in-form="getSubNodeFormType(field.node, inForm, skin)"
      :skin="skin"
      v-bind="$attrs">
      <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
        <component :is="slot" v-bind="slotProps" />
      </template>
    </schema-view>
  </template>
</template>

<script lang="ts" setup>
import { DataNode, StructNode } from 'schema-node-core'
import { computed, toRaw, useSlots } from 'vue'
import { SchemaNodeFormType } from '../enum/formType'
import { getSubNodeFormType } from '../schemaView'
import structFieldView from './structFieldView.vue'
import schemaView from '../schemaView.vue'
import { isFieldChangable } from '../utility/node'

const props = defineProps<{
  /** Struct Schema node */
  node: DataNode,
  /** In-form settings */
  inForm?: SchemaNodeFormType
  /** Skin */
  skin?: string
}>()

const node = toRaw(props.node) as StructNode

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]

// materialize the field list (stable; individual field nodes may be replaced,
// structFieldView handles that internally)
const fields = computed(() => {
  const result: { node: DataNode, name: string }[] = []
  for (const f of node.fields) {
    if (f.name) result.push({ node: f, name: f.name })
  }
  return result
})
</script>
