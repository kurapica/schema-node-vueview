<template>
    <section style="width: 100%;">
        <el-table :data="rows" :span-method="spanMethod" style="width: 100%;" v-bind="$attrs">
            <template v-for="col in state.columns">
                <!-- with sub cols -->
                <el-table-column v-if="col.subCols && col.subCols.length" :prop="col.prop" :label="col.label" :header-align="headerAlign">
                    <el-table-column v-for="scol in col.subCols" :prop="`${col.prop}.${scol.prop}`" :label="scol.label" min-width="120" :header-align="headerAlign">
                        <template #header v-if="scol.require">
                            <span :class="{ require: true }">{{ scol.label }}</span>
                        </template>
                        <template #default="scope">
                            <!-- multi row -->
                            <template v-if="col.isArray && scope.row.node.getField(col.prop) && (scope.row.node.getField(col.prop) as ArrayNode).elements.length > scope.row.index">
                                <struct-field-view
                                    :key="((scope.row.node.getField(col.prop) as ArrayNode).elements[scope.row.index] as StructNode).getField(scol.prop).guid"
                                    :node="((scope.row.node.getField(col.prop) as ArrayNode).elements[scope.row.index] as StructNode)"
                                    :field="scol.prop"
                                    :in-form="inForm"
                                    :plain-text="plainText"
                                    no-label v-bind="$attrs"
                                ></struct-field-view>
                            </template>
                            <!-- single row -->
                            <struct-field-view v-else-if="!col.isArray && scope.row.index === 0"
                                :key="(scope.row.node.getField(col.prop) as StructNode).getField(scol.prop).guid"
                                :node="(scope.row.node.getField(col.prop) as StructNode)"
                                :field="scol.prop"
                                :in-form="inForm"
                                :plain-text="plainText"
                                no-label v-bind="$attrs"
                            ></struct-field-view>
                        </template>
                    </el-table-column>

                    <el-table-column v-if="col.isArray && !state.readonly && !state.disabled && !(noSubAdd && noSubDel)" :label="_L['OPER']" align="center" width="100">
                        <template #default="scope">
                            <template v-if="scope.row.node.getField(col.prop)">
                                <a href="javascript:void(0)" style="color:lightseagreen"
                                    v-if="!noSubAdd && (scope.row.node.getField(col.prop) as ArrayNode).elements.length == scope.row.index"
                                    @click="addRow(scope.row.node.getField(col.prop) as ArrayNode)">{{ _L["ADD"] }}</a>
                                <a href="javascript:void(0)" style="color:red"
                                    v-else-if="!noSubDel && (scope.row.node.getField(col.prop) as ArrayNode).elements.length > scope.row.index"
                                    @click="delRow(scope.row.node.getField(col.prop) as ArrayNode, scope.row.index)">{{ _L["DEL"] }}</a>
                            </template>
                        </template>
                    </el-table-column>
                </el-table-column>

                <!-- Single row -->
                <el-table-column v-else :prop="col.prop" :label="col.label" min-width="120" :header-align="headerAlign">
                    <template #header v-if="col.require">
                        <span :class="{ require: true }">{{ col.label }}</span>
                    </template>
                    <template #default="scope">
                        <struct-field-view v-if="scope.row.index === 0" 
                            :key="(scope.row.node as StructNode).getField(col.prop).guid"
                            :node="scope.row.node"
                            :field="col.prop"
                            :in-form="inForm"
                            :plain-text="plainText"
                            no-label v-bind="$attrs"
                        ></struct-field-view>
                    </template>
                </el-table-column>
            </template>

            <!-- Oper -->
            <el-table-column v-if="$slots.operator || !state.readonly && !state.disabled && !(noAdd && noDel)" :label="_L['OPER']" align="center" fixed="right" :width="operWidth">
                <template #header>
                    <a href="javascript:void(0)" v-if="!state.readonly && !noAdd" @click="arrayNode.addRow()" style="text-decoration: underline; color: lightseagreen;">{{ _L["ADD"] }}</a>
                    <p v-else>{{ _L['OPER'] }}</p>
                </template>
                <template #default="scope" v-if="$slots.operator || !noDel">
                    <slot name="operator" :row="scope.row.node" :index="scope.row.eleIdx">
                        <a type="danger" v-if="!noDel" href="javascript:void(0)" style="padding-right: 1rem;" @click="arrayNode.delRows(scope.row.eleIdx)">{{ _L["DEL"] }}</a>
                    </slot>
                </template>
            </el-table-column>
        </el-table>

        <!-- page -->
        <el-pagination v-if="node.isIncrUpdate && node.total > node.pageCount" :current-page="node.page + 1"
            :page-size="node.pageCount" :total="node.total" :pager-count="11" layout="prev, pager, next"
            @current-change="handlePage"></el-pagination>
    </section>
</template>

<script lang="ts" setup>
import { AnySchemaNode, ArrayNode, debounce, getSchema, IStructFieldConfig, SchemaType, StructNode } from 'schema-node'
import { SchemaNodeFormType } from '../formType'
import { onMounted, onUnmounted, reactive, toRaw, shallowRef, useSlots } from 'vue'
import { useSingleView } from '../schemaView'
import structFieldView from './structFieldView.vue'
import { _L } from '../locale'

// Properties
const props = defineProps<{
    /**
     * The array node with struct elements
     */
    node: ArrayNode

    /**
     * form settings
     */
    inForm?: SchemaNodeFormType

    /**
     * Display readon only value as plain text
     */
    plainText?: any, 

    /**
     * No add row
     */
    noAdd?: boolean,

    /**
     * No del row
     */
    noDel?: boolean,

    /**
     * No sub row add
     */
    noSubAdd?: boolean,

    /**
     * No sub row del
     */
    noSubDel?: boolean,

    /**
     * Hight light change row
     */
    highLightChange?: boolean

    /**
     * new row color
     */
    newColor?: String

    /**
     * change row color
     */
    changeColor?: String

    /**
     * del row color
     */
    delColor?: string

    /**
     * operation width
     */
    operWidth?: any
}>()

// slots
const slots = useSlots()
const slotEntries = Object.entries(slots) as [string, (...args: any[]) => any][]
const rows = shallowRef<ITableRow[]>([])

// State
const arrayNode: ArrayNode = toRaw(props.node)
const state = reactive<{
    columns: IColumnInfo[]              // column info
    spanCols: { [key: number]: boolean }    // column span info
    primaryFields: string[]
    readonly?: boolean
    disabled?: boolean
}>({
    columns: [],
    spanCols: {},
    primaryFields: []
})

const newdatacolor = props.newColor || "#98d7eb"
const changedatacolor = props.changeColor || "#c7f3b1"
const deldatacolor = props.delColor || "grey"
const headerAlign = typeof(props.plainText) === "string" ? props.plainText : "center"

// data & state watcher
let dataWatcher: Function | null = null
let stateWatcher: Function | null = null
let rowCount = 0
let rowWatches: { guid: string, array: Function[] }[] = []

onMounted(async () => {
    const node = arrayNode

    // column info
    const primary = node.schemaInfo.array?.primary
    const fields = node.elementSchemaInfo.struct?.fields
    const columnInfos: IColumnInfo[] = []
    let spanCols: { [key: number]: boolean } = {}
    let columnIndex = 0
    if (fields) {
        for (let i = 0; i < fields.length; i++) {
            const f = fields[i]
            if (primary && primary.findIndex(p => p.toLowerCase() === f.name.toLowerCase()))
                state.primaryFields.push(f.name)

            if (!f.invisible) {
                const columnInfo = await genColumn(f)
                if (!columnInfo) continue
                columnInfos.push(columnInfo)

                if (columnInfo.subCols) {
                    if (!columnInfo.isArray) {
                        for (let j = 0; j < columnInfo.subCols.length; j++)
                            spanCols[columnIndex++] = true
                    }
                    else {
                        columnIndex += columnInfo.subCols.length + (node.readonly ? 0 : 1)
                    }
                }
                else {
                    spanCols[columnIndex++] = true
                }
            }
        }
    }
    if (!node.readonly)
        spanCols[columnIndex++] = true

    // update state
    state.columns = columnInfos
    state.spanCols = spanCols

    // row change handler
    dataWatcher = node.subscribe((action: any) => {
        const count = node.elements.length
        if (count !== rowCount || action === "swap") {
            rowCount = count

            // clear
            for(let i = rowWatches.length - 1; i >= rowCount; i--)
            {
                const w = rowWatches.pop()
                w?.array.forEach(a => a())
            }

            // check sub array
            node.elements.forEach((e, i) => {
                if (rowWatches.length > i)
                {
                    if (rowWatches[i].guid === e.guid) return
                    rowWatches[i].array.forEach(a => a())
                }
                const n = e as StructNode
                rowWatches[i] = {
                    guid: e.guid,
                    array: n.fields.filter(f => f.schemaType === SchemaType.Array).map(f => {
                        const arr = f as ArrayNode
                        let len = arr.elements.length
                        return arr.subscribe((a:any) => {
                            const clen = arr.elements.length
                            if (clen !== len || a === "swap")
                            {
                                len = clen
                                return genRows()
                            }
                        })
                    }) || []
                }
            })

            genRows()
        }
    }, true)

    // state handler
    stateWatcher = node.subscribeState(() => {
        state.readonly = node.readonly
        state.disabled = node.rule.disable
    }, true)
})

onUnmounted(() => {
    rowWatches.forEach(r => r.array.forEach(a => a()))
    if (dataWatcher) dataWatcher()
    if (stateWatcher) stateWatcher()
})

// add row
const addRow = (arrayNode: ArrayNode) => {
    arrayNode.addRow()
    genRows()
}

const delRow = (arrayNode: ArrayNode, index: number) => {
    arrayNode.delRows(index)
    genRows()
}

// gen columns
const genColumn = async (field: IStructFieldConfig, skipSub?: boolean) => {
    const column: IColumnInfo = { prop: field.name, label: `${field.display || field.name}${field.unit ? `(${field.unit})` : ''}`, require: field.require || false }
    let schemaInfo = await getSchema(field.type)
    if (!schemaInfo) return null

    // gen sub columns
    if (!skipSub) {
        if (!useSingleView(schemaInfo)) {
            if (schemaInfo.type === SchemaType.Array) {
                column.isArray = true
                schemaInfo = await getSchema(schemaInfo.array!.element)
                if (!schemaInfo) return null
            }

            if (schemaInfo.type === SchemaType.Struct) {
                const subCols: IColumnInfo[] = []
                for (let i = 0; i < schemaInfo.struct!.fields.length; i++) {
                    const f = schemaInfo.struct!.fields[i]
                    if (!f.invisible) {
                        const col = await genColumn(f, true)
                        if (!col) continue
                        subCols.push(col)
                    }
                }
                column.subCols = subCols
            }
        }
    }

    return column
}

const spanMethod = (data: any) => {
    const { row, column, rowIndex, columnIndex } = data;
    if (state.spanCols[columnIndex]) {
        if (row.index === 0) {
            return {
                rowspan: row.count,
                colspan: 1
            }
        }

        return {
            rowspan: 0,
            colspan: 0
        }
    }
}

const genRows = debounce(() => {
    const node = arrayNode
    const rowDatas: ITableRow[] = []
    rowCount = node.elements.length
    node.elements.forEach((ele, eleIdx) => {
        let count = 0;
        (ele as StructNode).fields
        .filter(f => f.schemaType === SchemaType.Array)
        .forEach(f => count = Math.max(count, (f as ArrayNode).elements.length))

        // for add
        if (!node.readonly && !props.noSubAdd)
            count++

        count = Math.max(1, count)

        // gen row
        for (let index = 0; index < count; index++)
            rowDatas.push({ node: ele, eleIdx, index, count })
    })
    rows.value = rowDatas
}, 20)

const handlePage = (page: number) => {
    arrayNode.page = page - 1
}

/*const getrowclass = (data:any) =>{
  const row = data.row as StructNode
  return row.deleted ? "del-row" : row.changed ? (primaryFields.find(p => row.getField(p)?.changed) ? "new-row" : "change-row") : ""
}

const getincrrowclass = (data:any) =>{
  const row = data.row as StructNode
  return row.deleted ? "del-row" : ""
}*/

interface IColumnInfo {
    prop: string
    label: string
    require: boolean
    isArray?: boolean
    subCols?: IColumnInfo[]
}

interface ITableRow {
    node: AnySchemaNode
    eleIdx: number
    index: number
    count: number
}

</script>

<style lang="scss" scoped>
.require::before {
    content: "*";
    color: #f56c6c;
    margin-right: 4px;
}
.link-button {
    background: none;
    border: none;
    color: blue;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font: inherit;
}
</style>