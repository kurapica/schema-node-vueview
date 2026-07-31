import { DataNode, OverrideType, StructNode, StructType } from "schema-node-core"

/**
 * Get a field node by name from a struct node.
 * schema-node-core's StructNode exposes fields as an iterable but has no getField(),
 * so this helper resolves the live DataNode for a given field name.
 */
export function getField(node: DataNode | null | undefined, name: string): DataNode | undefined {
  if (!node) return undefined
  const struct = node as StructNode
  if (!struct.fields) return undefined
  for (const f of struct.fields) {
    if (f.name === name) return f
  }
  return undefined
}

/**
 * Whether a struct field's type can be overridden at runtime.
 * In the 3rd-refactor core, a field is changeable when the struct type declares
 * an OverrideType relation targeting it.
 */
export function isFieldChangable(node: DataNode, fieldName: string): boolean {
  const type = node.type as StructType
  const fn = type?.getRelationsForField
  if (!fn) return false
  for (const rel of fn.call(type, fieldName)) {
    if (rel.propertyCtor === OverrideType) return true
  }
  return false
}
