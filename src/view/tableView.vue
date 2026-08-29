<template>
  <section style="width: 100%;">
    <el-table :data="rows" :span-method="spanMethod" style="width: 100%" v-bind="$attrs" :class="sortable ? 'swap-table' : ''" border>
      <template v-for="col in state.columns.filter((v) => !v.invisible)" :key="col.prop">
        <!-- with sub cols -->
        <el-table-column v-if="col.subCols && col.subCols.length && !singleHeader" :prop="col.prop" :label="col.label"
          :header-align="headerAlign">
          <el-table-column v-for="scol in col.subCols" :prop="`${col.prop}.${scol.prop}`" :label="scol.label"
            :min-width="scol.localString ? 200 : 140" :header-align="headerAlign"
            :show-overflow-tooltip="!scol.localString">
            <template #header v-if="scol.require">
              <span><span style="color: red; margin-right: 4px">*</span>{{ scol.label }}</span>
            </template>
            <template #default="scope">
              <!-- multi row (array of struct) -->
              <template
                v-if="col.isArray && scope.row.node.getAccessValue(col.prop).length > scope.row.index">
                <struct-field-view
                  v-if="scope.row.node.getAccessValue(col.prop).at(scope.row.index) instanceof StructNode"
                  :key="scope.row.node.getAccessValue(col.prop).at(scope.row.index)!.id"
                  :node="scope.row.node.getAccessValue(col.prop).at(scope.row.index)"
                  :field="scol.prop" :in-form="inForm" :text="text" :skin="skin" :debug="debug"
                  :readonly="readonly || state.viewEdit" no-label v-bind="$attrs"></struct-field-view>
                <template v-else>
                  <span></span>
                </template>
              </template>
              <!-- single row (struct) -->
              <div v-if="scol.localString && !col.isArray && scope.row.index === 0 && (scope.row.node.getAccessValue(col.prop) instanceof StructNode) && isReadonlyField(scope.row.node.getAccessValue(col.prop), scol.prop)"
                class="localstring-readonly-tooltip"
                v-overflow-title="getFieldTipKey(scope.row.node.getAccessValue(col.prop), scol.prop)">
                <struct-field-view :key="scope.row.node.getAccessValue(col.prop).getAccessValue(scol.prop)?.id"
                  :node="scope.row.node.getAccessValue(col.prop)" :field="scol.prop" :in-form="inForm"
                  :text="text" :skin="skin" :debug="debug"
                  :readonly="readonly || state.viewEdit" no-label
                  v-bind="$attrs"></struct-field-view>
                <el-tooltip
                  :content="localStringTipMap[getFieldTipKey(scope.row.node.getAccessValue(col.prop), scol.prop)] || ''"
                  :disabled="!localStringOverflowMap[getFieldTipKey(scope.row.node.getAccessValue(col.prop), scol.prop)]"
                  placement="top" effect="dark" :show-after="200">
                  <div class="localstring-tip-trigger"></div>
                </el-tooltip>
              </div>
              <struct-field-view
                v-else-if="!col.isArray && scope.row.index === 0 && (scope.row.node.getAccessValue(col.prop) instanceof StructNode)"
                :key="scope.row.node.getAccessValue(col.prop).getAccessValue(scol.prop)?.id"
                :node="scope.row.node.getAccessValue(col.prop)" :field="scol.prop" :in-form="inForm"
                :text="text" :skin="skin" :debug="debug"
                :readonly="readonly || state.viewEdit" no-label
                v-bind="$attrs"></struct-field-view>
              <template v-else>
                <span></span>
              </template>
            </template>
          </el-table-column>

          <el-table-column v-if="col.isArray && !state.readonly && !state.disabled && !(noSubAdd && noSubDel)"
            :label="_L('OPER')" align="center" width="100">
            <template #default="scope">
              <template v-if="scope.row.node.getAccessValue(col.prop)">
                <a href="javascript:void(0)" style="color: lightseagreen"
                  v-if="!noSubAdd && (scope.row.node.getAccessValue(col.prop) as ArrayNode).length == scope.row.index"
                  @click="addRow(scope.row.node.getAccessValue(col.prop) as ArrayNode)">{{ _L('ADD') }}</a>
                <a href="javascript:void(0)" style="color: red"
                  v-else-if="!noSubDel && (scope.row.node.getAccessValue(col.prop) as ArrayNode).length > scope.row.index"
                  @click="delRow(scope.row.node.getAccessValue(col.prop) as ArrayNode, scope.row.index)">{{ _L('DEL') }}</a>
              </template>
            </template>
          </el-table-column>
        </el-table-column>

        <!-- Single column -->
        <el-table-column v-else :prop="col.prop" :label="col.label" :min-width="col.localString ? 200 : 140"
          :header-align="headerAlign" :show-overflow-tooltip="!col.localString">
          <template #header v-if="col.require">
            <span><span style="color: red; margin-right: 4px">*</span>{{ col.label }}</span>
          </template>
          <template #default="scope">
            <template v-if="scope.row.index === 0 && scope.row.node.getAccessValue(col.prop)">
              <div v-if="col.localString && isReadonlyField((scope.row.node as StructNode), col.prop)"
                class="localstring-readonly-tooltip"
                v-overflow-title="getFieldTipKey((scope.row.node as StructNode), col.prop)">
                <struct-field-view :key="scope.row.node.getAccessValue(col.prop)!.id"
                  :node="scope.row.node" :field="col.prop" :in-form="inForm" :text="text" :skin="skin" :debug="debug"
                  :readonly="readonly || state.viewEdit" no-label v-bind="$attrs"></struct-field-view>
                <el-tooltip
                  :content="localStringTipMap[getFieldTipKey((scope.row.node as StructNode), col.prop)] || ''"
                  :disabled="!localStringOverflowMap[getFieldTipKey((scope.row.node as StructNode), col.prop)]"
                  placement="top" effect="dark" :show-after="200">
                  <div class="localstring-tip-trigger"></div>
                </el-tooltip>
              </div>
              <struct-field-view v-else :key="scope.row.node.getAccessValue(col.prop)!.id"
                :node="scope.row.node" :field="col.prop" :in-form="inForm" :text="text" :skin="skin" :debug="debug"
                :readonly="readonly || state.viewEdit" no-label v-bind="$attrs"></struct-field-view>
            </template>
          </template>
        </el-table-column>
      </template>

      <!-- Oper -->
      <el-table-column v-if="$slots.operator || (!state.readonly && !state.disabled && (state.allowAdd || state.allowDel)) || state.viewEdit"
        :label="_L('OPER')" align="center" fixed="right" :width="operWidth || 100">
        <template #header>
          <a href="javascript:void(0)" v-if="state.addAble && !readonly && !state.readonly && state.allowAdd"
            @click="addRow(node)" style="text-decoration: underline; color: lightseagreen">{{ _L('ADD') }}</a>
          <p v-else>{{ _L('OPER') }}</p>
        </template>
        <template #default="scope" v-if="$slots.operator || state.allowDel || state.viewEdit">
          <slot name="operator" :row="scope.row.node" :index="scope.row.eleIdx">
            <template v-if="state.viewEdit">
              <a href="javascript:void(0)" @click="openRowEditor(scope.row.node)">{{ state.delAble && !state.readonly ? _L('EDIT') : _L('VIEW') }}</a>
            </template>
            <a v-if="state.delAble && !state.readonly" href="javascript:void(0)" @click="delRow(node, scope.row.eleIdx)">{{ _L('DEL') }}</a>
          </slot>
        </template>
      </el-table-column>
    </el-table>

    <!-- The row editor -->
    <el-drawer v-model="showRowEditor" direction="rtl" size="60%" append-to-body
      @closed="closeRowEditor">
      <el-container style="height: 100%;">
        <el-main>
          <el-form v-if="editingNode" label-width="300px" :model="editingNode!.rawValue!" label-position="left" style="width: 100%; height: 90%;">
            <schema-view :key="editingNode.id" :node="editingNode as StructNode" :debug="debug" :in-form="SchemaNodeFormType.Expand2" text="left"/>
          </el-form>
        </el-main>
        <el-footer>
          <br />
          <el-button @click="closeRowEditor">{{ _L['frontend.view.close'] }}</el-button>
        </el-footer>
      </el-container>
    </el-drawer>
  </section>
</template>

<script lang="ts" setup>
import {
  ArrayNode, ArrayType, DataNode, Display, InVisible, NS_SYSTEM_LOCALE_STRING,
  ReadOnly, StructNode, StructType, type StructFieldType, Unit, clearDebounce,
  debounce, LocaleString, subscribeLanguage, MaxSize, MinSize, Disable
} from "schema-node-core";
import { SchemaNodeFormType } from "../enum/formType";
import { onMounted, onUnmounted, reactive, toRaw, shallowRef, nextTick, ref } from "vue";
import structFieldView from "./structFieldView.vue";
import { _L } from "../utility/locale";
import { useSingleView } from "../schemaView";
import { subscribeAncestorProperty } from "../utility/toolset";
import schemaView from "../schemaView.vue";
import Sortable from 'sortablejs'
import { te } from "element-plus/es/locale";

// Properties
const props = defineProps<{
  /** The array node with struct elements */
  node: ArrayNode;
  /** Whether to show readonly */
  readonly?: boolean,
  /** form settings */
  inForm?: SchemaNodeFormType;
  /** Skin */
  skin?: string;
  /** Display readon only value as plain text */
  text?: any;
  /** No add row */
  noAdd?: boolean;
  /** No del row */
  noDel?: boolean;
  /** No sub row add */
  noSubAdd?: boolean;
  /** No sub row del */
  noSubDel?: boolean;
  /** operation width */
  operWidth?: any;
  /** Render grouped headers in single line by merging parent and child labels */
  singleHeader?: boolean;
  /** Enable sortable */
  sortable?: boolean;
  /** Debug mode */
  debug?: boolean;
  /** Columns to view */
  viewColumns?: string[];
}>();

const node = toRaw(props.node) as ArrayNode;

// rows
const rows = shallowRef<ITableRow[]>([]);

// State
const state = reactive<{
  columns: IColumnInfo[];
  spanCols: { [key: number]: boolean };
  readonly?: boolean;
  disabled?: boolean;
  allowAdd: boolean;
  allowDel: boolean;
  addAble?: boolean;
  delAble?: boolean;
  viewEdit?: boolean;
}>({
  readonly: props.readonly,
  disabled: props.readonly,
  columns: [],
  spanCols: {},
  allowAdd: props.noAdd ? false : true,
  allowDel: props.noDel ? false : true,
  viewEdit: props.viewColumns?.length ? true : false,
});

const headerAlign = typeof props.text === "string" ? props.text : "center";
const isReadonlyField = (node: StructNode, field: string) => {
  const f = node.getAccessValue(field) as DataNode;
  if (!f) return false;
  return !!(f.readonly || f.displayOnly || state.readonly || state.disabled);
};

const getFieldTipKey = (node: StructNode, field: string) => {
  const f = node.getAccessValue(field) as DataNode;
  return f?.id || `${node.id}:${field}`;
};

const localStringTipMap = reactive<{ [key: string]: string }>({});
const localStringOverflowMap = reactive<{ [key: string]: boolean }>({});

const getLocalStringTextEl = (el: HTMLElement) => {
  return (el.querySelector("section > span") || el.querySelector("span")) as HTMLElement | null;
};

const setOverflowTitle = (el: HTMLElement, key?: string) => {
  const textEl = getLocalStringTextEl(el);
  if (!textEl) {
    if (key) {
      localStringTipMap[key] = "";
      localStringOverflowMap[key] = false;
    }
    return;
  }
  const text = (textEl.innerText || "").trim();
  const style = window.getComputedStyle(textEl);
  const lineHeight = Number.parseFloat(style.lineHeight || "0");
  const wrapped = lineHeight > 0 && textEl.clientHeight > lineHeight * 1.5;
  const overflow = wrapped || textEl.scrollWidth > textEl.clientWidth || textEl.scrollHeight > textEl.clientHeight;
  if (key) {
    localStringTipMap[key] = text;
    localStringOverflowMap[key] = overflow && !!text;
  }
};

const vOverflowTitle = {
  mounted(el: HTMLElement, binding: any) {
    const key = typeof binding?.value === "string" ? binding.value : "";
    const onEnter = () => setOverflowTitle(el, key);
    (el as any).__overflowTitleEnter__ = onEnter;
    el.addEventListener("mouseenter", onEnter);
    nextTick(() => setOverflowTitle(el, key));
  },
  updated(el: HTMLElement, binding: any) {
    const key = typeof binding?.value === "string" ? binding.value : "";
    nextTick(() => setOverflowTitle(el, key));
  },
  unmounted(el: HTMLElement) {
    const onEnter = (el as any).__overflowTitleEnter__;
    if (onEnter) {
      el.removeEventListener("mouseenter", onEnter);
      delete (el as any).__overflowTitleEnter__;
    }
  },
};

// sort
let sortble: Sortable | null = null
let sortbleTime = 0
const regSortable = () => {
  sortble?.destroy()
  if (!node || node.readonly) return

  const el: any = document.querySelector(".swap-table .el-table__body-wrapper tbody")
  if (!el) {
    sortbleTime = setTimeout(regSortable, 200)
    return
  }
  sortble = Sortable.create(el, {
    draggable: ".el-table__row",
    onEnd(params: any) {
      sortble?.destroy()
      let { oldIndex, newIndex } = params
      if (oldIndex === newIndex) return
      if (oldIndex == null || newIndex == null) return

      node.moveRow(oldIndex, newIndex)
      setTimeout(async () => {
        rows.value = []
        await nextTick()
        instantGenRows()
      }, 0)
    }
  })
}

// The row editor
const showRowEditor = ref(false)
const editingNode = ref<StructNode | undefined>(undefined)

const openRowEditor = (node: StructNode) => {
  editingNode.value = toRaw(node)
  showRowEditor.value = true
}

const closeRowEditor = () => {
  showRowEditor.value = false
  editingNode.value = undefined
}

// data & state watcher
const subs: Function[] = [];

onMounted(async () => {
  await refreshColumns();

  // row change handler
  subs.push(node.subscribe(() => {
    state.allowAdd = !props.noAdd && !state.readonly;
    state.allowDel = !props.noDel && !state.readonly;
    state.addAble = node.addAble;
    state.delAble = node.delAble;

    genRows();
  }, true));

  // state handler
  if (props.readonly) {
    state.readonly = true;
    state.disabled = true;
    state.allowAdd = false;
    state.allowDel = false;
  } else {
    subs.push(subscribeAncestorProperty(node, ReadOnly, (values: boolean[]) => {
      state.readonly = props.readonly || values.some((v) => v);
      state.allowAdd = !props.noAdd && !state.readonly;
      state.allowDel = !props.noDel && !state.readonly;
    }, true));
    subs.push(subscribeAncestorProperty(node, Disable, (values: boolean[]) => state.disabled = values.some((v) => v)));
  }
  subs.push(node.subscribeProperty(MaxSize, () => state.addAble = node.addAble));
  subs.push(node.subscribeProperty(MinSize, () => state.delAble = node.delAble));

  // lang handler
  subs.push(subscribeLanguage((lang: string) => {
    refreshColumnLabels(state.columns);
    state.columns = [...state.columns];
  }));

  // sortable
  if (props.sortable)
    regSortable();
});

onUnmounted(() => {
  subs.forEach((sub) => sub());
  clearDebounce(genRows);
});

// columns
const refreshColumns = async () => {
  const elementType = (node.type as ArrayType).element as StructType | undefined;
  const columnInfos: IColumnInfo[] = [];
  let spanCols: { [key: number]: boolean } = {};
  let columnIndex = 0;

  if (elementType) {
    for (const f of elementType.getFields()) {
      if (f.getPropertyValue<boolean>(InVisible)) continue;
      if (props.viewColumns && !props.viewColumns.includes(f.name)) continue;
      const columnInfo = genColumn(f, false);
      if (!columnInfo) continue;
      columnInfos.push(columnInfo);

      if (columnInfo.subCols) {
        if (!columnInfo.isArray) {
          for (let j = 0; j < columnInfo.subCols.length; j++) spanCols[columnIndex++] = true;
        } else {
          columnIndex += columnInfo.subCols.length + (node.readonly ? 0 : 1);
        }
      } else {
        spanCols[columnIndex++] = true;
      }
    }
  }

  state.columns = columnInfos;
  state.spanCols = spanCols;
  genRows();
};

// gen a column info from a struct field
function genColumn(field: StructFieldType, skipSub?: boolean): IColumnInfo | null {
  const display = field.getPropertyValue<LocaleString>(Display);
  const unit = field.getPropertyValue<LocaleString>(Unit);
  const column: IColumnInfo = {
    prop: field.name,
    display,
    unit,
    label: `${_L.value(display) || field.name}${unit ? `(${_L.value(unit)})` : ""}`,
    require: field.require,
    localString: field.type?.name === NS_SYSTEM_LOCALE_STRING,
  };
  let schema = field.type;
  if (!schema) return null;

  if (!skipSub && !useSingleView(schema, props.skin)) {
    if (schema instanceof ArrayType) {
      column.isArray = true;
      schema = schema.element;
      if (!schema) return column;
    }
    if (schema instanceof StructType) {
      const subCols: IColumnInfo[] = [];
      for (const f of schema.getFields()) {
        if (f.displayOnly || f.getPropertyValue<boolean>(InVisible)) continue;
        const col = genColumn(f, true);
        if (!col) continue;
        subCols.push(col);
      }
      column.subCols = subCols;
    }
  }
  return column;
}

const refreshColumnLabels = (cols: IColumnInfo[]) => {
  cols.forEach((c) => {
    const unit = c.unit ? _L.value(c.unit) : "";
    c.label = `${_L.value(c.display) || c.prop}${unit ? `(${unit})` : ""}`;
    if (c.subCols?.length) refreshColumnLabels(c.subCols);
  });
};

const spanMethod = (data: any) => {
  const { row, columnIndex } = data;
  if (state.spanCols[columnIndex]) {
    if (row.index === 0) {
      return { rowspan: row.count, colspan: 1 };
    }
    return { rowspan: 0, colspan: 0 };
  }
};

// add row
const addRow = (arrayNode: ArrayNode) => {
  toRaw(arrayNode).addRow();
  genRows();
  if (state.viewEdit)
    openRowEditor(arrayNode.at(arrayNode.length - 1) as StructNode);
};

// del row — for PageNode, autoDel confirms only for non-new (existing) rows
const delRow = async (arrayNode: ArrayNode, index: number) => {
  const array = toRaw(arrayNode);
  const elements = Array.from(array.elements);
  array.delRows(index, 1);
  genRows();
};


const instantGenRows = () => {
  const rowDatas: ITableRow[] = [];
  const elements = Array.from(node.elements);
  elements.forEach((ele: DataNode, eleIdx: number) => {
    let count = 0;
    for (const col of state.columns) {
      if (col.isArray) {
        const f = ele.getAccessValue(col.prop) as ArrayNode | undefined;
        if (f) count = Math.max(count, f.length);
      }
    }
    if (!node.readonly && !props.noSubAdd) count++;
    count = Math.max(1, count);
    for (let index = 0; index < count; index++)
      rowDatas.push({ node: ele, eleIdx, index, count });
  });
  rows.value = rowDatas;
}
const genRows = debounce(instantGenRows, 100);

interface IColumnInfo {
  prop: string;
  display?: LocaleString;
  unit?: LocaleString;
  label: string;
  require: boolean;
  isArray?: boolean;
  subCols?: IColumnInfo[];
  invisible?: boolean;
  localString?: boolean;
}

interface ITableRow {
  node: DataNode;
  eleIdx: number;
  index: number;
  count: number;
}
</script>

<style scoped>
.localstring-readonly-tooltip {
  position: relative;
  width: 100%;
  min-height: 24px;
}

.localstring-readonly-tooltip :deep(section) {
  position: relative;
}

.localstring-tip-trigger {
  position: absolute;
  left: -12px;
  top: -12px;
  bottom: -12px;
  right: 32px;
  z-index: 3;
}

:deep(.swap-table .el-table__row) {
  cursor: move;
}
</style>
