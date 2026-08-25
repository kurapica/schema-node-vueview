<template>
  <el-form-item :key="node?.id" :prop="node?.access" :error="error" :rules="shouldShowError ? rule : undefined"
    v-bind="noLabel ? { labelWidth: '0px' } : {}">
    <template v-if="!noLabel" #label>
      <el-tooltip v-if="node.getPropertyValue<LocaleString>(Description)?.key" class="item" :content="_L(node.getPropertyValue<LocaleString>(Description))">
        <span>
          <span v-if="node?.require" style="color: #f56c6c; font-size: 14px"> * </span>
          {{ _L(node.getPropertyValue<LocaleString>(Display)?.key ? node.getPropertyValue<LocaleString>(Display) : node.name) }}
          {{ debug ? `(${node.name})` : '' }}
        </span>
      </el-tooltip>
      <span v-else>
        <span v-if="node?.require" style="color: #f56c6c; font-size: 14px"> * </span>
        {{ _L(node.getPropertyValue<LocaleString>(Display)?.key ? node.getPropertyValue<LocaleString>(Display) : node.name) }}
        {{ debug ? `(${node.name})` : '' }}
      </span>
    </template>
    <slot name="pre" :node="node"></slot>
    <slot :node="node">
      <schema-view v-if="useSingleView(node.type, skin)" :node="node" :skin="skin" :debug="debug" v-bind="$attrs" :readonly="readonly">
      </schema-view>
      <schema-view v-else :node="node" :instantValid="instantValid" :debug="debug"
        :in-form="inForm === SchemaNodeFormType.ExpandAll ? SchemaNodeFormType.ExpandAll : SchemaNodeFormType.Expand"
        :skin="skin" v-bind="$attrs" :readonly="readonly">
      </schema-view>
    </slot>
    <slot name="tail" :node="node"><span></span></slot>
  </el-form-item>
</template>

<script lang="ts" setup>
import schemaView from '../schemaView.vue'
import { ref, onUnmounted, onMounted, toRaw } from 'vue'
import { useSingleView } from '../schemaView'
import { SchemaNodeFormType } from '../enum/formType'
import { _L } from '../utility/locale'
import { DataNode, Description, Display, LocaleString } from 'schema-node-core'
import { ElFormItem } from 'element-plus'

// ── Template ──────────────────────────────────────────────────────
const props = defineProps<{
  /** The schema node */
  node: DataNode,

  /** The inform settings */
  inForm?: SchemaNodeFormType,

  /** Don't display the form label */
  noLabel?: boolean

  /** The skin */
  skin?: string
  
  /** The readonly mode */
  readonly?: boolean

  /** instant validate the value */
  instantValid?: boolean

  /** Debug mode */
  debug?: boolean
}>()
const node = toRaw(props.node)

// ── UI State ──────────────────────────────────────────────────────
/** Show error of form view */
const showError = ref(false)

/** Should show error of form view */
const shouldShowError = ref(false)

/** Error of form view */
const error = ref<string | undefined>(undefined)

/** Rule of form view */
const rule = {
  trigger: 'blur',
  validator: function (rule: any, value: any, callback: Function) {
    node.isValid ? callback() : callback(node.error)
    showError.value = true
    error.value = node.error
  }
}

// ── Life Cycle ────────────────────────────────────────────────────
/** Subscription of form view */
let stateWatcher: Function | null = null

onMounted(() => {
  shouldShowError.value = node && !node.readonly && useSingleView(node.type, props.skin) || false
  showError.value = shouldShowError.value && (node.changed || props.instantValid)

  if (shouldShowError.value) {
    stateWatcher = node.subscribeViolated(() => {
      if (node.changed) showError.value = true
      if (showError.value)
        error.value = node.error || undefined
    }, true)
  }
})

onUnmounted(() => {
  if (stateWatcher) stateWatcher()
})
</script>