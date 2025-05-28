import { AnySchemaNode, ArrayNode, EnumNode, getSchema, ISchemaConfig, ScalarNode, SchemaType, StructNode } from "schema-node"
import { SchemaNodeFormType } from "./formType"

export const DEFAULT_SKIN = "default"
const baseSchemaViews: {
    [key: string]: {
        view: any,
        resolve?: Function,
        customResolve?: Function
    }
} = {}
const schemaViews: { [key: string]: { [key: string]: any } } = {}

/**
 * if node is single node or use a special schema view
 */
export function useSingleView(node: AnySchemaNode) {
    return node.schemaType === SchemaType.Scalar || node.schemaType === SchemaType.Enum
        || (node.schemaType === SchemaType.Struct && schemaViews[node.schemaName.toLowerCase()] && true || false)
        || (node instanceof ArrayNode && (node.asSingleValue || [SchemaType.Scalar, SchemaType.Enum].includes(node.elementSchemaInfo.type)))
}

/**
 * gets the form type of the sub node
 */
export function getSubNodeFormType(node: AnySchemaNode, type?: SchemaNodeFormType) {
    return useSingleView(node)
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
export function regBaseSchemaTypeView(type: SchemaType, view?: any, resolve?: Function) {
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
export function regiSchemaTypeView(type: string, view: any, skinName: string = DEFAULT_SKIN) {
    type = type.toLowerCase()
    schemaViews[type] = schemaViews[type] || {}
    schemaViews[type][skinName.toLowerCase()] = view
}

/**
 * Gets the view for the given schema node and skin
 */
export function getSchemaTypeView(node: AnySchemaNode, skinName: string = DEFAULT_SKIN) {
    skinName = skinName.toLowerCase()
    const type = node.schemaName.toLowerCase()
    const maps = schemaViews[type]
    let template = maps ? (maps[skinName] || maps["default"]) : undefined
    if (template) return template

    // Try base view
    const baseMap = baseSchemaViews[node.schemaType]
    return baseMap.customResolve && baseMap.customResolve(node, skinName) ||
        baseMap.resolve && baseMap.resolve(node, skinName) ||
        baseMap.view
}

export async function getSchemaNode(config: ISchemaConfig, data: any) {
    const schemaInfo = await getSchema(config.type)
    if (!schemaInfo) return undefined
    let node: AnySchemaNode | undefined = undefined

    switch(schemaInfo.type)
    {
        case SchemaType.Scalar:
            node = new ScalarNode(config, data)
            break
        case SchemaType.Enum:
            node = new EnumNode(config, data)
            break
        case SchemaType.Struct:
            node = new StructNode(config, data)
            break
        case SchemaType.Array:
            node = new ArrayNode(config, data)
            break
    }

    return node
}