<template>
  <div v-if="filters.length" :class="['filters', `filters-${columnsPerRow}`]">
    <el-form :inline="true" ref="formRef">
      <template v-for="filter in filters">
        <template v-for="node in filter.nodes" :key="node.guid">
          <schema-view
            :node="node"
            plain-text="left"
            :in-form="true"
          ></schema-view>
        </template>
      </template>
      <el-form-item> </el-form-item>
      <el-form-item class="filters-actions">
        <el-button
          v-if="haveMoreBtn"
          link
          type="primary"
          class="filters-actions-expand"
          @click="expandHandler"
        >
          <span>{{ isExpand ? "收起" : "展开" }}</span>
          <el-icon
            :size="16"
            :class="[
              'filters-actions-icon',
              `filters-actions-icon-${isExpand ? 'open' : 'close'}`,
            ]"
            ><CaretBottom />
          </el-icon>
        </el-button>
        <template v-if="!autoFilter">
          <el-button @click="arrayNode.resetFilter(true)">{{
            _L["RESET"]
          }}</el-button>
          <el-button @click="arrayNode.processFilter()" type="primary">{{
            _L["QUERY"]
          }}</el-button>
        </template>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { type ArrayNode } from "schema-node";
import schemaView from "../schemaView.vue";
import { _L } from "../../locale";
import { CaretBottom } from "@element-plus/icons-vue";
import { ref } from "vue";

const props = defineProps<{
  filters: any[];
  columnsPerRow: number;
  autoFilter?: boolean;
  arrayNode: ArrayNode;
}>();

const emit = defineEmits<{
  (e: "expand", isExpand: boolean): void;
}>();

const formRef = ref();
const haveMoreBtn = ref(false);
const isExpand = ref(false);

function getFilterStyle() {
  const formNode = formRef.value;
  if (!formNode) {
    return 0;
  }
  const formEle = formNode.$el;
  if (!formEle) {
    return 0;
  }
  const childrens = formEle.children;
  if (childrens.length === 0) {
    return 0;
  }
  const firstChild = childrens[0];
  const firstRect = firstChild.getBoundingClientRect();
  if (props.columnsPerRow >= childrens.length) {
    return 0;
  }
  let lastChild = childrens[childrens.length - 2];
  if (lastChild.style.display === "none") {
    lastChild = childrens[childrens.length - 3];
  }
  const lastRect = lastChild.getBoundingClientRect();
  const i = 2 * props.columnsPerRow - 1;
  if (i >= childrens.length) {
    return 0;
  }
  const lastShowChild = childrens[i];
  const lastShowRect = lastShowChild.getBoundingClientRect();
  return {
    firstChild,
    firstRect,
    lastChild,
    lastRect,
    childrens,
    lastShowRect,
    lastShowChild,
    formEle,
  };
}

function getFilterHeight() {
  // isExpand.value = false;
  const obj = getFilterStyle();
  if (!obj) {
    haveMoreBtn.value = false;
    isExpand.value = false;
    return 0;
  }
  const { firstRect, lastRect, childrens, lastShowRect, formEle } = obj;
  const height = lastRect.bottom - firstRect.top;
  const rows = Math.ceil(props.filters.length / props.columnsPerRow);
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
  const cssText = `max-height: ${h}px; overflow: hidden;`;
  formEle.style.cssText = cssText;
}

async function expandHandler() {
  const obj = getFilterStyle();
  if (!obj) {
    return 0;
  }
  const { firstRect, lastRect, formEle, lastShowRect } = obj;
  const height = lastRect.bottom - firstRect.top;
  formEle.style.transition = "max-height 0.2s ease-in-out";
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    });
  });
  formEle.style.maxHeight = `${
    isExpand.value ? lastShowRect.bottom - firstRect.top : height
  }px`;
  isExpand.value = !isExpand.value;
  emit("expand", isExpand.value);
}
defineExpose({
  getFilterHeight,
});
</script>

<style lang="less">
@import "./style.less";
</style>
