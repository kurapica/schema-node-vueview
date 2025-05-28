<template>
    <template
        v-if="schemaNode && !invisible">
        <form-view v-if="inFormType === SchemaNodeFormType.Nest" 
            :node="(schemaNode as any)"
            :in-form="inFormType" 
            v-bind="$attrs">
            <template v-for="(value, key) in $slots" :key="key" v-slot:[key]="slotProps">
                <slot :name="key" v-bind="slotProps"></slot>
            </template>
        </form-view>
        <component v-else-if="component" :is="component" 
            :key="schemaNode.guid"
            :node="schemaNode" 
            :in-form="inFormType"
            v-bind="$attrs">
            <template v-for="(value, key) in $slots" :key="key" v-slot:[key]="slotProps">
                <slot :name="key" v-bind="slotProps"></slot>
            </template>
        </component>
    </template>
</template>

<script setup lang="ts">
import { isReactive, isRef, onMounted, onUnmounted, ref, shallowRef, toRaw, watch, WatchHandle } from 'vue'
import { AnySchemaNode, ISchemaConfig } from 'schema-node'
import formView from './formView.vue'
import { SchemaNodeFormType } from '../formType'
import { getSchemaNode, getSchemaTypeView, useSingleView } from '../schemaView'

// props
const props = defineProps<{
    /**
     * The schema node
     */
    node?: AnySchemaNode

    /**
     * The schema node type(if node not provided)
     */
    type?: string,

    /**
     * The schema node value(if node not provided)
     */
    modelValue?: any,

    /**
     * The schema node config(if node not provided)
     */
    config?: ISchemaConfig

    /**
     * The skin to be use
     */
    skin?: string

    /**
     * The form item display style
     */
    inForm?: boolean | "nest" | "expand" | "expandall" | ""
}>()

// model
const emit = defineEmits(['update:modelValue'])

// node
const schemaNode = ref<AnySchemaNode | null>(null)
const component = shallowRef<any>(null)
const inFormType = ref<SchemaNodeFormType>(SchemaNodeFormType.None)
const invisible = ref(false)
let dataWatcher: Function | null = null
let stateWatcher: Function | null = null
let configWatcher: WatchHandle | null = null

onMounted(async () => {
    let node = props.node
    if (!node) {
        if (props.config) {
            node = await getSchemaNode(toRaw(props.config), toRaw(props.modelValue))

            // update the rule schema with config
            if (node && (isRef(props.config) || isReactive(props.config))) {
                configWatcher = watch(props.config, () => {
                    const rawConfig = toRaw(props.config)
                    if (!rawConfig) return
                    node?.ruleSchema.loadConfig(rawConfig)
                    node?.ruleSchema.initNode(node)
                    node?.validation().finally(node.notifyState)
                })
            }
        }
        else if (props.type) {
            node = await getSchemaNode({ type: props.type }, toRaw(props.modelValue))
        }
    }

    schemaNode.value = node || null
    if (!node) return

    // active rule when display
    node.activeRule()

    if (props.inForm === true) {
        // use default
        inFormType.value = useSingleView(node) ? SchemaNodeFormType.Nest : SchemaNodeFormType.Expand
    }
    else if (props.inForm) {
        inFormType.value = props.inForm as SchemaNodeFormType
    }
    else {
        inFormType.value = SchemaNodeFormType.None
    }

    // gets the schema view
    component.value = getSchemaTypeView(node, props.skin)
    dataWatcher = node.subscribe(() => emit('update:modelValue', node.data))
    stateWatcher = node.subscribeState(() => invisible.value = node.invisible, true)
})

onUnmounted(() => {
    if (dataWatcher) dataWatcher()
    if (configWatcher) configWatcher()
    if (stateWatcher) stateWatcher()
})
</script>