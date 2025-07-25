import { AnySchemaNode, ArrayNode, getCachedSchema, INodeSchema, SchemaType, SchemaTypeValue } from "schema-node"
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
const simpleType: SchemaTypeValue[] = [SchemaType.Scalar, SchemaType.Enum]

/**
 * if node is single node or use a special schema view
 */
export function useSingleView(node: INodeSchema) {
    switch(node.type)
    {
        case SchemaType.Enum:
        case SchemaType.Scalar:
            return true
        case SchemaType.Struct:
            if (!schemaViews[node.name.toLowerCase()]) return false
            for(let i = 0; i < (node.struct?.fields?.length || 0); i++)
            {
                const s = getCachedSchema(node.struct!.fields[i].type)
               if (s?.type === SchemaType.Struct) return false
               if (s?.type === SchemaType.Array) return false
            }
            return true
        case SchemaType.Array:
            return node.array!.single || simpleType.includes(getCachedSchema(node.array!.element)!.type)
    }
}

/**
 * gets the form type of the sub node
 */
export function getSubNodeFormType(node: AnySchemaNode, type?: SchemaNodeFormType) {
    return useSingleView(node.schemaInfo) || node instanceof ArrayNode
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
export function regSchemaTypeView(type: string, view: any, skinName: string = DEFAULT_SKIN) {
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