<template>
  <div v-if="filters.length" :class="['filters', `filters-${columnsPerRow}`]">
    <el-form :inline="true" ref="formRef" :style="{ maxHeight: '80px', overflow: 'hidden' }">
      <template v-for="filter in filters" :key="filter.filter">
        <template v-for="(node, idx) in filter.nodes" :key="node.id ?? `${filter.filter}-${idx}`">
          <schema-view :node="node" text="left" :in-form="true"></schema-view>
        </template>
      </template>
      <el-form-item class="filters-actions">
        <el-button v-if="haveMoreBtn" link type="primary" class="filters-actions-expand" @click="expandHandler">
          <span>{{ isExpand ? _L('COLLAPSE') : _L('EXPAND') }}</span>
          <el-icon :size="16" :class="['filters-actions-icon', `filters-actions-icon-${isExpand ? 'open' : 'close'}`]">
            <CaretBottom />
          </el-icon>
        </el-button>
        <template v-if="!autoFilter">
          <el-button @click="emit('reset')">{{ _L('RESET') }}</el-button>
          <el-button type="primary" @click="emit('query')">{{ _L('QUERY') }}</el-button>
        </template>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { CaretBottom } from "@element-plus/icons-vue";
import schemaView from "../schemaView.vue";
import { _L } from "../utility/locale";
import type { IArrayFieldFilter } from "schema-node-app";

const props = defineProps<{
  /** The field filters with input nodes */
  filters: IArrayFieldFilter[];
  /** Columns per row for filter layout */
  columnsPerRow: number;
  /** Whether auto filter is enabled (hides query/reset buttons) */
  autoFilter?: boolean;
}>();

const emit = defineEmits<{
  (e: "expand", isExpand: boolean): void;
  (e: "reset"): void;
  (e: "query"): void;
}>();

const formRef = ref();
const haveMoreBtn = ref(false);
const isExpand = ref(false);

function getFilterStyle() {
  const formNode = formRef.value;
  if (!formNode) return 0;
  const formEle = formNode.$el;
  if (!formEle) return 0;
  const childrens = formEle.children;
  if (childrens.length === 0) return 0;
  const firstChild = childrens[0];
  const firstRect = firstChild.getBoundingClientRect();
  if (props.columnsPerRow >= childrens.length) return 0;
  let lastChild = childrens[childrens.length - 2];
  if (lastChild.style.display === "none") {
    lastChild = childrens[childrens.length - 3];
  }
  const lastRect = lastChild.getBoundingClientRect();
  const i = 2 * props.columnsPerRow - 1;
  if (i >= childrens.length) return 0;
  const lastShowChild = childrens[i];
  const lastShowRect = lastShowChild.getBoundingClientRect();
  return { firstChild, firstRect, lastChild, lastRect, childrens, lastShowRect, lastShowChild, formEle };
}

function getFilterHeight() {
  const obj = getFilterStyle();
  if (!obj) {
    haveMoreBtn.value = false;
    isExpand.value = false;
    return 0;
  }
  const { firstRect, lastRect, childrens, lastShowRect, formEle } = obj;
  const height = lastRect.bottom - firstRect.top;
  const totalFilters = props.filters.reduce((sum, f) => sum + (f.nodes?.length ?? 0), 0);
  const rows = Math.ceil(totalFilters / props.columnsPerRow);
  if (rows <= 2) {
    haveMoreBtn.value = false;
    isExpand.value = false;
    if (props.autoFilter) {
      childrens[childrens.length - 2].style.display = "none";
    }
    return height;
  }

  haveMoreBtn.value = true;
  const h = isExpand.value
    ? lastRect.bottom - firstRect.top
    : lastShowRect.bottom - firstRect.top;
  const cssText = `max-height: ${h}px; overflow: hidden;transition: max-height 0.2s ease-in-out;`;
  formEle.style.cssText = cssText;
}

function expandHandler() {
  const obj = getFilterStyle();
  if (!obj) return;
  const { firstRect, lastRect, formEle, lastShowRect } = obj;
  const height = lastRect.bottom - firstRect.top;
  formEle.style.maxHeight = `${isExpand.value ? lastShowRect.bottom - firstRect.top : height}px`;
  isExpand.value = !isExpand.value;
  emit("expand", isExpand.value);
}

onMounted(() => {
  getFilterHeight();
});

defineExpose({ getFilterHeight });
</script>

<style scoped>
.filters {
  position: relative;
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.filters:after {
  position: absolute;
  content: "";
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: #f0f0f0;
}

.filters-1 .el-form-item { width: 100%; }
.filters-2 .el-form-item { width: 50%; }
.filters-3 .el-form-item { width: 33.33%; }
.filters-4 .el-form-item { width: 25%; }
.filters-5 .el-form-item { width: 20%; }

.filters-actions {
  position: absolute;
  right: 0;
  bottom: 0;
}

.filters-actions-icon {
  transition: transform 0.2s ease-in-out;
}

.filters-actions-icon-open {
  transform: rotate(180deg);
}

.filters-actions-icon-close {
  transform: rotate(0deg);
}

.filters-actions .el-form-item__content {
  justify-content: flex-end;
  background-color: #fff;
}

.filters-actions button {
  min-width: 80px;
}

.filters-actions-expand {
  min-width: max-content !important;
}

.filters .el-form {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  row-gap: 16px;
  text-align: left;
  margin-left: -24px;
}

.filters .el-form--inline .el-form-item {
  margin-right: 0;
  margin-bottom: 0;
  padding-left: 24px;
  box-sizing: border-box;
  min-height: 32px;
}

.filters .el-form-item__label {
  position: relative;
  width: 94px;
  padding-right: 8px;
}

.filters .el-form-item__label:after {
  position: absolute;
  content: ":";
  top: 0;
  right: 2px;
  width: 100%;
  height: 4px;
}
</style>
