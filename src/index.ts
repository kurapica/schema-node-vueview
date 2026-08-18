export { regBaseSchemaKindView, regSchemaTypeView } from './schemaView'
export * from './utility/locale'
export * from './utility/logger'

import { ArrayType, DataNode, EnumArrayNode, EnumType, EnumValueType, NS_SYSTEM_LOCALE_STRING, NS_SYSTEM_RANGE_DATE, NS_SYSTEM_RANGE_FULL_DATE, NS_SYSTEM_RANGE_MONTH, NS_SYSTEM_RANGE_YEAR, NS_SYSTEM_YEAR, SCHEMA_KIND_ARRAY, SCHEMA_KIND_BOOL, SCHEMA_KIND_DATE, SCHEMA_KIND_DECIMAL, SCHEMA_KIND_ENUM, SCHEMA_KIND_INT, SCHEMA_KIND_OBJECT, SCHEMA_KIND_STRING, SCHEMA_KIND_STRUCT, StructType } from 'schema-node-core'

import schemaView from './schemaView.vue'
import arrayView from './view/arrayView.vue'
import boolView from './view/boolView.vue'
import dateView from './view/dateView.vue'
import flagsEnumView from './view/flagEnumView.vue'
import inputView from './view/inputView.vue'
import localeStringView from "./view/localeStringView.vue"
import anyView from './view/objectView.vue'
import rangeDateView from './view/rangeDateView.vue'
import structFieldView from './view/structFieldView.vue'
import structView from './view/structView.vue'
import tableView from './view/tableView.vue'
import { type App } from 'vue'
import { getSubNodeFormType, regBaseSchemaKindView, regSchemaTypeView, useSingleView } from './schemaView'

import { SchemaNodeFormType } from './enum/formType'

export { SchemaNodeFormType, schemaView, structFieldView, getSubNodeFormType }

// base view
regBaseSchemaKindView(SCHEMA_KIND_INT, inputView)
regBaseSchemaKindView(SCHEMA_KIND_STRING, inputView)
regBaseSchemaKindView(SCHEMA_KIND_DECIMAL, inputView)
regBaseSchemaKindView(SCHEMA_KIND_ENUM, inputView, (node: DataNode, skin?: string) => {
  if ((node.type as EnumType).type === EnumValueType.Flags) return flagsEnumView
  return undefined;
})
regBaseSchemaKindView(SCHEMA_KIND_STRUCT, structView)
regBaseSchemaKindView(SCHEMA_KIND_ARRAY, arrayView, (node: DataNode, skin?: string) => {
  if (node instanceof EnumArrayNode) return inputView;
  if ((node.type as ArrayType).element instanceof StructType && !useSingleView((node.type as ArrayType).element!, skin)) return tableView
  return undefined;
})
regBaseSchemaKindView(SCHEMA_KIND_OBJECT, anyView)
regBaseSchemaKindView(SCHEMA_KIND_BOOL, boolView)
regBaseSchemaKindView(SCHEMA_KIND_DATE, dateView)

// type view
regSchemaTypeView(NS_SYSTEM_YEAR, dateView)
regSchemaTypeView(NS_SYSTEM_RANGE_YEAR, rangeDateView)
regSchemaTypeView(NS_SYSTEM_RANGE_MONTH, rangeDateView)
regSchemaTypeView(NS_SYSTEM_RANGE_DATE, rangeDateView)
regSchemaTypeView(NS_SYSTEM_RANGE_FULL_DATE, rangeDateView)
regSchemaTypeView(NS_SYSTEM_LOCALE_STRING, localeStringView, undefined, true)

schemaView.install = (app: App): void => { 
  app.component("SchemaView", schemaView)
  app.component("StructFieldView", structFieldView)
}

// default
// export default schemaView