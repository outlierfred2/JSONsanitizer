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

export function valueTree(value) {
  const entries = [];
  const pending = [[value, [], null]];
  while (pending.length) {
    const [value, path, parent] = pending.pop();
    const keys = value !== null && typeof value === 'object' ? Object.keys(value) : [];
    const entry = { value, path, parent, children: [], key: JSON.stringify(path) };
    entries.push(entry);
    if (parent) parent.children.push(entry);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      pending.push([value[key], [...path, Array.isArray(value) ? Number(key) : key], entry]);
    }
  }
  return entries;
}

// Track which explicit selections include each leaf so parent toggles do not
// erase choices made independently on descendants.
const selectionSources = new WeakMap();
export function selectBranch(entry, selected, keep) {
  let sources = selectionSources.get(selected);
  if (!sources) { sources = new Map(); selectionSources.set(selected, sources); }
  for (const key of sources.keys()) if (!selected.has(key)) sources.delete(key);
  for (const key of selected.keys()) if (!sources.has(key)) sources.set(key, new Set([key]));
  const ancestors = new Set();
  for (let node = entry; node; node = node.parent) ancestors.add(node.key);
  const pending = [entry];
  while (pending.length) {
    const node = pending.pop();
    if (node.children.length) {
      for (const child of node.children) pending.push(child);
      continue;
    }
    const origins = sources.get(node.key) || new Set();
    if (keep) origins.add(entry.key);
    else for (const origin of origins) if (ancestors.has(origin)) origins.delete(origin);
    if (origins.size) {
      sources.set(node.key, origins);
      selected.set(node.key, node.path);
    } else {
      sources.delete(node.key);
      selected.delete(node.key);
    }
  }
}

export function selectionStates(entries, selected) {
  const states = new Map();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const children = entry.children.map(child => states.get(child.key));
    const checked = children.length ? children.every(child => child.checked) : selected.has(entry.key);
    const included = checked || children.some(child => child.included);
    states.set(entry.key, { checked, included });
  }
  return states;
}

export function searchValues(entries, query) {
  query = query.trim().toLowerCase();
  const visible = new Set();
  for (const entry of entries) {
    const valueText = entry.value !== null && typeof entry.value === 'object' ? (Array.isArray(entry.value) ? 'array' : 'object') : JSON.stringify(entry.value);
    const text = `${jsonPath(entry.path)} ${entry.path.join('.')} ${valueText}`.toLowerCase();
    if (!query || text.includes(query)) {
      for (let node = entry; node && !visible.has(node.key); node = node.parent) visible.add(node.key);
    }
  }
  return visible;
}
