<template>
    <span v-if="state.readonly && plainText"
        :style="{ 'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
        {{ state.display }}
    </span>
    <el-switch v-else-if="state.require || !isNull(state.default)" 
        v-model="data" 
        :disabled="state.disable"
        active-color="#13ce66" 
        inactive-color="#ff4949">
    </el-switch>
    <el-select v-else 
        v-model="data" 
        style="width: 100%;" 
        clearable
        :disabled="state.disable">
        <el-option :label="_LS('YES')" :value="true" />
        <el-option :label="_LS('NO')" :value="false" />
    </el-select>
</template>

<script lang="ts" setup>
import { _L, _LS, isNull, ScalarNode } from 'schema-node'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

// Define props
const props = defineProps<{
    /**
     * Scalar schema node
     */
    node: ScalarNode,

    /**
     * Display readon only value as plain text
     */
    plainText?: any,

    /**
     * The place holder
     */
    placeHolder?: string,
}>()

// display state
const state = reactive<{
    display?: string
    default?: any
    disable?: boolean
    require?: boolean
    readonly?: boolean
}>({})

// Data
const data = computed({
    get(): any {
        props.node.data
    },
    set(value: any) {
        props.node.data = value
    }
})

// data & state watcher
let dataWatcher: Function | null = null
let stateWatcher: Function | null = null

onMounted(() => {
    const node = props.node
    dataWatcher = node.subscribe(() => {
        const data = node.data
        state.display = data ? `${_LS("YES")}` : `${_LS("NO")}`
    }, true)

    stateWatcher = node.subscribeState(() => {
        state.default = node.rule.default
        state.disable = node.rule.disable
        state.readonly = node.require
        state.readonly = node.readonly
    }, true)
})

onUnmounted(() => {
    if (dataWatcher) dataWatcher()
    if (stateWatcher) stateWatcher()
})

</script>