/** Iterative traversal avoids stack overflow on deeply nested JSON. */
export function sanitize(value) {
  const replace = value => value === null ? null : typeof value === 'string' ? 'string' : typeof value === 'number' ? 0 : typeof value === 'boolean' ? false : Array.isArray(value) ? [] : {};
  const result = replace(value);
  const pending = value !== null && typeof value === 'object' ? [[value, result]] : [];
  while (pending.length) {
    const [source, target] = pending.pop();
    for (const key of Object.keys(source)) {
      const child = source[key];
      const replacement = replace(child);
      // Define own properties so keys such as __proto__ remain ordinary JSON keys.
      Object.defineProperty(target, key, {value: replacement, enumerable: true, writable: true, configurable: true});
      if (child !== null && typeof child === 'object') pending.push([child, replacement]);
    }
  }
  return result;
}

export function jsonPath(path) {
  return '$' + path.map(key => typeof key === 'number' ? `[${key}]` : `[${JSON.stringify(key)}]`).join('');
}

// A selected container retains its complete subtree. Unselected array items are removed.
export function retainPaths(value, paths) {
  const root = {children: new Map()};
  for (const path of paths) {
    let node = root;
    for (const key of path) {
      if (!node.children.has(key)) node.children.set(key, {children: new Map()});
      node = node.children.get(key);
    }
    node.keep = true;
  }
  if (!paths.length) throw new Error('Select at least one value.');
  function visit(value, node) {
    if (node.keep) return value;
    const result = Array.isArray(value) ? [] : {};
    for (const key of Object.keys(value)) {
      const child = node.children.get(Array.isArray(value) ? Number(key) : key);
      if (!child) continue;
      const kept = visit(value[key], child);
      if (Array.isArray(result)) result.push(kept);
      else Object.defineProperty(result, key, {value: kept, enumerable: true, writable: true, configurable: true});
    }
    return result;
  }
  return visit(value, root);
}
