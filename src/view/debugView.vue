<template>
  <el-popover
    placement="bottom"
    width="800"
    trigger="hover"
    :onShow="show"
    :onHide="hide">
    <pre>{{ node.access ?? '' }} ({{ node.type.name }})</pre>
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
        <span class="debug-mark">🐞</span>
      </div>
    </template>
  </el-popover>
</template>

<script setup lang="ts">
import { DataNode, getPropertyName, isEmpty, RelationType, SCHEMA_KIND_NODE } from 'schema-node-core';
import { onMounted, ref, toRaw } from 'vue'
import { _L } from '../utility/locale';

const props = defineProps({ node: DataNode });
const nodeProps = ref<{ name: string, value: any, source: string }[]>([])
const nodeRelations = ref<{ property: string, mode: string, data: any }[]>([])

const node = toRaw(props.node)!

const show = () => {
  const result: { name: string, value: any, source: string }[] = []
  for (const prop of node.filterProperties(v => true)) {
    if (prop.forSchema(SCHEMA_KIND_NODE)) continue;
    const value = prop.getValue();
    if (!isEmpty(value))
      result.push({ name: prop.name, value: Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value, source: (prop.source as DataNode)?.access ?? '' })
  }
  result.sort((a, b) => a.name == 'name' ? -1 : b.name == 'name' ? 1 : a.name.localeCompare(b.name))
  nodeProps.value = result

  nodeRelations.value = Array.from(node.getAttachedRelations()).map(r => ({ property: getPropertyName(r.propertyCtor!), mode: (r as RelationType).kind, data: JSON.stringify((r as RelationType).schema[(r as RelationType).kind]) }))
}

const hide = () => {
  nodeProps.value = []
  nodeRelations.value = []
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