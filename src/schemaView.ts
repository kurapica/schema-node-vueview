import { ArrayNode, ArrayType, DataNode, IValueTypeAccess, NodeType, ScalarType, SCHEMA_KIND_BOOL, SCHEMA_KIND_DATE, SCHEMA_KIND_DECIMAL, SCHEMA_KIND_ENUM, SCHEMA_KIND_INT, SCHEMA_KIND_STRING, StructType } from "schema-node-core"
import { SchemaNodeFormType } from "./enum/formType"

export const DEFAULT_SKIN = "default"
const baseSchemaViews: {
    [key: string]: {
        view: any,
        resolve?: (node: DataNode, skin?: string) => any,
        customResolve?: (node: DataNode, skin?: string) => any
    }
} = {}
const schemaViews: { [key: string]: { [key: string]: any } } = {};
const simpleType: string[] = [SCHEMA_KIND_ENUM, SCHEMA_KIND_INT, SCHEMA_KIND_DECIMAL, SCHEMA_KIND_BOOL, SCHEMA_KIND_STRING, SCHEMA_KIND_DATE];
const singleView = new Set<string>()

/**
 * if node is single node or use a special schema view
 */
export function useSingleView(node: IValueTypeAccess, skinName: string = DEFAULT_SKIN) {
  const key = `${node.name.toLowerCase()}-${skinName.toLowerCase()}`
  if (singleView.has(key)) return true
  if (node instanceof StructType)
    return !(!schemaViews[node.name.toLowerCase()] || node.getFields().some(f => f.type instanceof StructType || f.type instanceof ArrayType));
  else if (node instanceof ArrayType)
    return simpleType.includes(node.element!.name);
  return true;
}

/**
 * gets the form type of the sub node
 */
export function getSubNodeFormType(node: DataNode, type?: SchemaNodeFormType, skinName: string = DEFAULT_SKIN) {
    return useSingleView(node.type, skinName) || node instanceof ArrayNode
        ? SchemaNodeFormType.Nest
        : type === SchemaNodeFormType.ExpandAll
            ? SchemaNodeFormType.ExpandAll
            : type
                ? SchemaNodeFormType.Nest
                : SchemaNodeFormType.None
}

/**
 * register view as default for any node of the given schema type
 */
export function regBaseSchemaTypeView(type: string, view?: any, resolve?: (node: DataNode, skin?: string) => any) {
    const map = baseSchemaViews[type]
    if (map) {
        // override the default
        if (view) map.view = view
        if (resolve) map.customResolve = resolve
    }
    else {
        baseSchemaViews[type] = { view, resolve }
    }
}

/**
 * Register the skin view for specific type
 */
export function regSchemaTypeView(type: string, view: any, skinName: string = DEFAULT_SKIN, asSingle: boolean = false) {
    type = type.toLowerCase()
    skinName = skinName.toLowerCase()
    schemaViews[type] = schemaViews[type] || {}
    schemaViews[type][skinName] = view
    const key = `${type}-${skinName}`
    if (asSingle) 
        singleView.add(key)
    else
        singleView.delete(key)
}

/**
 * Gets the view for the given schema node and skin
 */
export function getSchemaTypeView(node: DataNode, skinName: string = DEFAULT_SKIN) {
    // try registered view
    const template = getSchemaTypeViewBySchema(node.type, skinName)
    if (template) return template
    
    // Try base view
    const baseMap = baseSchemaViews[node.type.name]
    if (!baseMap) return undefined
    return baseMap.customResolve && baseMap.customResolve(node, skinName) ||
        baseMap.resolve && baseMap.resolve(node, skinName) ||
        baseMap.view
}

function getSchemaTypeViewBySchema(schema: IValueTypeAccess, skinName: string = DEFAULT_SKIN): any | undefined {
    skinName = skinName.toLowerCase()
    const type = schema.name.toLowerCase()
    const maps = schemaViews[type]
    let template = maps ? (maps[skinName] || maps["default"]) : undefined
    if (template) return template

    if (schema instanceof ScalarType)
      return schema.baseType ? getSchemaTypeViewBySchema(schema.baseType, skinName) : undefined
    return undefined;
}