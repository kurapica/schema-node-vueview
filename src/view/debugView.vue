<template>
  <el-popover
    ref="popoverRef"
    placement="left"
    width="800"
    trigger="hover"
    :onShow="show"
    :onHide="hide" :boundaries-padding="10">
    <p v-if="access?.length">
      <template v-for="(item, index) in access" :key="item.part">
        <span v-if="index > 0">/</span>
        <a href="javascript:void(0);" v-if="item.node" @click="toNode(item.node)">{{ item.part }}</a>
        <span v-else>{{ item.part }}</span>
      </template>
      <span> ({{ node.type.name }})</span>
      <span> - {{ node.id }}</span>
    </p>
    <el-divider></el-divider>
    <el-table :data="nodeProps">
      <el-table-column width="120" property="name" :label="_L['frontend.view.property']"></el-table-column>
      <el-table-column width="480" property="value" :label="_L['frontend.view.value']"></el-table-column>
      <el-table-column width="200" property="source" :label="_L['frontend.view.source']"></el-table-column>
    </el-table>
    <el-divider></el-divider>
    <el-table :data="nodeRelations">
      <el-table-column width="120" property="property" :label="_L['frontend.view.property']"></el-table-column>
      <el-table-column width="80" property="mode" :label="_L['system.schema.relation.kind']"></el-table-column>
      <el-table-column width="400" property="data" :label="_L['system.schema.relation.schema']"></el-table-column>
    </el-table>
    <template #reference>
      <div class="schema-node-debug">
        <slot />
        <span @click="logNode" class="debug-mark">🐞</span>
      </div>
    </template>
  </el-popover>
</template>

<script setup lang="ts">
import { DataNode, getPropertyName, IProperty, isEmpty, RelationType, SCHEMA_KIND_NODE } from 'schema-node-core';
import { nextTick, onMounted, ref, toRaw } from 'vue'
import { _L } from '../utility/locale';
import { ElPopover } from 'element-plus';

const props = defineProps({ node: DataNode });
const nodeProps = ref<{ name: string, value: any, source: string }[]>([])
const nodeRelations = ref<{ property: string, mode: string, data: any }[]>([])
const access = ref<{ part: string, node?: DataNode }[]>()
const popoverRef = ref<InstanceType<typeof ElPopover>>()

let node = toRaw(props.node)!
let originNode = node

const show = async () => {
  const newAccess: { part: string, node?: DataNode }[] = [ { part: node.access } ]

  let currentNode: DataNode | undefined= node
  while (currentNode?.parent instanceof DataNode) {
    currentNode = currentNode.parent
    newAccess.unshift({ part: currentNode.access, node: currentNode })
    if (newAccess[0].part.length) {
      if (newAccess[1].part.startsWith(newAccess[0].part)) {
        newAccess[1].part = newAccess[1].part.substring(newAccess[0].part.length)
        if (newAccess[1].part.startsWith('.')) newAccess[1].part = newAccess[1].part.substring(1)
      }
    }
    else
      newAccess[0].part = '$parent'
  }
  access.value = newAccess

  const result: { name: string, value: any, source: string }[] = []
  for (const prop of node.filterProperties(v => true)) {
    if (prop.forSchema(SCHEMA_KIND_NODE)) continue;
    const value = prop.getValue();
    if (!isEmpty(value))
      result.push({ name: prop.name, value: Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value, source: getSource(prop) });
  }
  result.sort((a, b) => a.name == 'name' ? -1 : b.name == 'name' ? 1 : a.name.localeCompare(b.name));
  nodeProps.value = result;

  nodeRelations.value = Array.from(node.getAttachedRelations()).map(r => ({ property: getPropertyName(r.propertyCtor!), mode: (r as RelationType).kind, data: JSON.stringify((r as RelationType).schema[(r as RelationType).kind]) }));

  await nextTick();
  popoverRef.value?.popperRef?.popperInstanceRef?.update();
}

const getSource = (prop: IProperty) => {
  return prop.source && prop.source != node ? prop.source.access : ''
}

const toNode = (to: DataNode) => {
  node = to
  show()
}

const hide = () => {
  node = originNode
  nodeProps.value = []
  nodeRelations.value = []
}

const logNode = () => {
  console.log("log node", node.access, node)
}

onMounted(() => {})
</script>

<style lang="scss" scoped>
.schema-node-debug {
  position: absolute;
  align-items: center;
  left: -20px;
  top: 0px;
  z-index: 99;
}
.debug-mark {
  margin-left: 5px;
}
</style>