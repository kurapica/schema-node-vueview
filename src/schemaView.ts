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
const singleView = new Set<string>()

/**
 * if node is single node or use a special schema view
 */
export function useSingleView(node: INodeSchema, skinName: string = DEFAULT_SKIN) {
    const key = `${node.name.toLowerCase()}-${skinName.toLowerCase()}`
    if (singleView.has(key)) return true
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
export function getSubNodeFormType(node: AnySchemaNode, type?: SchemaNodeFormType, skinName: string = DEFAULT_SKIN) {
    return useSingleView(node.schema, skinName) || node instanceof ArrayNode
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
export function getSchemaTypeView(node: AnySchemaNode, skinName: string = DEFAULT_SKIN) {
    // try registered view
    const template = getSchemaTypeViewBySchema(node.schema, skinName)
    if (template) return template
    
    // Try base view
    const baseMap = baseSchemaViews[node.schemaType]
    return baseMap.customResolve && baseMap.customResolve(node, skinName) ||
        baseMap.resolve && baseMap.resolve(node, skinName) ||
        baseMap.view
}

function getSchemaTypeViewBySchema(schema: INodeSchema, skinName: string = DEFAULT_SKIN) {
    skinName = skinName.toLowerCase()
    const type = schema.name.toLowerCase()
    const maps = schemaViews[type]
    let template = maps ? (maps[skinName] || maps["default"]) : undefined
    if (template) return template

    switch(schema.type)
    {
        case SchemaType.Scalar:
            if (schema.scalar?.base)
                return getSchemaTypeViewBySchema(getCachedSchema(schema.scalar.base)!, skinName)
            break
        case SchemaType.Struct:
            if (schema.struct?.base)
            {
                // If same fields count, use base struct view
                const baseSchema = getCachedSchema(schema.struct.base)
                if (baseSchema && baseSchema.struct?.fields.length === schema.struct.fields.length)
                    return getSchemaTypeViewBySchema(baseSchema, skinName)
            }
            break
    }
}