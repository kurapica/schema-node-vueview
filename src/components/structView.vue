<template>
    <template v-for="field in node.fields">
        <struct-field-view v-if="node.isFieldChangable((field.config as IStructFieldConfig).name)"
            :key="node.getField((field.config as IStructFieldConfig).name).guid"
            :node="node"
            :field="(field.config as IStructFieldConfig).name"
            :in-form="inForm" 
            v-bind="$attrs">
            <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
                <component :is="slot" v-bind="slotProps" />
            </template>
        </struct-field-view>
        <schema-view v-else
            :key="field.guid"
            :node="field"
            :in-form="getSubNodeFormType(field, inForm)" 
            v-bind="$attrs">
            <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
                <component :is="slot" v-bind="slotProps" />
            </template>
        </schema-view>
    </template>
</template>

<script lang="ts" setup>
import { IStructFieldConfig, StructNode } from 'schema-node'
import { SchemaNodeFormType } from '../formType'
import { getSubNodeFormType } from '../schemaView'
import structFieldView from './structFieldView.vue'
import schemaView from './schemaView.vue'
import { useSlots } from 'vue'

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

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]
</script>