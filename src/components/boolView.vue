<template>
    <span v-if="state.readonly && plainText" :style="{ 'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
        {{ state.data ? _L['YES'] : _L['NO'] }}
    </span>
    <section v-else-if="state.require || !isNull(state.default)"  :style="{ 'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
        <el-switch 
            v-model="data" 
            :disabled="state.readonly || state.disable"
            active-color="#13ce66" 
            inactive-color="#ff4949">
        </el-switch>
    </section>
    <el-select v-else 
        v-model="data" 
        style="width: 100%;" 
        clearable
        :placeholder="scalarNode.selectPlaceHolder"
        :disabled="state.readonly || state.disable">
        <el-option :label="_L['YES']" :value="true" />
        <el-option :label="_L['NO']" :value="false" />
    </el-select>
</template>

<script lang="ts" setup>
import { _L } from '../locale'
import { isNull, ScalarNode } from 'schema-node'
import { computed, onMounted, onUnmounted, reactive, ref, toRaw } from 'vue'

// Define props
const props = defineProps<{
    /**
     * Scalar schema node
     */
    node: ScalarNode,

    /**
     * Display readon only value as plain text
     */
    plainText?: any
}>()
const scalarNode = toRaw(props.node)

// display state
const state = reactive<{
    data?: any,
    default?: any
    disable?: boolean
    require?: boolean
    readonly?: boolean
}>({})

// Data
const data = computed({
    get(): any {
        return state.data
    },
    set(value: any) {
        scalarNode.data = value
    }
})

// data & state watcher
let dataWatcher: Function | null = null
let stateWatcher: Function | null = null

onMounted(() => {
    dataWatcher = scalarNode.subscribe(() => {
        const data = scalarNode.data
        state.data = data
    }, true)

    stateWatcher = scalarNode.subscribeState(() => {
        state.default = scalarNode.rule.default
        state.disable = scalarNode.rule.disable
        state.readonly = scalarNode.require
        state.readonly = scalarNode.readonly
    }, true)
})

onUnmounted(() => {
    if (dataWatcher) dataWatcher()
    if (stateWatcher) stateWatcher()
})

</script>