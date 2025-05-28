<template>
    <el-form-item 
        :key="node?.guid" 
        :prop="node?.access" 
        :error="showError ? error : null"
        :rules="shouldShowError && !showError ? rule : null">
        <template v-if="!noLabel" #label>
            <span><span v-if="node?.require" style="color: #f56c6c; font-size: 14px"> * </span>{{ node?.display + `${node?.unit ? `(${node.unit})` : ``}` }}</span>
        </template>
        <slot name="pre" :node="node"></slot>
        <slot :node="node">
            <schema-view 
                :node="node" 
                :instantValid="instantValid"
                :in-form="inForm === SchemaNodeFormType.ExpandAll ? SchemaNodeFormType.ExpandAll : SchemaNodeFormType.Expand"
                v-bind="$attrs">
            </schema-view>
        </slot>
        <slot name="tail" :node="node"></slot>
    </el-form-item>
</template>

<script lang="ts" setup>
import schemaView from './schemaView.vue'
import { AnySchemaNode } from 'schema-node'
import { ref, onUnmounted, onMounted } from 'vue'
import { useSingleView } from '../schemaView'
import { SchemaNodeFormType } from '../formType'

// 属性定义
const props = defineProps<{
    /**
     * The schema node
     */
    node: AnySchemaNode,

    /**
     * The inform settings
     */
    inForm?: SchemaNodeFormType,

    /**
     * Don't display the form label
     */
    noLabel?: boolean

    /**
     * instant validate the value
     */
    instantValid?: boolean
}>()

const showError = ref(false)
const shouldShowError = ref(false)
const error = ref<string | null>(null)
const rule = {
    validator: function (rule: any, value: any, callback: Function) {
        showError.value = true;
        return (props.node && !props.node.valid) ? callback(props.node?.error) : callback()
    }
}

let stateWatcher: Function | null = null

onMounted(() => {
    const node = props.node
    shouldShowError.value = node && !node.readonly && useSingleView(node)
    showError.value = shouldShowError.value && (node.changed || props.instantValid)
    
    if (shouldShowError.value)
    {
        stateWatcher = props.node.subscribe(() => {
            if (node.changed) showError.value = true
            error.value = node.error || null
        }, true)

        if (showError.value)
            error.value = node.error || null
    }
})

onUnmounted(() => {
    if (stateWatcher) stateWatcher()
})
</script>