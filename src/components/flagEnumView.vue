<template>
</template>

<script setup lang="ts">
import { DataNode, LocaleString } from 'schema-node-core';
import { computed, onMounted, reactive, toRaw } from 'vue';

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{
  /** Input schema node */
  node: DataNode,

  /** Use text mode when readonly  */
  text?: boolean,
}>();

const node = toRaw(props.node);

// ── State ──────────────────────────────────────────────────────────
const state = reactive<{
  data?: number | number[],
  
  /** Display value */
  display?: string | LocaleString,
  selectPlaceHolder?: string,

  // base state
  readonly?: boolean,
  disable?: boolean,
  require?: boolean,
  changed?: boolean,
  single?: boolean,
}>({});

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
}
const option: ICascaderOptionInfo[] = [];

// ── Life Cycle ────────────────────────────────────────────────────
onMounted(async () => {
  
})
</script>