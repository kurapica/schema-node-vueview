<template>
  <span></span>
</template>

<script lang="ts" setup>
import { NodeType } from 'schema-node-core'

// Define props
const props = defineProps<{
  /** object node */
  node: NodeType,
}>()
</script>