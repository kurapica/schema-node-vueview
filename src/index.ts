export { regBaseSchemaTypeView, regSchemaTypeView } from './schemaView'
export * from './utility/locale'

import { ArrayType, DataNode, EnumArrayNode, EnumType, EnumValueType, NS_SYSTEM_LOCALE_STRING, NS_SYSTEM_RANGE_DATE, NS_SYSTEM_RANGE_FULL_DATE, NS_SYSTEM_RANGE_MONTH, NS_SYSTEM_RANGE_YEAR, NS_SYSTEM_YEAR, SCHEMA_KIND_ARRAY, SCHEMA_KIND_BOOL, SCHEMA_KIND_DATE, SCHEMA_KIND_DECIMAL, SCHEMA_KIND_ENUM, SCHEMA_KIND_INT, SCHEMA_KIND_OBJECT, SCHEMA_KIND_STRING, SCHEMA_KIND_STRUCT, StructType } from 'schema-node-core'

import schemaView from './schemaView.vue'
import arrayView from './components/arrayView.vue'
import boolView from './components/boolView.vue'
import dateView from './components/dateView.vue'
import flagsEnumView from './components/flagEnumView.vue'
import inputView from './components/inputView.vue'
import localstringView from "./components/localstringView.vue"
import anyView from './components/objectView.vue'
import rangeDateView from './components/rangeDateView.vue'
import structFieldView from './components/structFieldView.vue'
import structView from './components/structView.vue'
import tableView from './components/tableView.vue'
import { type App } from 'vue'
import { getSubNodeFormType, regBaseSchemaTypeView, regSchemaTypeView, useSingleView } from './schemaView'

import { SchemaNodeFormType } from './enum/formType'

export { SchemaNodeFormType, schemaView, structFieldView, getSubNodeFormType }

// base view
regBaseSchemaTypeView(SCHEMA_KIND_INT, inputView)
regBaseSchemaTypeView(SCHEMA_KIND_STRING, inputView)
regBaseSchemaTypeView(SCHEMA_KIND_DECIMAL, inputView)
regBaseSchemaTypeView(SCHEMA_KIND_ENUM, inputView, (node: DataNode, skin?: string) => {
  if ((node.type as EnumType).type === EnumValueType.Flags) return flagsEnumView
  return undefined;
})
regBaseSchemaTypeView(SCHEMA_KIND_STRUCT, structView)
regBaseSchemaTypeView(SCHEMA_KIND_ARRAY, arrayView, (node: DataNode, skin?: string) => {
  if (node instanceof EnumArrayNode) return inputView;
  if ((node.type as ArrayType).element instanceof StructType && !useSingleView((node.type as ArrayType).element!, skin)) return tableView
  return undefined;
})
regBaseSchemaTypeView(SCHEMA_KIND_OBJECT, anyView)
regBaseSchemaTypeView(SCHEMA_KIND_BOOL, boolView)
regBaseSchemaTypeView(SCHEMA_KIND_DATE, dateView)

// type view
regSchemaTypeView(NS_SYSTEM_YEAR, dateView)
regSchemaTypeView(NS_SYSTEM_RANGE_YEAR, rangeDateView)
regSchemaTypeView(NS_SYSTEM_RANGE_MONTH, rangeDateView)
regSchemaTypeView(NS_SYSTEM_RANGE_DATE, rangeDateView)
regSchemaTypeView(NS_SYSTEM_RANGE_FULL_DATE, rangeDateView)
regSchemaTypeView(NS_SYSTEM_LOCALE_STRING, localstringView, undefined, true)

schemaView.install = (app: App): void => { 
  app.component("SchemaView", schemaView)
  app.component("StructFieldView", structFieldView)
}

// default
// export default schemaView