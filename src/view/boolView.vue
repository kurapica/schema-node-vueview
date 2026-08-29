<template>
  <section style="width: 100%;min-width: 120px;">
    <el-switch
      v-model="data"
      :disabled="state.readonly || state.disable"
      active-color="#13ce66"
      inactive-color="#ff4949">
    </el-switch>
  </section>
</template>

<script lang="ts" setup>
import { DataNode, Default, Disable, isNull, ReadOnly, Require } from 'schema-node-core'
import { computed, onMounted, onUnmounted, reactive, toRaw } from 'vue'
import { _L } from '../utility/locale'
import { subscribeAncestorProperty } from '../utility/toolset';

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{
  /** Scalar schema node */
  node: DataNode,
  
  /** The readonly mode */
  readonly?: boolean,
  
  /** Display readon only value as plain text */
  text?: boolean | 'left' | 'right' | 'center',

  debug?: boolean
}>()
const node = toRaw(props.node)

// ── UI State ──────────────────────────────────────────────────────
/** Display state */
const state = reactive<{
  /** Data */
  data?: any,

  /** Default align */
  defaultAlign?: 'left' | 'right' | 'center',

  /** Default value */
  default?: any

  /** Disable */
  disable?: boolean,

  /** Require */
  require?: boolean,

  /** Readonly */
  readonly?: boolean
}>({ defaultAlign: 'left' })

/** Data Model */
const data = computed({
  get(): any { return state.data },
  set(value: any) { 
    if (value) {
      node.value = value
    }
    else if (state.require || !isNull(state.default)) {
      node.value = value ?? false
    }
    else {
      node.value = undefined
    }
  }
})

// ── Life Cycle ────────────────────────────────────────────────────
/** Subscription */
const subs: Function[] = []

onMounted(() => {
  subs.push(node.subscribe(() => {
    state.data = node.value ?? false
  }, true))
  
  // state change
  if (props.readonly) {
    state.readonly = true;
  }
  else {
    subs.push(subscribeAncestorProperty(node, ReadOnly, (values: boolean[]) => state.readonly = values.some(v => v), true))
    subs.push(subscribeAncestorProperty(node, Disable, (values: boolean[]) => state.disable = values.some(v => v), true))
  }
  subs.push(node.subscribeProperty(Default, (owner, propCtor, newValue) => state.default = newValue as boolean, true))
  subs.push(node.subscribeProperty(Require, (owner, propCtor, newValue) => state.require = newValue as boolean, true))
})

onUnmounted(() => {
  subs.forEach(sub => sub())
})
</script>
