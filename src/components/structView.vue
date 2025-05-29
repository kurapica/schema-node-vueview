<template>
    <schema-view v-for="fnode in node.fields.filter(f => !f.invisible)" 
        :node="fnode"
        :in-form="getSubNodeFormType(fnode, inForm)" 
        v-bind="$attrs"
    ></schema-view>
</template>

<script lang="ts" setup>
import { StructNode } from 'schema-node'
import { SchemaNodeFormType } from '../formType'
import { getSubNodeFormType } from '../schemaView'
import schemaView from './schemaView.vue'

defineProps<{
    /**
     * Struct Schema node
     */
    node: StructNode,

    /**
     * In-form settings
     */
    inForm?: SchemaNodeFormType
}>()
</script>