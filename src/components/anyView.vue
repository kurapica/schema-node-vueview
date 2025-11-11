<template>
    <span></span>
</template>

<script lang="ts" setup>
import { ScalarNode } from 'schema-node'

// Define props
const props = defineProps<{
    /**
     * Scalar schema node
     */
    node: ScalarNode,
}>()
</script>