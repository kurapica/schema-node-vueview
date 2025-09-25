<template>
    <schema-view v-if="node.enumNode"
        :plain-text="plainText"
        :node="node.enumNode"
        v-bind="$attrs"
    ></schema-view>
    <span v-else-if="node.asSingle">
        No view for {{ node.schemaName }}
    </span>
    <span v-else-if="state.simple && state.readonly && plainText && node.elementSchema.type === SchemaType.Scalar"
        :style="{'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
        {{ state.display }}
    </span>
    <div v-else style="display: flex;">
        <schema-view v-for="i in state.length"
            :key="node.elements[i-1].guid"
            :node="node.elements[i-1]"
            :plain-text="plainText"
            :skin="skin"
            :in-form="getSubNodeFormType(node.elements[i-1], inForm, skin)"
            no-label
            v-bind="$attrs"
        >
            <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
                <component :is="slot" v-bind="slotProps" />
            </template>
        </schema-view>
        <template v-if="!state.simple">
            <a @click="node.addRow()" href="javascript:void(0)" style="font-size: xx-large;margin-right: 1rem;">+</a>
            <a v-if="state.length" @click="node.delRows(state.length - 1)" href="javascript:void(0)" style="font-size: xx-large;">-</a>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ArrayNode, isNull, SchemaType } from 'schema-node'
import { onMounted, onUnmounted, reactive, toRaw, useSlots } from 'vue'
import schemaView from './schemaView.vue'
import { SchemaNodeFormType } from '../formType';
import { getSubNodeFormType } from '../schemaView';

// properties
const props = defineProps<{
    node: ArrayNode
    plainText?: any,
    inForm?: SchemaNodeFormType,
    skin?: string
}>()
const arrayNode = toRaw(props.node)

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]

// state
const state = reactive<{
    readonly?: boolean
    display?: string
    length: number,
    simple?: boolean,
}>({ length: 0 })

// handler
let dataHandler: Function | null = null
let stateHandler: Function | null = null

onMounted(() => {
    const node = arrayNode
    state.simple = node.elementSchema.type !== SchemaType.Struct

    dataHandler = node.subscribe(() => {
        if (!node.readonly && state.simple)
        {
            const length = node.elements.length
            if (length === 0 || !isNull(node.elements[length - 1].rawData))
            {
                return node.addRow()
            }
            else if(length >= 2 && isNull(node.elements[length - 2].rawData))
            {
                return node.delRows(length - 1)
            }
        }
        
        state.length = node.elements.length
        if (state.simple) state.display = (node.data || []).join()
    }, true)

    stateHandler = node.subscribeState(() => {
        state.readonly = node.readonly
    }, true)
})

onUnmounted(() => {
    if (dataHandler) dataHandler()
    if (stateHandler) stateHandler()
})

</script>