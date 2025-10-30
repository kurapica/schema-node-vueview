<template>
    <div v-if="!schemaNode || !loaded" ref="mask" style="width: 100%;height: 24px;">
        <el-skeleton animated></el-skeleton>
    </div>
    <template v-else-if="schemaNode && !invisible">
        <form-view v-if="inFormType === SchemaNodeFormType.Nest"
            :node="(schemaNode as any)"
            :in-form="inFormType"
            v-bind="$attrs">
            <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
                <component :is="slot" v-bind="slotProps" />
            </template>
        </form-view>
        <component v-else-if="component"
            :is="component"
            :key="schemaNode.guid"
            :node="schemaNode"
            v-bind="{ ...$attrs, ...(inFormType ? { 'in-form': inFormType } : {})}">
            <template v-for="[name, slot] in slotEntries" :key="name" #[name]="slotProps">
                <component :is="slot" v-bind="slotProps" />
            </template>
        </component>
    </template>
</template>

<script setup lang="ts" name="SchemaView">
import { isReactive, isRef, onMounted, onUnmounted, ref, shallowRef, toRaw, useSlots, watch, WatchHandle } from 'vue'
import { AnySchemaNode, AppNode, ISchemaConfig, getSchemaNode, isAbstractSchema, isNull } from 'schema-node'
import formView from './formView.vue'
import { SchemaNodeFormType } from '../formType'
import { getSchemaTypeView, useSingleView } from '../schemaView'

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
     * The value for display only, no model can be provided
     */
    value?: any,

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

    /**
     * The auto load container
     */
    rootDiv?: string | HTMLElement
}>()

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]

// model
const emit = defineEmits(['update:modelValue'])

// node
const schemaNode = ref<AnySchemaNode | null>(null)
const component = shallowRef<any>(null)
const inFormType = ref<SchemaNodeFormType>(SchemaNodeFormType.None)
const invisible = ref(false)
const loaded = ref(true)
const mask = ref(null)
let observer: any = null

let dataWatcher: Function | null = null
let stateWatcher: Function | null = null
let configWatcher: WatchHandle | null = null
let updatevalue = false

if (!props.node)
{
    watch(() => props.modelValue, () => {
        if (updatevalue) return
        if (schemaNode.value)
            schemaNode.value!.data = toRaw(props.modelValue)
    })
}

onMounted(async () => {
    let node = props.node ? toRaw(props.node) : null
    if (!node) {
        if (props.config) {
            if (!props.config.type && props.type) props.config.type = props.type
            if (isAbstractSchema(props.config.type)) return // no abstract schema node

            node = await getSchemaNode(toRaw(props.config), toRaw(props.modelValue))

            if (!isNull(props.value)) {
                node.data = toRaw(props.value)
            }

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
    else if(node.parent instanceof AppNode)
    {
        // check if the field is loaded
        if (!node.parent.isFieldLoaded(node.name))
        {
            loaded.value = false
            const root = typeof(props.rootDiv) === "string" ? document.querySelector(props.rootDiv) : props.rootDiv

            observer = new IntersectionObserver(async ([entry]) => {
                if(entry && entry.isIntersecting)
                {
                    observer?.disconnect()
                    observer = null;

                    await (node!.parent as AppNode).reload([node!], true)
                    loaded.value = true
                }
            }, {
                rootMargin: "0px 0px 100px 0px",
                root,
            })

            while(!mask.value && !loaded.value)
            {
                await new Promise(r => setTimeout(r, 100))
            }
            if (!loaded.value){
                observer?.observe(mask.value)
            }
        }
    }

    schemaNode.value = node || null
    if (!node) return

    // active rule when display
    node.activeRule()

    if (props.inForm === true) {
        // use default
        inFormType.value = useSingleView(node.schema, props.skin) ? SchemaNodeFormType.Nest : SchemaNodeFormType.Expand
    }
    else if (props.inForm) {
        inFormType.value = props.inForm as SchemaNodeFormType
    }
    else {
        inFormType.value = SchemaNodeFormType.None
    }

    // gets the schema view
    component.value = getSchemaTypeView(node, props.skin)
    dataWatcher = node.subscribe(() => {
        updatevalue = true
        emit('update:modelValue', node.data)
        setTimeout(() => updatevalue = false, 20)
    })
    stateWatcher = node.subscribeState(() => invisible.value = node.invisible, true)
})

onUnmounted(() => {
    loaded.value = true
    if (dataWatcher) dataWatcher()
    if (configWatcher) configWatcher()
    if (stateWatcher) stateWatcher()
})


</script>