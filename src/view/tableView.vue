<template>
  <section style="width: 100%">
    <table-filter v-if="filters.length" ref="filterRef" :filters="filters" :columns-per-row="columnsPerRow"
      :auto-filter="autoFilter" @expand="handleExpand" @reset="onResetFilter" @query="onQueryFilter" />
    <div v-if="(!state.readonly && state.allowAdd && addPosition === 'header') || $slots.action"
      :style="{ display: 'flex', marginBottom: '16px' }">
      <template v-if="!state.readonly && state.allowAdd">
        <el-button type="primary" v-if="addPosition === 'header'" @click="addRow(node)"
          :style="{ marginRight: '12px' }">{{ _L('ADD') }}</el-button>
      </template>
      <slot name="action" />
    </div>
    <el-table ref="tableRef" :data="rows" :span-method="spanMethod" :row-style="getRowStyle" style="width: 100%"
      v-bind="$attrs" border>
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
                  :field="scol.prop" :in-form="inForm" :text="plainText" :skin="skin"
                  :disabled="state.readonly || state.disabled" no-label v-bind="$attrs"></struct-field-view>
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
                  :text="plainText" :skin="skin" :disabled="state.readonly || state.disabled" no-label
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
                :text="plainText" :skin="skin" :disabled="state.readonly || state.disabled" no-label
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
                  :node="scope.row.node" :field="col.prop" :in-form="inForm" :text="plainText" :skin="skin"
                  :disabled="state.readonly || state.disabled" no-label v-bind="$attrs"></struct-field-view>
                <el-tooltip
                  :content="localStringTipMap[getFieldTipKey((scope.row.node as StructNode), col.prop)] || ''"
                  :disabled="!localStringOverflowMap[getFieldTipKey((scope.row.node as StructNode), col.prop)]"
                  placement="top" effect="dark" :show-after="200">
                  <div class="localstring-tip-trigger"></div>
                </el-tooltip>
              </div>
              <struct-field-view v-else :key="scope.row.node.getAccessValue(col.prop)!.id"
                :node="scope.row.node" :field="col.prop" :in-form="inForm" :text="plainText" :skin="skin"
                :disabled="state.readonly || state.disabled" no-label v-bind="$attrs"></struct-field-view>
            </template>
          </template>
        </el-table-column>
      </template>

      <!-- Oper -->
      <el-table-column v-if="$slots.operator || (!state.readonly && !state.disabled && (state.allowAdd || state.allowDel))"
        :label="_L('OPER')" align="center" fixed="right" :width="operWidth || 100">
        <template #header>
          <a href="javascript:void(0)"
            v-if="state.addAble && !state.readonly && state.allowAdd && addPosition !== 'header'"
            @click="addRow(node)" style="text-decoration: underline; color: lightseagreen">{{ _L('ADD') }}</a>
          <p v-else>{{ _L('OPER') }}</p>
        </template>
        <template #default="scope" v-if="$slots.operator || state.allowDel">
          <slot name="operator" :row="scope.row.node" :index="scope.row.eleIdx">
            <a v-if="state.delAble && !state.deleted[scope.row.eleIdx]" href="javascript:void(0)"
              @click="delRow(node, scope.row.eleIdx)">{{ _L('DEL') }}</a>
            <a v-else-if="!noDel && state.deleted[scope.row.eleIdx]" href="javascript:void(0)"
              style="color: grey" @click="resumeRow(node, scope.row.eleIdx)">{{ _L('RESUME') }}</a>
          </slot>
        </template>
      </el-table-column>
    </el-table>

    <!-- page -->
    <el-pagination v-if="state.pageCount && state.total" :current-page="(state.page || 0) + 1"
      :page-size="state.pageCount" :total="state.total" layout="total, prev, pager, next"
      :style="{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }" @current-change="handlePage">
    </el-pagination>
  </section>
</template>

<script lang="ts" setup>
import {
  ArrayNode, ArrayType, DataNode, Display, InVisible, NS_SYSTEM_LOCALE_STRING,
  ReadOnly, StructNode, StructType, type StructFieldType, Unit, clearDebounce,
  debounce, LocaleString, formatLocaleString, subscribeLanguage,
  MaxSize,
  MinSize,
} from "schema-node-core";
import { PageNode, type IArrayFieldFilter } from "schema-node-app";
import { SchemaNodeFormType } from "../enum/formType";
import {
  onMounted, onUnmounted, reactive, toRaw, shallowRef, ref, computed, nextTick,
} from "vue";
import structFieldView from "./structFieldView.vue";
import tableFilter from "./tableFilter.vue";
import { _L } from "../utility/locale";
import { useSingleView } from "../schemaView";
import { ElMessageBox } from "element-plus";

// Properties
const props = defineProps<{
  /** The array node with struct elements */
  node: ArrayNode;
  /** form settings */
  inForm?: SchemaNodeFormType;
  /** Skin */
  skin?: string;
  /** Display readon only value as plain text */
  plainText?: any;
  /** No add row */
  noAdd?: boolean;
  /** No del row */
  noDel?: boolean;
  /** No sub row add */
  noSubAdd?: boolean;
  /** No sub row del */
  noSubDel?: boolean;
  /** Hight light change row */
  highLightChange?: boolean;
  /** new row color */
  newColor?: string;
  /** change row color */
  changeColor?: string;
  /** operation width */
  operWidth?: any;
  /** Render grouped headers in single line by merging parent and child labels */
  singleHeader?: boolean;
  /** Auto confirm delete */
  autoDel?: boolean;
  /** Add button position */
  addPosition?: "header" | "tableHeader";
  /** Enable auto filter (query on filter change) */
  autoFilter?: boolean;
  /** Disable filter display */
  noFilter?: boolean;
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
  page?: number;
  pageCount?: number;
  total?: number;
  deleted: boolean[];
  allowAdd: boolean;
  allowDel: boolean;
  addAble?: boolean;
  delAble?: boolean;
}>({
  columns: [],
  spanCols: {},
  deleted: [],
  allowAdd: props.noAdd ? false : true,
  allowDel: props.noDel ? false : true,
});

const changedatacolor = props.changeColor || "#c7f3b1";
const deldatacolor = "grey";
const headerAlign = typeof props.plainText === "string" ? props.plainText : "center";
const currentLang = ref((navigator.language || "").toLowerCase());
const tableRef = ref();
const filterRef = ref();

// Whether the node is a PageNode (supports pagination & filtering)
const pageNode = node instanceof PageNode ? (node as PageNode) : undefined;

// Filter list (only for PageNode with filters initialized)
const filters = computed<IArrayFieldFilter[]>(() => {
  if (props.noFilter || !pageNode) return [];
  return pageNode.filters || [];
});

// Responsive columns per row for filter layout
const w = ref(window.innerWidth);
const columnsPerRow = computed(() => {
  if (w.value < 800) return 1;
  if (w.value < 1080) return 2;
  if (w.value <= 1440) return 3;
  if (w.value <= 1920) return 4;
  return 5;
});

// Expose table ref & current language for parent access
defineExpose({ tableRef, currentLang });

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

// data & state watcher
const subs: Function[] = [];

onMounted(async () => {
  window.addEventListener("resize", resizefunc);

  // init filters for PageNode
  if (pageNode && !props.noFilter) {
    await pageNode.initFilters();
    pageNode.enableAutoFilter(props.autoFilter ?? false);
  }

  await refreshColumns();

  // row change handler
  subs.push(node.subscribe(() => {
    state.allowAdd = !props.noAdd && !state.readonly;
    state.allowDel = !props.noDel && !state.readonly;
    state.addAble = node.addAble;
    state.delAble = node.delAble;

    // update pagination state for PageNode
    if (pageNode) {
      state.page = pageNode.page;
      state.pageCount = pageNode.pageCount;
      state.total = pageNode.total;
      // update deleted state for each row
      const elements = Array.from(node.elements);
      state.deleted = elements.map((e) => pageNode.isRowDeleted(e));
    }

    genRows();
  }, true));

  // state handler
  subs.push(subscribeAncestorProperty(node, ReadOnly, (values: boolean[]) => {
    state.readonly = values.some((v) => v);
    state.allowAdd = !props.noAdd && !state.readonly;
    state.allowDel = !props.noDel && !state.readonly;
  }, true));
  subs.push(subscribeAncestorProperty(node, Disable, (values: boolean[]) => state.disabled = node.getPropertyValue<boolean>(Disable) || values.some((v) => v)));
  subs.push(node.subscribeProperty(MaxSize, () => state.addAble = node.addAble));
  subs.push(node.subscribeProperty(MinSize, () => state.delAble = node.delAble));

  // lang handler
  subs.push(subscribeLanguage((lang: string) => {
    currentLang.value = (lang || navigator.language || "").toLowerCase();
    refreshColumnLabels(state.columns);
    state.columns = [...state.columns];
  }));
});

function resizefunc() {
  w.value = window.innerWidth;
}

onUnmounted(() => {
  window.removeEventListener("resize", resizefunc);
  subs.forEach((sub) => sub());
  clearDebounce(genRows);
});

// Disable property ctor accessor (kept indirect to avoid pulling the import when unused)
import { Disable } from "schema-node-core";
import { subscribeAncestorProperty } from "../utility/toolset";

// columns
const refreshColumns = async () => {
  const elementType = (node.type as ArrayType).element as StructType | undefined;
  const columnInfos: IColumnInfo[] = [];
  let spanCols: { [key: number]: boolean } = {};
  let columnIndex = 0;

  if (elementType) {
    for (const f of elementType.getFields()) {
      if (f.displayOnly || f.getPropertyValue<boolean>(InVisible)) continue;
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
};

// del row — for PageNode, autoDel confirms only for non-new (existing) rows
const delRow = async (arrayNode: ArrayNode, index: number) => {
  const array = toRaw(arrayNode);
  const elements = Array.from(array.elements);
  const isNew = !pageNode || !elements[index]?.changed;

  if (props.autoDel && !isNew) {
    try {
      await ElMessageBox.confirm(
        formatLocaleString("DEL_CONFIRM", node.getPropertyValue(Display) ?? node.name),
        _L.value("NOTIFY"),
        { type: "warning", dangerouslyUseHTMLString: true }
      );
    } catch {
      return;
    }
  }
  array.delRows(index, 1);
  if (pageNode && elements[index]) {
    state.deleted[index] = pageNode.isRowDeleted(elements[index]);
  }
  genRows();
};

// resume a deleted row (PageNode only)
const resumeRow = (arrayNode: ArrayNode, index: number) => {
  const array = toRaw(arrayNode);
  if (pageNode) {
    pageNode.resumeRows(index, 1);
    const elements = Array.from(array.elements);
    if (elements[index]) {
      state.deleted[index] = pageNode.isRowDeleted(elements[index]);
    }
    genRows();
  }
};

// handle page change
const handlePage = async (page: number) => {
  if (!pageNode) return;
  await pageNode.setPage(page - 1);
  const elements = Array.from(node.elements);
  state.deleted = elements.map((e) => pageNode.isRowDeleted(e));
};

// filter handlers
const onResetFilter = () => {
  pageNode?.resetFilter(true);
};

const onQueryFilter = () => {
  pageNode?.processFilter();
};

// filter expand handler
const handleExpand = (_isExpand: boolean) => {
  // layout adjustment can be handled here if needed
};

const genRows = debounce(() => {
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
}, 100);

const getRowStyle = (data: any) => {
  if (state.deleted[data.row.eleIdx]) {
    return { backgroundColor: deldatacolor };
  }
  if (props.highLightChange && data.row.node?.changed) {
    return { backgroundColor: changedatacolor };
  }
  return null;
};

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
</style>
