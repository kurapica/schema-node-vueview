<template>
    <schema-view v-if="node.enumArrayNode"
        :plain-text="plainText"
        :node="node.enumArrayNode"
        v-bind="$attrs"
    ></schema-view>
    <span v-else-if="node.asSingleValue">
        No view for {{ node.schemaName }}
    </span>
    <span v-else-if="state.readonly && plainText && node.elementSchemaInfo.type === SchemaType.Scalar"
        :style="{'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
        {{ state.display }}
    </span>
    <div v-else style="display: flex;">
        <schema-view v-for="i in state.length"
            :key="node.elements[i].guid"
            :node="node.elements[i]"
            :plain-text="plainText"
            :in-form="getSubNodeFormType(node.elements[i], inForm)"
            no-label
            v-bind="$attrs"
        >
            <template v-for="(value, key) in $slots" :key="key" #[key]="slotProps">
                <slot :name="key" v-bind="slotProps"></slot>
            </template>
        </schema-view>
    </div>
</template>

<script setup lang="ts">
import { ArrayNode, isNull, SchemaType } from 'schema-node'
import { onMounted, onUnmounted, reactive } from 'vue'
import schemaView from './schemaView.vue'
import { SchemaNodeFormType } from '../formType';
import { getSubNodeFormType } from '../schemaView';

// properties
const props = defineProps<{
    node: ArrayNode
    plainText?: any,
    inForm?: SchemaNodeFormType
}>()

// state
const state = reactive<{
    readonly?: boolean
    display?: string
    length: number
}>({ length: 0 })

// handler
let dataHandler: Function | null = null
let stateHandler: Function | null = null

onMounted(() => {
    const node = props.node

    dataHandler = node.subscribe(() => {
        if (!node.readonly)
        {
            const length = node.elements.length
            if (length === 0 || !isNull(node.elements[length - 1].rawData))
            {
                node.addRow()
            }
            else if(length >= 2 && isNull(node.elements[length - 2].rawData))
            {
                node.delRows(length - 1)
            }
        }
        
        state.length = node.elements.length
        state.display = (node.data || []).join()
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