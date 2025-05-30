export { default as SchemaView } from './components/schemaView.vue'

import scalarView from './components/scalarView.vue'
import boolView from './components/boolView.vue'
import dateView from './components/dateView.vue'
import enumView from './components/enumView.vue'
import arrayView from './components/arrayView.vue'
import structView from './components/structView.vue'
import rangeDateView from './components/rangeDateView.vue'
import tableView from './components/tableView.vue'
import { regBaseSchemaTypeView, regSchemaTypeView } from './schemaView'
import { ArrayNode, NS_SYSTEM_BOOL, NS_SYSTEM_DATE, NS_SYSTEM_FULLDATE, NS_SYSTEM_RANGEDATE, NS_SYSTEM_RANGEFULLDATE, NS_SYSTEM_RANGEMONTH, NS_SYSTEM_RANGEYEAR, NS_SYSTEM_YEAR, NS_SYSTEM_YEARMONTH, SchemaType } from 'schema-node'

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
