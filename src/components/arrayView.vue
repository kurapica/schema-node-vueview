<template>
  <span v-if="state.simple && state.readonly && plainText && isScalarElement"
    :style="{ 'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
    {{ state.display }}
  </span>
  <div v-else style="display: flex;">
    <template v-for="i in state.length" :key="i">
      <schema-view v-if="node.at(i - 1)"
        style="min-width: 120px;"
        :node="node.at(i - 1)!"
        :plain-text="plainText"
        :skin="skin"
        :in-form="getSubNodeFormType(node.at(i - 1)!, inForm, skin)"
        no-label
        v-bind="$attrs"
      >
        <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
          <component :is="slot" v-bind="slotProps" />
        </template>
      </schema-view>
    </template>
    <template v-if="!state.simple && !state.readonly" style="align-self: center; white-space: nowrap;">
      <a @click="node.addRow()" href="javascript:void(0)" style="font-size: xx-large;margin-right: 1rem;">+</a>
      <a v-if="state.length" @click="node.delRows(state.length - 1)" href="javascript:void(0)" style="font-size: xx-large;">-</a>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ArrayNode, ArrayType, isNull, ReadOnly, ScalarType, StructType } from 'schema-node-core'
import { onMounted, onUnmounted, reactive, toRaw, useSlots } from 'vue'
import schemaView from '../schemaView.vue'
import { SchemaNodeFormType } from '../enum/formType'
import { getSubNodeFormType } from '../schemaView'

// properties
const props = defineProps<{
  node: ArrayNode
  plainText?: any,
  inForm?: SchemaNodeFormType,
  skin?: string
}>()
const node = toRaw(props.node) as ArrayNode

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]

// element type info
const elementType = (node.type as ArrayType).element
const isScalarElement = elementType instanceof ScalarType

// state
const state = reactive<{
  readonly?: boolean
  display?: string
  length: number,
  simple?: boolean,
}>({ length: 0 })

const subs: Function[] = []

onMounted(() => {
  state.simple = !(elementType instanceof StructType)

  subs.push(node.subscribe(() => {
    if (!node.readonly && state.simple) {
      const length = node.length
      const last = node.at(length - 1)
      if (length === 0 || !isNull(last?.rawValue)) {
        return node.addRow()
      }
      else if (length >= 2 && isNull(node.at(length - 2)?.rawValue)) {
        return node.delRows(length - 1)
      }
    }

    state.length = node.length
    if (state.simple) state.display = ((node.value as any[]) || []).join()
  }, true))

  // readonly is multi-source in core; re-read node.readonly on relevant changes
  subs.push(node.subscribeProperty(ReadOnly, () => state.readonly = node.readonly, true))
})

onUnmounted(() => {
  subs.forEach(sub => sub())
})
</script>
