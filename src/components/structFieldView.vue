<template>
    <schema-view 
        :node="(fldnode as AnySchemaNode)" :key="fldnode.guid"
        :in-form="getSubNodeFormType(fldnode as AnySchemaNode, inForm)">
        <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
            <component :is="slot" v-bind="slotProps" />
        </template>
    </schema-view>
</template>

<script setup lang="ts">
import { AnySchemaNode, StructNode } from 'schema-node'
import { onMounted, onUnmounted, ref, useSlots } from 'vue'
import schemaView from './schemaView.vue'
import { SchemaNodeFormType } from '../formType'
import { getSubNodeFormType } from '../schemaView';

const props = defineProps<{
    /**
     * Struct Schema node
     */
    node: StructNode,

    /**
     * field
     */
    field: string,

    /**
     * In-form settings
     */
    inForm?: SchemaNodeFormType
}>()

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]

let memberWatch: Function | null = null
const fldnode = ref<AnySchemaNode>(props.node.getField(props.field))

onMounted(() => {
    const node = props.node
    const field = props.field

    if (node.isFieldChangable(field))
    {
        memberWatch = node.subscribeMemberChange((name: string) => {
            if (name == field)
                fldnode.value = node.getField(field)
        })
    }
})

onUnmounted(() => {
    if (memberWatch) memberWatch()
})
</script>