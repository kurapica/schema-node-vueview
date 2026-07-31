<template>
  <span v-if="(disabled || state.readonly) && plainText"
    :style="{ 'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
    {{ state.data ? _L('YES') : _L('NO') }}
  </span>
  <section v-else-if="state.require || !isNull(state.default)"
    :style="{ 'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
    <el-switch
      v-model="data"
      :disabled="disabled || state.readonly || state.disable"
      active-color="#13ce66"
      inactive-color="#ff4949">
    </el-switch>
  </section>
  <el-select v-else
    v-model="data"
    style="width: 100%;"
    clearable
    :placeholder="selectPlaceHolder"
    :disabled="disabled || state.readonly || state.disable">
    <el-option :label="_L('YES')" :value="true" />
    <el-option :label="_L('NO')" :value="false" />
  </el-select>
</template>

<script lang="ts" setup>
import { DataNode, Default, Disable, Display, isNull, ReadOnly, Require, sformat } from 'schema-node-core'
import { computed, onMounted, onUnmounted, reactive, toRaw } from 'vue'
import { _L } from '../utility/locale'

// Define props
const props = defineProps<{
  /** Scalar schema node */
  node: DataNode,

  /** Disable input */
  disabled?: boolean,

  /** Display readon only value as plain text */
  plainText?: any
}>()
const node = toRaw(props.node)

// display state
const state = reactive<{
  data?: any,
  default?: any
  disable?: boolean
  require?: boolean
  readonly?: boolean
}>({})

// placeholder
const selectPlaceHolder = computed(() => sformat("PLACEHOLDER_SELECT", node.getPropertyValue(Display) ?? node.name))

// Data
const data = computed({
  get(): any {
    return state.data
  },
  set(value: any) {
    node.value = value
  }
})

// data & state watcher
const subs: Function[] = []

onMounted(() => {
  subs.push(node.subscribe(() => {
    state.data = node.value
  }, true))

  subs.push(node.subscribeProperty(ReadOnly, () => state.readonly = node.readonly, true))
  subs.push(node.subscribeProperty(Default, (owner, propCtor, newValue) => state.default = newValue, true))
  subs.push(node.subscribeProperty(Disable, (owner, propCtor, newValue) => state.disable = newValue as boolean, true))
  subs.push(node.subscribeProperty(Require, (owner, propCtor, newValue) => state.require = newValue as boolean, true))
})

onUnmounted(() => {
  subs.forEach(sub => sub())
})
</script>
