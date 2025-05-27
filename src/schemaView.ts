import { AnySchemaNode } from "schema-node"

export const DEFAULT_SKIN = "default"

const baseSchemaViews: {[key:string]: any } = {}
const schemaViews: {[key:string]: {[key:string]: any} } = {}

/**
 * is single node
 */
export function isSingleNode(typeNode: AnySchemaNode)
{
  return typeNode.dataNodeType === NamespaceType.Scalar
  || typeNode.dataNodeType === NamespaceType.Enum
  || (typeNode.dataNodeType === NamespaceType.Array && [NamespaceType.Scalar, NamespaceType.Enum].includes((typeNode as unknown as ArrayDataNode).baseType))
  || (typeNode.dataNodeType === NamespaceType.Struct && rangeTypes.includes(typeNode.type))
}

/**
 * 获取内部元素用Form类型
 */
export function getInnerFormType(node: ITypeDataNode, type?: DataNodeFormType)
{
  return node && type && isSingleNode(node)
    ? DataNodeFormType.Nest
    : type === DataNodeFormType.ExpandAll
      ? DataNodeFormType.ExpandAll
      : type
        ? DataNodeFormType.Nest
        : DataNodeFormType.None
}

/**
 * 注册基本的数据类型对应模板或提供模板的处理函数
 * @param type
 * @param view
 * @param resolve
 */
export function registerBaseDataNodeTypeView(type: NamespaceType, view?: any, resolve?: Function)
{
  const map = baseTypeViewMap[type]
  if (map)
  {
    if (view) map.view = view
    if (resolve) map.customResolve = resolve
  }
  else
  {
    baseTypeViewMap[type] = { view, resolve }
  }
}

/**
 * 注册特殊类型视图模板映射，可同时指定皮肤名，一个类型可以具有多个皮肤视图，使用时可指定皮肤名称
 * @param type 数据字典类型
 * @param view 视图
 * @param skinName? 皮肤名，默认default
 */
export function registerDataNodeTypeView(type: string, view: any, skinName: string = "default")
{
  skinName = skinName.toLowerCase()
  typeViewMap[type] = typeViewMap[type] || {}
  typeViewMap[type][skinName] = view
}

/**
 * 获取指定数据节点或数据类型对应皮肤的视图模板
 * @param node 数据节点或节点类型
 * @param skinName 皮肤名，默认default
 */
export function getDataNodeTypeView(node: ITypeDataNode, skinName: string = "default", specialOnly?: boolean)
{
  // 获取指定模板
  skinName = skinName.toLowerCase()
  const maps = typeViewMap[node.type]
  let template = maps ? (maps[skinName] || maps["default"]) : null
  if (template || specialOnly) return template

  // 获取基础模板
  const baseMap = node.dataNodeType ? baseTypeViewMap[node.dataNodeType] : null
  if (baseMap)
  {
    return baseMap.customResolve && baseMap.customResolve(node, skinName) ||
      baseMap.resolve && baseMap.resolve(node, skinName) ||
      baseMap.view
  }
}
