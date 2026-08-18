<template>
  <template v-for="field in fields" :key="field.name">
    <struct-field-view v-if="field.isChangable"
      :node="node"
      :field="field.name"
      :in-form="inForm"
      :skin="skin"
      :label-width="labelWidth"
      :debug="debug"
      :text="text"
      v-bind="$attrs">
      <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
        <component :is="slot" v-bind="slotProps" />
      </template>
    </struct-field-view>
    <schema-view v-else
      :key="field.node.id"
      :node="field.node as DataNode"
      :in-form="getSubNodeFormType(field.node as DataNode, inForm, skin)"
      :skin="skin"
      :label-width="labelWidth"
      :debug="debug"
      :text="text"
      v-bind="$attrs">
      <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
        <component :is="slot" v-bind="slotProps" />
      </template>
    </schema-view>
  </template>
</template>

<script lang="ts" setup>
import { DataNode, StructNode } from 'schema-node-core'
import { onMounted, ref, toRaw, useSlots } from 'vue'
import { SchemaNodeFormType } from '../enum/formType'
import { getSubNodeFormType } from '../schemaView'
import structFieldView from './structFieldView.vue'
import schemaView from '../schemaView.vue'

const props = defineProps<{
  /** Struct Schema node */
  node: DataNode,
  /** In-form settings */
  inForm?: SchemaNodeFormType
  /** Skin */
  skin?: string,
  /** Label width */
  labelWidth?: string,
  /** Debug mode */
  debug?: boolean,
  /** The text mode */
  text?: any
}>()

const node = toRaw(props.node) as StructNode

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]

// materialize the field list 
const fields= ref<{ node: DataNode, name: string, isChangable: boolean }[]>([]);

onMounted(() => {
  const result: { node: DataNode, name: string, isChangable: boolean }[] = [];
  for (const f of node.fields) {
    if (f.name) result.push({ node: f, name: f.name, isChangable: node.isFieldChangable(f.name) })
  }
  fields.value = result;
})
</script>
