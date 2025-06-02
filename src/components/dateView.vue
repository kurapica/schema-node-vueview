<template>
    <span v-if="state.readonly && plainText"
        :style="{ 'width': '100%', 'text-align': plainText === true ? 'center' : plainText }">
        {{ state.display }}
    </span>
    <el-select v-else-if="state.useWhiteList" 
        v-model="whiteListData"
        :disabled="disabled || state.disable"
        :placeholder="node.selectPlaceHolder || placeHolder"
        :clearable="!state.require" 
        style="width: 100%">
        <el-option v-for="item in state.whiteList" 
            :key="item"
            :label="node.isYear ? item : dateFormat(item + '', node.isFullDate, node.isYear)"
            :value="item"></el-option>
    </el-select>
    <el-date-picker v-else 
        v-model="data"
        :type="node.isYear && 'year' || node.isYearMonth && 'month' || node.isFullDate && 'datetime' || 'date'"
        :placeholder="!state.readonly && state.default && dateFormat(state.default, node.isFullDate, node.isYear) || node.selectPlaceHolder"
        :disabled="disabled || state.disable"
        :value-format="node.isYear ? 'YYYY' : null" 
        :disabled-date="disabledDate" 
        style="width: 100%"
    ></el-date-picker>
</template>

<script lang="ts" setup>
import { isNull, ScalarNode } from 'schema-node'
import { computed, onMounted, onUnmounted, reactive } from 'vue'

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

    /**
     * Force disabled
     */
    disabled?: boolean
}>()

// display state
const state = reactive<{
    default?: any,
    display?: any,
    disable?: boolean,
    require?: boolean,
    asSuggest?: boolean,
    readonly?: boolean,
    useWhiteList?: boolean,
    whiteList?: any[]
}>({})

// Data
const data = computed({
    get(): any {
        return props.node.rawData
    },
    set(value: any) {
        props.node.data = value
    }
})

// white list
const whiteListData = computed(
    {
        get() {
            const node = props.node;
            return node.data ? dateFormat(node.data, node.isFullDate, node.isYear) : null;
        },
        set(newValue) {
            const node = props.node;
            if (!isNull(newValue)) {
                if (node.isYear) {
                    node.data = parseInt(newValue!)
                } else {
                    node.data = newValue ? new Date(newValue) : null
                }
            }
            else {
                node.data = null
            }
        }
    }
)

// data & state watcher
let dataWatcher: Function | null = null
let stateWatcher: Function | null = null

onMounted(() => {
    const node = props.node
    dataWatcher = node.subscribe(() => {
        const data = node.data
        state.display = display()
    }, true)

    stateWatcher = node.subscribeState(() => {
        state.default = node.rule.default
        state.disable = node.rule.disable
        state.readonly = node.require
        state.asSuggest = node.rule.asSuggest || false
        state.readonly = node.readonly

        if (node.rule.whiteList) {
            state.useWhiteList = true
            let whiteList = node.rule.whiteList.map(w => typeof w === "object" && !(w instanceof Date) ? w.value : w)
            const blackList = node.rule.blackList
            if (blackList && blackList.length)
                whiteList = whiteList.filter(w => blackList.findIndex(b => `${b}` === `${w}`) < 0) as any
            state.whiteList = whiteList
        }
        else {
            state.useWhiteList = false
            state.whiteList = []
        }
    }, true)
})

onUnmounted(() => {
    if (dataWatcher) dataWatcher()
    if (stateWatcher) stateWatcher()
})

//#region Helper

// genrate display
const display = () => {
    const node = props.node
    if (node.isYear) return node.data

    // check value
    let value: any = node.data
    if (value) {
        if (typeof (value) === "string") {
            value = new Date(value);
            if (isNaN(value.getFullYear())) value = null
        }
        if (!(value instanceof Date)) {
            value = null
        }
    }
    if (!value) return ""

    // display
    const date = value as unknown as Date
    if (node.isYearMonth) {
        return `${date.getFullYear()}-${date.getMonth() + 1}`
    }
    if (node.isFullDate) {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.toLocaleTimeString()}`
    }

    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const disabledDate = (time: Date) => {
    const node = props.node;
    if (node.readonly) return false;

    const upLimit = node.upLimit
    const lowLimit = node.lowLimit

    if (node.isYear) {
        return (typeof upLimit === "number" && upLimit < time.getFullYear()) || (typeof lowLimit === "number" && lowLimit > time.getFullYear());
    }
    else if (node.isYearMonth) {
        if (upLimit instanceof Date) {
            if (upLimit.getFullYear() < time.getFullYear() || upLimit.getFullYear() === time.getFullYear() && upLimit.getMonth() < time.getMonth())
                return true
        }
        if (lowLimit instanceof Date) {
            if (lowLimit.getFullYear() > time.getFullYear() || lowLimit.getFullYear() === time.getFullYear() && lowLimit.getMonth() > time.getMonth())
                return true
        }
        return false
    }
    else {
        return (upLimit instanceof Date && upLimit < time) || (lowLimit instanceof Date && lowLimit > time)
    }
}

const dateFormat = (date: string, hasTime?: boolean, isyear?: boolean): string => {
    if (isyear) return date;
    const dateObj = new Date(date);
    const YY = dateObj.getFullYear() + "-";
    const MM = (dateObj.getMonth() + 1 < 10 ? "0" + (dateObj.getMonth() + 1) : dateObj.getMonth() + 1) + "-";
    const DD = dateObj.getDate() < 10 ? "0" + dateObj.getDate() : dateObj.getDate();
    const dateStr = YY + MM + DD;
    if (hasTime) {
        const hh = (dateObj.getHours() < 10 ? "0" + dateObj.getHours() : dateObj.getHours()) + ":";
        const mm = (dateObj.getMinutes() < 10 ? "0" + dateObj.getMinutes() : dateObj.getMinutes()) + ":";
        const ss = dateObj.getSeconds() < 10 ? "0" + dateObj.getSeconds() : dateObj.getSeconds();
        return `${dateStr} ${hh + mm + ss}`;
    }
    return dateStr;
}

//#endregion

</script>