<template>
  <span v-if="state.simple && state.readonly && text"
    :style="{ 'width': '100%', 'text-align': text === true ? 'center' : text }">
    {{ state.display }}
  </span>
  <div v-else style="display: flex;">
    <template v-for="i in state.length" :key="i">
      <schema-view v-if="node.at(i - 1)"
        style="min-width: 120px;"
        :node="node.at(i - 1)!"
        :text="text"
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
      <a v-if="state.addAble" @click="node.addRow()" href="javascript:void(0)" style="font-size: xx-large;margin-right: 1rem;">+</a>
      <a v-if="state.delAble" @click="node.delRows(state.length - 1)" href="javascript:void(0)" style="font-size: xx-large;">-</a>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ArrayNode, ArrayType, Disable, isNull, MaxSize, MinSize, ReadOnly, ScalarType, StructType } from 'schema-node-core'
import { onMounted, onUnmounted, reactive, toRaw, useSlots } from 'vue'
import schemaView from '../schemaView.vue'
import { SchemaNodeFormType } from '../enum/formType'
import { getSubNodeFormType } from '../schemaView'
import { subscribeAncestorProperty } from '../utility/toolset.js'

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{
  node: ArrayNode
  text?: boolean | 'left' | 'right' | 'center',
  inForm?: SchemaNodeFormType,
  skin?: string
}>();
const node = (toRaw(props.node) as ArrayNode)!;

// slots
const slots = useSlots();
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][];

// ── UI State ──────────────────────────────────────────────────────
const state = reactive<{
  readonly?: boolean
  disable?: boolean
  display?: string
  length: number,
  simple?: boolean,
  addAble?: boolean,
  delAble?: boolean
}>({ length: 0 })

// ── Life Cycle ────────────────────────────────────────────────────
/** Subscription */
const subs: Function[] = []

onMounted(() => {
  state.simple = !((node.type as ArrayType).element instanceof StructType)

  subs.push(node.subscribe(() => {
    if (!node.readonly && state.simple) {
      const length = node.length
      const last = node.at(length - 1)
      if ((length === 0 || !isNull(last?.rawValue)) && node.addAble) {
        return node.addRow()
      }
      else if (length >= 2 && isNull(node.at(length - 2)?.rawValue) && node.delAble) {
        return node.delRows(length - 1)
      }
    }

    state.length = node.length
    state.addAble = node.addAble
    state.delAble = node.delAble
    if (state.simple) state.display = ((node.value as any[]) || []).join()
  }, true))

  subs.push(subscribeAncestorProperty(node, ReadOnly, (values: boolean[]) => state.readonly = node.readonly || values.some(v => v), true))
  subs.push(subscribeAncestorProperty(node, Disable, (values: boolean[]) => state.disable = values.some(v => v), true))

  subs.push(node.subscribeProperty(MaxSize, () => state.addAble = node.addAble))
  subs.push(node.subscribeProperty(MinSize, () => state.delAble = node.delAble))
})

onUnmounted(() => {
  subs.forEach(sub => sub())
})
</script>
