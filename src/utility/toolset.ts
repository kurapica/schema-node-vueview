import { DataNode, debounce, isNull, OverrideType, Property, PropertyCtor, StructType } from "schema-node-core"

const DEBOUNCE_DELAY = 50;

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

/** Subscribe an ancestor property */
export function subscribeAncestorProperty<T>(node: DataNode, propCtor: new () => Property<T>, callback: (value: Iterable<T>) => void, immediate = false): Function {
  const handler = () => callback(ancestorPropertyGenerator(node, propCtor));
  const delayHandler = debounce(handler, DEBOUNCE_DELAY);
  const subs: Function[] = [];
  let curr: DataNode | null = node;
  while (curr) {
    subs.push(curr.subscribeProperty(propCtor, delayHandler));
    curr = curr.parent instanceof DataNode ? curr.parent : null;
  }
  if (immediate) handler();
  return () => subs.forEach(sub => sub());
}

function ancestorPropertyGenerator<T>(
  node: DataNode,
  propCtor: new () => Property<T>
): Iterable<T> {
  return {
    *[Symbol.iterator]() {
        let curr: DataNode | null = node;
        while (curr) {
            const value = curr.getPropertyValue<T>(propCtor);
            if (!isNull(value)) yield value as T;
            curr = curr.parent instanceof DataNode ? curr.parent : null;
        }
    }
  };
}