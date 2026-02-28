<template>
  <section style="width: 100%">
    <table-filter ref="filterRef" :filters="filters" :columnsPerRow="columnsPerRow" :auto-filter="autoFilter"
      :array-node="arrayNode" @expand="handleExpand" />
    <div v-if="(!state.readonly && state.allowAdd && (addPosition === 'header' || state.template)) || $slots.action"
      :style="{ display: 'flex', marginBottom: '16px' }">
      <template v-if="!state.readonly && state.allowAdd">
        <el-button type="primary" v-if="addPosition === 'header'" @click="addRow(arrayNode)"
          :style="{ marginRight: '12px' }">{{ _L["ADD"] }}</el-button>
        <el-button type="success" v-if="state.template" @click="arrayNode.downloadTemplate()"
          :style="{ marginRight: '12px' }">{{ _L["Download Template"] }}</el-button>
        <el-button type="primary" v-if="state.template" @click="uploadData">{{ _L["Upload Data"] }}</el-button>
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
              <!-- multi row -->
              <template
                v-if="col.isArray && scope.row.node.getField(col.prop) && (scope.row.node.getField(col.prop) as ArrayNode).elements.length > scope.row.index">
                <struct-field-view
                  v-if="(scope.row.node.getField(col.prop) as ArrayNode).elements[scope.row.index] instanceof StructNode"
                  :key="((scope.row.node.getField(col.prop) as ArrayNode).elements[scope.row.index] as StructNode).getField(scol.prop)!.guid"
                  :node="((scope.row.node.getField(col.prop) as ArrayNode).elements[scope.row.index] as StructNode)"
                  :field="scol.prop" :in-form="inForm" :plain-text="plainText" :skin="skin"
                  :disabled="state.readonly || state.disabled" no-label v-bind="$attrs"></struct-field-view>
                <template v-else>
                  <span></span>
                </template>
              </template>
              <!-- single row -->
              <div v-if="
                scol.localString &&
                !col.isArray &&
                scope.row.index === 0 &&
                (scope.row.node.getField(col.prop) instanceof StructNode) &&
                isReadonlyField((scope.row.node.getField(col.prop) as StructNode), scol.prop)
              " class="localstring-readonly-tooltip"
                v-overflow-title="getFieldTipKey((scope.row.node.getField(col.prop) as StructNode), scol.prop)">
                <struct-field-view :key="(scope.row.node.getField(col.prop) as StructNode).getField(scol.prop)!.guid"
                  :node="(scope.row.node.getField(col.prop) as StructNode)" :field="scol.prop" :in-form="inForm"
                  :plain-text="plainText" :skin="skin" :disabled="state.readonly || state.disabled" no-label
                  v-bind="$attrs"></struct-field-view>
                <el-tooltip
                  :content="localStringTipMap[getFieldTipKey((scope.row.node.getField(col.prop) as StructNode), scol.prop)] || ''"
                  :disabled="!localStringOverflowMap[getFieldTipKey((scope.row.node.getField(col.prop) as StructNode), scol.prop)]"
                  placement="top" effect="dark" :show-after="200">
                  <div class="localstring-tip-trigger"></div>
                </el-tooltip>
              </div>
              <struct-field-view
                v-else-if="!col.isArray && scope.row.index === 0 && (scope.row.node.getField(col.prop) instanceof StructNode)"
                :key="(scope.row.node.getField(col.prop) as StructNode).getField(scol.prop)!.guid"
                :node="(scope.row.node.getField(col.prop) as StructNode)" :field="scol.prop" :in-form="inForm"
                :plain-text="plainText" :skin="skin" :disabled="state.readonly || state.disabled" no-label
                v-bind="$attrs"></struct-field-view>
              <template v-else>
                <span></span>
              </template>
            </template>
          </el-table-column>

          <el-table-column v-if="
            col.isArray &&
            !state.readonly &&
            !state.disabled &&
            !(noSubAdd && noSubDel)
          " :label="_L['OPER']" align="center" width="100">
            <template #default="scope">
              <template v-if="scope.row.node.getField(col.prop)">
                <a href="javascript:void(0)" style="color: lightseagreen"
                  v-if="!noSubAdd && (scope.row.node.getField(col.prop) as ArrayNode).elements.length == scope.row.index"
                  @click="
                    addRow(scope.row.node.getField(col.prop) as ArrayNode)
                    ">{{ _L["ADD"] }}</a>
                <a href="javascript:void(0)" style="color: red"
                  v-else-if="!noSubDel && (scope.row.node.getField(col.prop) as ArrayNode).elements.length > scope.row.index"
                  @click="
                    delRow(
                      scope.row.node.getField(col.prop) as ArrayNode,
                      scope.row.index
                    )
                    ">{{ _L["DEL"] }}</a>
              </template>
            </template>
          </el-table-column>
        </el-table-column>

        <template v-else-if="col.subCols && col.subCols.length && singleHeader">
          <el-table-column v-for="scol in col.subCols" :key="`${col.prop}.${scol.prop}`"
            :prop="`${col.prop}.${scol.prop}`" :label="mergeHeaderText(col.label, scol.label)"
            :min-width="scol.localString ? 200 : 140" :header-align="headerAlign"
            :show-overflow-tooltip="!scol.localString">
            <template #header v-if="scol.require">
              <span><span style="color: red; margin-right: 4px">*</span>{{ mergeHeaderText(col.label, scol.label)
                }}</span>
            </template>
            <template #default="scope">
              <!-- multi row -->
              <template
                v-if="col.isArray && scope.row.node.getField(col.prop) && (scope.row.node.getField(col.prop) as ArrayNode).elements.length > scope.row.index">
                <struct-field-view
                  v-if="(scope.row.node.getField(col.prop) as ArrayNode).elements[scope.row.index] instanceof StructNode"
                  :key="((scope.row.node.getField(col.prop) as ArrayNode).elements[scope.row.index] as StructNode).getField(scol.prop)!.guid"
                  :node="((scope.row.node.getField(col.prop) as ArrayNode).elements[scope.row.index] as StructNode)"
                  :field="scol.prop" :in-form="inForm" :plain-text="plainText" :skin="skin"
                  :disabled="state.readonly || state.disabled" no-label v-bind="$attrs"></struct-field-view>
                <template v-else>
                  <span></span>
                </template>
              </template>
              <!-- single row -->
              <div v-if="
                scol.localString &&
                !col.isArray &&
                scope.row.index === 0 &&
                (scope.row.node.getField(col.prop) instanceof StructNode) &&
                isReadonlyField((scope.row.node.getField(col.prop) as StructNode), scol.prop)
              " class="localstring-readonly-tooltip"
                v-overflow-title="getFieldTipKey((scope.row.node.getField(col.prop) as StructNode), scol.prop)">
                <struct-field-view :key="(scope.row.node.getField(col.prop) as StructNode).getField(scol.prop)!.guid"
                  :node="(scope.row.node.getField(col.prop) as StructNode)" :field="scol.prop" :in-form="inForm"
                  :plain-text="plainText" :skin="skin" :disabled="state.readonly || state.disabled" no-label
                  v-bind="$attrs"></struct-field-view>
                <el-tooltip
                  :content="localStringTipMap[getFieldTipKey((scope.row.node.getField(col.prop) as StructNode), scol.prop)] || ''"
                  :disabled="!localStringOverflowMap[getFieldTipKey((scope.row.node.getField(col.prop) as StructNode), scol.prop)]"
                  placement="top" effect="dark" :show-after="200">
                  <div class="localstring-tip-trigger"></div>
                </el-tooltip>
              </div>
              <struct-field-view
                v-else-if="!col.isArray && scope.row.index === 0 && (scope.row.node.getField(col.prop) instanceof StructNode)"
                :key="(scope.row.node.getField(col.prop) as StructNode).getField(scol.prop)!.guid"
                :node="(scope.row.node.getField(col.prop) as StructNode)" :field="scol.prop" :in-form="inForm"
                :plain-text="plainText" :skin="skin" :disabled="state.readonly || state.disabled" no-label
                v-bind="$attrs"></struct-field-view>
              <template v-else>
                <span></span>
              </template>
            </template>
          </el-table-column>

          <el-table-column v-if="
            col.isArray &&
            !state.readonly &&
            !state.disabled &&
            !(noSubAdd && noSubDel)
          " :label="mergeHeaderText(col.label, _L['OPER'])" align="center" width="100">
            <template #default="scope">
              <template v-if="scope.row.node.getField(col.prop)">
                <a href="javascript:void(0)" style="color: lightseagreen"
                  v-if="!noSubAdd && (scope.row.node.getField(col.prop) as ArrayNode).elements.length == scope.row.index"
                  @click="
                    addRow(scope.row.node.getField(col.prop) as ArrayNode)
                    ">{{ _L["ADD"] }}</a>
                <a href="javascript:void(0)" style="color: red"
                  v-else-if="!noSubDel && (scope.row.node.getField(col.prop) as ArrayNode).elements.length > scope.row.index"
                  @click="
                    delRow(
                      scope.row.node.getField(col.prop) as ArrayNode,
                      scope.row.index
                    )
                    ">{{ _L["DEL"] }}</a>
              </template>
            </template>
          </el-table-column>
        </template>

        <!-- Single row -->
        <el-table-column v-else :prop="col.prop" :label="col.label" :min-width="col.localString ? 200 : 140"
          :width="(col.ref || col.json) ? (col.localString ? 200 : 140) : undefined" :header-align="headerAlign"
          :align="(col.ref || col.json) ? true : undefined" :show-overflow-tooltip="!col.localString">
          <template #header v-if="col.require">
            <span><span style="color: red; margin-right: 4px">*</span>{{ col.label }}</span>
          </template>
          <template #default="scope">
            <template v-if="scope.row.index === 0">
              <el-form-item v-if="col.ref || col.json" label-width="0px">
                <a href="javascript:void(0)" v-if="col.ref" @click="openRef(scope.row.node, col.prop)">
                  {{ col.desc || col.label }}
                </a>
                <a href="javascript:void(0)" v-else-if="col.json" @click="openDetail(scope.row.node, col.prop)">
                  {{ col.desc || col.label }}
                </a>
              </el-form-item>
              <template v-else-if="(scope.row.node as StructNode).getField(col.prop)">
                <div v-if="col.localString && isReadonlyField((scope.row.node as StructNode), col.prop)"
                  class="localstring-readonly-tooltip"
                  v-overflow-title="getFieldTipKey((scope.row.node as StructNode), col.prop)">
                  <struct-field-view :key="(scope.row.node as StructNode).getField(col.prop)!.guid"
                    :node="scope.row.node" :field="col.prop" :in-form="inForm" :plain-text="plainText" :skin="skin"
                    :disabled="state.readonly || state.disabled" no-label v-bind="$attrs"></struct-field-view>
                  <el-tooltip
                    :content="localStringTipMap[getFieldTipKey((scope.row.node as StructNode), col.prop)] || ''"
                    :disabled="!localStringOverflowMap[getFieldTipKey((scope.row.node as StructNode), col.prop)]"
                    placement="top" effect="dark" :show-after="200">
                    <div class="localstring-tip-trigger"></div>
                  </el-tooltip>
                </div>
                <struct-field-view v-else :key="(scope.row.node as StructNode).getField(col.prop)!.guid"
                  :node="scope.row.node" :field="col.prop" :in-form="inForm" :plain-text="plainText" :skin="skin"
                  :disabled="state.readonly || state.disabled" no-label v-bind="$attrs"></struct-field-view>
              </template>
            </template>
          </template>
        </el-table-column>
      </template>

      <!-- Oper -->
      <el-table-column v-if="
        $slots.operator ||
        (!state.readonly &&
          !state.disabled &&
          (state.allowAdd || state.allowDel))
      " :label="_L['OPER']" align="center" fixed="right" :width="operWidth || 100">
        <template #header>
          <a href="javascript:void(0)"
            v-if="!state.readonly && state.allowAdd && (addPosition !== 'header' || state.template)"
            @click="addRow(arrayNode)" style="text-decoration: underline; color: lightseagreen">{{ _L["ADD"] }}</a>
          <p v-else>{{ _L["OPER"] }}</p>
        </template>
        <template #default="scope" v-if="$slots.operator || state.allowDel">
          <slot name="operator" :row="scope.row.node" :index="scope.row.eleIdx">
            <a type="danger" v-if="!noDel && !state.deleted[scope.row.eleIdx]" href="javascript:void(0)"
              @click="delRow(arrayNode, scope.row.eleIdx)">{{ _L["DEL"] }}</a>
            <a type="primary" v-else-if="!noDel && state.deleted[scope.row.eleIdx]" href="javascript:void(0)"
              @click="resumeRow(arrayNode, scope.row.eleIdx)">{{ _L["RESUME"] }}</a>
          </slot>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="showPrepareRow" :close-on-click-modal="false" size="1000px" :title="_L['ADD']" append-to-body
      @closed="closePrepareRow">
      <el-container class="main" style="height: 80vh">
        <el-main>
          <el-form v-if="prepareRow" ref="editorRef" :model="prepareRow.rawData" label-width="160" label-position="left"
            style="width: 100%; height: 90%">
            <div class="draw-view">
              <schema-view :node="(prepareRow as StructNode)" in-form="expandall" plain-text="left"></schema-view>
            </div>
          </el-form>
        </el-main>
        <el-footer>
          <br />
          <el-button type="primary" @click="savePrepareRow">{{
            _L["SAVE"]
            }}</el-button>
          <el-button @click="closePrepareRow">{{ _L["CLOSE"] }}</el-button>
        </el-footer>
      </el-container>
    </el-drawer>

    <el-drawer v-model="showRefNode" :close-on-click-modal="false" size="1000px"
      :title="_L(refNode?.display?.key ? refNode.display : refNode?.name)" append-to-body @closed="closeRefNode">
      <el-container class="main" style="height: 80vh">
        <el-main>
          <el-form v-if="refNode" ref="refForm" :model="refNode.rawData" label-width="160" label-position="left"
            style="width: 100%; height: 90%">
            <!--template v-for="col in state.columns.filter((c) => !c.ref && c.require)" :key="col.name">
              <schema-view :node="(refRow as StructNode).getField(col.prop)" in-form="nest" :disabled="true"
                v-bind="$attrs"></schema-view>
            </template-->
            <div class="draw-view">
              <schema-view :key="refNode.guid" :node="refNode as any" in-form="expandall" no-filter="true"
                plain-text="left" hide-query-field :addPosition="addPosition" :autoDel="autoDel"></schema-view>
            </div>
          </el-form>
        </el-main>
        <el-footer>
          <br />
          <el-button type="primary" v-if="!refNode?.readonly && refChanged && refValid" @click="saveRefNode">{{
            _L["SAVE"]
            }}</el-button>
          <el-button @click="closeRefNode">{{ _L["CLOSE"] }}</el-button>
        </el-footer>
      </el-container>
    </el-drawer>

    <el-drawer v-model="showDetailNode" :close-on-click-modal="true" size="1000px" :title="detailTitle" append-to-body
      @closed="closeDetailNode">
      <el-container class="main" style="height: 80vh">
        <el-main>
          <el-form v-if="detailNode" ref="editorRef" :model="detailNode.rawData" label-width="160" label-position="left"
            style="width: 100%; height: 90%">
            <div class="draw-view">
              <schema-view :node="detailNode as any" in-form="expandall" plain-text="left"></schema-view>
            </div>
          </el-form>
        </el-main>
        <el-footer>
          <br />
          <el-button @click="closeDetailNode">{{ _L["CLOSE"] }}</el-button>
        </el-footer>
      </el-container>
    </el-drawer>

    <!-- page -->

    <el-pagination v-if="state.pageCount && state.total" ref="pageRef" :current-page="(state.page || 0) + 1"
      :page-size="state.pageCount" :total="state.total" :pager-count="state.pageCount" layout="total, prev, pager, next"
      :style="{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '16px',
      }" @current-change="handlePage">
    </el-pagination>
    <el-pagination v-else-if="state.total" ref="pageRef" :current-page="(state.page || 0) + 1"
      :page-size="state.pageCount || state.total" :total="state.total" :pager-count="state.total"
      layout="total, prev, pager, next" :style="{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '16px',
      }" @current-change="handlePage"></el-pagination>
  </section>
</template>

<script lang="ts" setup>
import {
  type AnySchemaNode,
  AppNode,
  ArrayNode,
  ArrayNodeLayoutChange,
  clearDebounce,
  debounce,
  getSchema,
  type ILocaleString,
  type IStructFieldConfig,
  NS_SYSTEM_LOCALE_STRING,
  RelationType,
  SchemaType,
  sformat,
  StructNode,
  subscribeLanguage,
} from "schema-node";
import { SchemaNodeFormType } from "../formType";
import {
  onMounted,
  onUnmounted,
  reactive,
  toRaw,
  shallowRef,
  ref,
  computed,
  nextTick,
} from "vue";
import { useSingleView } from "../schemaView";
import structFieldView from "./structFieldView.vue";
import { _L } from "../locale";
import schemaView from "./schemaView.vue";
import tableFilter from "./tableFilter/index.vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { ElForm } from "element-plus";

// Properties
const props = defineProps<{
  /**
   * The array node with struct elements
   */
  node: ArrayNode;

  /**
   * form settings
   */
  inForm?: SchemaNodeFormType;

  /**
   * Skin
   */
  skin?: string;

  /**
   * Display readon only value as plain text
   */
  plainText?: any;

  /**
   * No add row
   */
  noAdd?: boolean;

  /**
   * No del row
   */
  noDel?: boolean;

  /**
   * No sub row add
   */
  noSubAdd?: boolean;

  /**
   * No sub row del
   */
  noSubDel?: boolean;

  /**
   * Hight light change row
   */
  highLightChange?: boolean;

  /**
   * new row color
   */
  newColor?: String;

  /**
   * change row color
   */
  changeColor?: String;

  /**
   * del row color
   */
  delColor?: string;

  /**
   * operation width
   */
  operWidth?: any;

  /**
   * Whether to auto filter columns
   */
  autoFilter?: boolean;

  /**
   * No filter section
   */
  noFilter?: boolean;

  /**
   * Auto confirm delete
   */
  autoDel?: boolean;

  /**
   * Keep reference field open when click, default false
   */
  keepRefOpen?: boolean;

  /**
   * Whether to hide query field in add row form, default false
   */
  hideQueryField?: boolean;

  /**
   * Disable incr-update feature in reference, since the number will be low
   */
  disableRefIncr?: boolean;

  /**
   * Render grouped headers in single line by merging parent and child labels
   */
  singleHeader?: boolean;

  addPosition?: "header" | "tableHeader";
  resizeMethod?: (event: any, tableRef: any, pageRef: any) => void;
}>();

// slots
const rows = shallowRef<ITableRow[]>([]);

// State
const arrayNode: ArrayNode = toRaw(props.node);
const state = reactive<{
  columns: IColumnInfo[]; // column info
  spanCols: { [key: number]: boolean }; // column span info
  primaryFields: string[];
  readonly?: boolean;
  disabled?: boolean;
  page?: number;
  pageCount?: number;
  total?: number;
  deleted: boolean[];
  allowAdd: boolean;
  allowDel: boolean;
  allReadonly?: boolean;
  template?: boolean;
}>({
  columns: [],
  spanCols: {},
  primaryFields: [],
  deleted: [],
  allowAdd: props.noAdd ? false : true,
  allowDel: props.noDel ? false : true,
});

const newdatacolor = props.newColor || "#98d7eb";
const changedatacolor = props.changeColor || "#c7f3b1";
const deldatacolor = props.delColor || "grey";
const headerAlign =
  typeof props.plainText === "string" ? props.plainText : "center";
const currentLang = ref((navigator.language || "").toLowerCase());

const mergeHeaderText = (upper: string, lower: string) =>
  currentLang.value.startsWith("zh")
    ? `${upper}${lower}`
    : `${upper} ${lower}`;

const isReadonlyField = (node: StructNode, field: string) => {
  const f = node.getField(field);
  if (!f) return false;
  return !!(f.readonly || (f as any).displayOnly || state.readonly || state.disabled);
};

const getFieldTipKey = (node: StructNode, field: string) => {
  const f = node.getField(field);
  return f?.guid || `${node.guid}:${field}`;
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
let dataWatcher: Function | null = null;
let stateWatcher: Function | null = null;
let langWatcher: Function | null = null;
let rowCount = 0;
let rowWatches: { guid: string; array: Function[] }[] = [];
const showPrepareRow = ref(false);
const prepareRow = ref<StructNode | null>(null);
let queryFilter: { [key: string]: any } = {};
let blackColumns: string[] = [];
const tableRef = ref();
const pageRef = ref();
const w = ref(window.innerWidth);
const filterRef = ref();
const filters = (!props.noFilter ? arrayNode.filters : []) || [];

const columnsPerRow = computed(() => {
  if (w.value < 800) {
    return 1;
  } else if (w.value < 1080) {
    return 2;
  } else if (w.value <= 1440) {
    return 3;
  } else if (w.value <= 1920) {
    return 4;
  }
  return 5;
});

function resizefunc(event: any) {
  w.value = window.innerWidth;
  nextTick(() => {
    if (props.resizeMethod) {
      if (filterRef.value) {
        filterRef.value.getFilterHeight();
      }
      props.resizeMethod(event, tableRef.value, pageRef.value);
    }
  });
}

function handleExpand(isExpand: boolean) {
  nextTick(() => {
    setTimeout(() => {
      if (props.resizeMethod) {
        props.resizeMethod(null, tableRef.value, pageRef.value);
      }
    }, 200);
  });
}

onMounted(async () => {
  window.addEventListener("resize", resizefunc);
  // resizefunc(null);
  const node = arrayNode;
  blackColumns = [...node.blackColumns];

  queryFilter = node.query || {};
  state.template = node.enableTemplate;

  await refreshColumns();

  // row change handler
  dataWatcher = node.subscribeLayoutChanged(async (action: ArrayNodeLayoutChange) => {
    if (action === ArrayNodeLayoutChange.Column)
      return await refreshColumns();
    else if (action === ArrayNodeLayoutChange.All)
      await refreshColumns();

    const count = node.elements.length;
    state.total = node.total;
    state.page = node.page;
    state.pageCount = node.pageCount;

    state.disabled = node.rule.disable || !node.allowUpdate;
    state.allowAdd = !props.noAdd && node.allowAdd && !state.allReadonly;
    state.allowDel = !props.noDel && node.allowDelete && !state.allReadonly;

    const filter = node.query || {};
    if (
      blackColumns.length !== node.blackColumns.length ||
      blackColumns.some((c) => node.blackColumns.indexOf(c) === -1)
    ) {
      blackColumns = [...node.blackColumns];
      let changed = false;
      const columns = state.columns.map((c) => {
        const ret = { ...c };
        if (blackColumns.indexOf(ret.prop) >= 0) {
          if (!ret.invisible) {
            ret.invisible = true;
            changed = true;
          }
        } else if (ret.invisible) {
          ret.invisible = false;
          changed = true;
        }
        return ret;
      });
      if (changed) state.columns = columns;
    }

    rowCount = count;

    // clear
    for (let i = rowWatches.length - 1; i >= rowCount; i--) {
      const w = rowWatches.pop();
      w?.array.forEach((a) => a());
    }

    // refresh rows
    genRows();
  }, true);

  // state handler
  stateWatcher = node.subscribeState(() => {
    state.readonly = node.readonly;
    state.disabled = node.rule.disable || !node.allowUpdate;
    state.allowAdd = !props.noAdd && node.allowAdd && !state.allReadonly;
    state.allowDel = !props.noDel && node.allowDelete && !state.allReadonly;
  }, true);

  // lang handler
  langWatcher = subscribeLanguage((lang: string) => {
    currentLang.value = (lang || navigator.language || "").toLowerCase();
    refrehColumn(state.columns);
    state.columns = [...state.columns];
  });

  // auto filter
  arrayNode.enableAutoFilter(props.autoFilter ?? false);
});

onUnmounted(() => {
  window.removeEventListener("resize", resizefunc);
  rowWatches.forEach((r) => r.array.forEach((a) => a()));
  if (dataWatcher) dataWatcher();
  if (stateWatcher) stateWatcher();
  if (langWatcher) langWatcher();
  clearDebounce(genRows);
});

const refreshColumns = async () => {
  const node = arrayNode;
  // column info
  const primary = node.schema.array?.primary;
  const fields = node.elementSchema.struct?.fields;
  const columnInfos: IColumnInfo[] = [];

  let spanCols: { [key: number]: boolean } = {};
  let columnIndex = 0;
  let allReadonly = true;
  if (fields) {
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.readonly && !f.displayOnly) allReadonly = false;
      if (
        primary &&
        primary.findIndex((p) => p.toLowerCase() === f.name.toLowerCase())
      )
        state.primaryFields.push(f.name);

      if (!f.invisible && blackColumns.indexOf(f.name) === -1 && (!props.hideQueryField || !node.query || node.query[f.name] === undefined)) {
        const columnInfo = await genColumn(
          f,
          false,
          node.isReferenceField(f.name)
        );
        if (!columnInfo) continue;
        columnInfos.push(columnInfo);

        if (columnInfo.subCols) {
          if (!columnInfo.isArray) {
            for (let j = 0; j < columnInfo.subCols.length; j++)
              spanCols[columnIndex++] = true;
          } else {
            columnIndex += columnInfo.subCols.length + (node.readonly ? 0 : 1);
          }
        } else {
          spanCols[columnIndex++] = true;
        }
      }
    }
  }
  state.allReadonly = allReadonly;
  if (!node.readonly) spanCols[columnIndex++] = true;

  // update state
  state.columns = columnInfos;
  state.spanCols = spanCols;
}

// add row
const addRow = (arrayNode: ArrayNode) => {
  if (arrayNode.incrUpdate) {
    prepareRow.value = arrayNode.prepareRow({ ...queryFilter }) as StructNode;

    state.columns.forEach((col) => {
      if (col.ref) {
        prepareRow.value!.getField(col.prop)!.config.invisible = true;
      }
    });

    showPrepareRow.value = true;
    return;
  }
  toRaw(arrayNode).addRow(undefined, { ...queryFilter });
  genRows();
};

// del row
const delRow = async (arrayNode: ArrayNode, index: number) => {
  const array = toRaw(arrayNode)
  const isnew = array.isNewRow(array.elements[index]);
  if (props.autoDel && !isnew) {
    try {
      await ElMessageBox.confirm(sformat("DEL_CONFIRM", _L.value(arrayNode?.desc?.key ? arrayNode.desc : arrayNode.display)), _L.value("NOTIFY"), { type: "warning", dangerouslyUseHTMLString: true });
    } catch {
      return;
    }
    await toRaw(arrayNode).delRows(index, 1, true);
  }
  else {
    toRaw(arrayNode).delRows(index);
    if (!arrayNode.incrUpdate) genRows();
    else state.deleted[index] = true;
  }
};

// resume row
const resumeRow = (arrayNode: ArrayNode, index: number) => {
  toRaw(arrayNode).resumeRows(index);
  state.deleted[index] = false;
};

const savePrepareRow = async () => {
  if (prepareRow.value && prepareRow.value.valid) {
    await arrayNode.savePrepareRow(prepareRow.value as StructNode, true);
    closePrepareRow();
  }
};

const closePrepareRow = () => {
  prepareRow.value?.dispose();
  prepareRow.value = null;
  showPrepareRow.value = false;
};

// gen columns
const genColumn = async (
  field: IStructFieldConfig,
  skipSub?: boolean,
  ref?: boolean
) => {
  const unit = _L.value(field.unit);
  const column: IColumnInfo = {
    prop: field.name,
    display: field.display,
    unit: field.unit,
    label: `${_L.value(field.display) || field.name}${unit ? `(${unit})` : ""}`,
    desc: `${_L.value(field.desc) || ""}`,
    require: field.require || false,
    ref,
    localString: field.type === NS_SYSTEM_LOCALE_STRING,
  };
  let schema = await getSchema(field.type);
  if (!schema) return null;

  if (schema.type === SchemaType.Json) {
    const template = arrayNode.getTemplateNode(field.name);
    const replaceType = template?.rule.type
    schema = replaceType ? await getSchema(replaceType) : schema;
    if (!schema || schema.type === SchemaType.Json) {
      if (template?.ruleSchema?.pushSchemas?.some(p => p.type === RelationType.Type)) {
        column.json = true;
        return column;
      }
      return null;
    }
  }

  // gen sub columns
  if (!skipSub && !ref) {
    if (!useSingleView(schema, props.skin)) {
      if (schema.type === SchemaType.Array) {
        column.isArray = true;
        schema = await getSchema(schema.array!.element);
        if (!schema) return null;
      }

      if (schema.type === SchemaType.Struct) {
        const subCols: IColumnInfo[] = [];
        for (let i = 0; i < schema.struct!.fields.length; i++) {
          const f = schema.struct!.fields[i];
          if (!f.invisible) {
            const col = await genColumn(f, true);
            if (!col) continue;
            subCols.push(col);
          }
        }
        column.subCols = subCols;
      }
    }
  }

  return column;
};

const refrehColumn = (cols: IColumnInfo[]) => {
  cols.forEach((c) => {
    const unit = _L.value(c.unit);
    c.label = `${_L.value(c.display) || c.prop}${unit ? `(${unit})` : ""}`;
    if (c.subCols?.length) refrehColumn(c.subCols);
  });
};

const spanMethod = (data: any) => {
  const { row, column, rowIndex, columnIndex } = data;
  if (state.spanCols[columnIndex]) {
    if (row.index === 0) {
      return { rowspan: row.count, colspan: 1, };
    }
    return { rowspan: 0, colspan: 0 };
  }
};

const genRows = debounce(() => {
  const node = arrayNode;
  const rowDatas: ITableRow[] = [];
  rowCount = node.elements.length;
  state.deleted.length = rowCount;
  node.elements.forEach((ele: AnySchemaNode, eleIdx: number) => {
    let count = 0;
    (ele as StructNode).fields
      .filter((f) => f.schemaType === SchemaType.Array)
      .forEach(
        (f) => (count = Math.max(count, (f as ArrayNode).elements.length))
      );

    // for add
    if (!node.readonly && !props.noSubAdd) count++;

    count = Math.max(1, count);

    state.deleted[eleIdx] = node.isRowDeleted(ele);

    // gen row
    for (let index = 0; index < count; index++)
      rowDatas.push({ node: ele, eleIdx, index, count });
  });
  rows.value = rowDatas;
  resizefunc(null);
}, 100);

const handlePage = async (page: number) => {
  await arrayNode.setPage(page - 1);

  for (let i = 0; i < arrayNode.elements.length; i++) {
    state.deleted[i] = arrayNode.isRowDeleted(arrayNode.elements[i]);
  }
};

const getRowStyle = (data: any) => {
  return state.deleted[data.row.eleIdx]
    ? { backgroundColor: deldatacolor }
    : null;
};

//#region ref node

const refForm = ref<InstanceType<typeof ElForm>>();
const refRow = ref<StructNode | null>(null);
const refNode = ref<ArrayNode | null>(null);
const showRefNode = ref(false);
const refChanged = ref(false);
const refValid = ref(true);
let refDataWatcher: Function | null = null;
const openRef = async (node: StructNode, prop: string) => {
  const rnode = (await arrayNode.getReferenceNode(node, prop, props.disableRefIncr)) as ArrayNode;
  if (!rnode) return;
  refRow.value = node;
  refNode.value = rnode;
  showRefNode.value = true;

  refChanged.value = rnode.changed;
  refValid.value = rnode.valid;
  let first = true;
  refDataWatcher = rnode.subscribe(() => {
    if (rnode.changed && first && refForm.value) {
      refForm.value.validate();
      first = false;
    }
    refChanged.value = rnode.changed;
    refValid.value = rnode.valid;
  });
};

const closeRefNode = () => {
  showRefNode.value = false;
  refRow.value = null;
  refNode.value?.dispose();
  refNode.value = null;

  if (refDataWatcher) {
    refDataWatcher();
    refDataWatcher = null;
  }
};

const saveRefNode = async () => {
  if (!refNode.value || !refNode.value.changed) return;

  if (!refNode.value.valid) {
    console.log(refNode.value.fullerror)
    ElMessage.error(_L.value["frontend.view.error"])
    return
  }

  let appNode = arrayNode.parent;
  while (appNode && !(appNode instanceof AppNode)) appNode = appNode.parent;
  if (appNode) await appNode.submit([refNode.value as ArrayNode]);
  if (!props.keepRefOpen)
    closeRefNode();
};

//#endregion

//#region openDetail
const detailNode = ref<AnySchemaNode | null>(null);
const showDetailNode = ref(false);
const detailTitle = ref("");
const openDetail = async (node: StructNode, prop: string) => {
  const field = node.getField(prop);
  if (!field) return;

  detailTitle.value = `${_L.value(field.display) || field.name}`;
  detailNode.value = field;
  showDetailNode.value = true;
}

const closeDetailNode = () => {
  showDetailNode.value = false;
  detailNode.value = null;
}

//#region Template data

const uploadData = async () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".xlsx,.xls";
  input.onchange = async (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const res = await arrayNode.uploadDataFile(file, true);
      if (res && res.result) {
        await arrayNode.setPage(0);
      }
    }
  };
  input.click();
};

//#endregion


interface IColumnInfo {
  prop: string;
  display?: ILocaleString;
  unit?: ILocaleString;
  label: string;
  desc: string;
  require: boolean;
  isArray?: boolean;
  subCols?: IColumnInfo[];
  ref?: boolean;
  invisible?: boolean;
  json?: boolean;
  localString?: boolean;
}

interface ITableRow {
  node: AnySchemaNode;
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

.localstring-readonly-tooltip :deep(section > a) {
  position: absolute;
  right: 1rem;
  top: 0;
  z-index: 4;
  white-space: nowrap;
  word-break: keep-all;
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