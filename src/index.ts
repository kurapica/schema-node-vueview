export { regBaseSchemaTypeView, regSchemaTypeView } from './schemaView'
export * from './locale'

import { ArrayNode, NS_SYSTEM_BOOL, NS_SYSTEM_DATE, NS_SYSTEM_FULLDATE,  NS_SYSTEM_RANGEDATE, NS_SYSTEM_RANGEFULLDATE, NS_SYSTEM_RANGEMONTH, NS_SYSTEM_RANGEYEAR, NS_SYSTEM_YEAR, NS_SYSTEM_YEARMONTH, SchemaType } from 'schema-node'

import schemaView from './components/schemaView.vue'
import scalarView from './components/scalarView.vue'
import boolView from './components/boolView.vue'
import dateView from './components/dateView.vue'
import enumView from './components/enumView.vue'
import arrayView from './components/arrayView.vue'
import structView from './components/structView.vue'
import rangeDateView from './components/rangeDateView.vue'
import tableView from './components/tableView.vue'
import { App } from 'vue'
import { regBaseSchemaTypeView, regSchemaTypeView } from './schemaView'
import structFieldView from './components/structFieldView.vue'
import { SchemaNodeFormType } from './formType'

export { SchemaNodeFormType, schemaView, scalarView, boolView, dateView, enumView, arrayView, structView, rangeDateView, tableView, structFieldView }

// base view
regBaseSchemaTypeView(SchemaType.Scalar, scalarView)
regBaseSchemaTypeView(SchemaType.Enum, enumView)
regBaseSchemaTypeView(SchemaType.Struct, structView)
regBaseSchemaTypeView(SchemaType.Array, arrayView, (node: ArrayNode, skin: string) => {
    if (node.elementSchemaInfo.type === SchemaType.Struct) return tableView
})

// type view
regSchemaTypeView(NS_SYSTEM_BOOL, boolView)
regSchemaTypeView(NS_SYSTEM_YEAR, dateView)
regSchemaTypeView(NS_SYSTEM_YEARMONTH, dateView)
regSchemaTypeView(NS_SYSTEM_DATE, dateView)
regSchemaTypeView(NS_SYSTEM_FULLDATE, dateView)
regSchemaTypeView(NS_SYSTEM_RANGEYEAR, rangeDateView)
regSchemaTypeView(NS_SYSTEM_RANGEMONTH, rangeDateView)
regSchemaTypeView(NS_SYSTEM_RANGEDATE, rangeDateView)
regSchemaTypeView(NS_SYSTEM_RANGEFULLDATE, rangeDateView)

schemaView.install = (app: App): void => { 
    app.component("SchemaView", schemaView)
    app.component("StructFieldView", structFieldView)
}

// default
export default schemaView