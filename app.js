import { sanitize, retainPaths, jsonPath, valueTree, selectBranch, selectionStates, searchValues } from './sanitizer.mjs';
const input = document.querySelector('#input');
const output = document.querySelector('#output');
const status = document.querySelector('#status');
let current;
let entries = [];
const rows = new Map();
const collapsed = new Set();
const search = document.querySelector('#search-values');
const selected = new Map();
const selection = document.querySelector('#selection');
function resetSelection() { current = undefined; entries = []; rows.clear(); collapsed.clear(); search.value = ''; selected.clear(); selection.hidden = true; document.querySelector('#tree').replaceChildren(); }
function message(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
input.addEventListener('input', () => { output.value = ''; resetSelection(); message(''); });
document.querySelector('#sanitize').addEventListener('click', () => {
  output.value = ''; resetSelection();
  if (!input.value.trim()) return message('Paste some JSON to get started.', true);
  try {
    current = sanitize(JSON.parse(input.value));
    output.value = JSON.stringify(current, null, 2);
    renderValues();
    message('Sanitized. Keys, structure, and value types preserved.');
  } catch (error) { message(`Unable to sanitize JSON: ${error.message}`, true); }
});
document.querySelector('#example').addEventListener('click', () => {
  input.value = JSON.stringify({user: {name: 'Alex Morgan', email: 'alex@example.com', age: 34, active: true}, tags: ['customer', 'newsletter'], orders: [{id: 2048, total: 49.95}], deletedAt: null}, null, 2);
  output.value = ''; resetSelection(); message('Example loaded. Select Sanitize JSON to replace its values.');
});
document.querySelector('#clear').addEventListener('click', () => { input.value = ''; output.value = ''; resetSelection(); message('Cleared.'); input.focus(); });
document.querySelector('#copy').addEventListener('click', async () => {
  if (!output.value) return message('Sanitize JSON before copying.', true);
  try { await navigator.clipboard.writeText(output.value); message('Output copied to clipboard.'); }
  catch { output.focus(); output.select(); message('Clipboard unavailable. Output selected; use your keyboard to copy.', true); }
});
document.querySelector('#download').addEventListener('click', () => {
  if (!output.value) return message('Sanitize JSON before downloading.', true);
  const url = URL.createObjectURL(new Blob([output.value + '\n'], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = 'sanitized.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); message('Downloaded sanitized.json.');
});

function updateCount() {
  const states = selectionStates(entries, selected);
  let included = 0;
  for (const entry of entries) {
    const state = states.get(entry.key);
    const { check, row, item, badge } = rows.get(entry.key);
    check.checked = state.checked;
    check.indeterminate = state.included && !state.checked;
    row.classList.toggle('kept', state.checked);
    row.classList.toggle('ancestor', state.included && !state.checked);
    item.classList.toggle('included', state.included);
    badge.textContent = state.checked ? 'Kept' : state.included ? 'Parent path' : '';
    badge.hidden = !state.included;
    if (state.included) included++;
  }
  document.querySelector('#count').textContent = ` · ${included} included`;
  document.querySelector('#trim').disabled = !selected.size;
}
function filterValues() {
  const visible = searchValues(entries, search.value);
  const searching = !!search.value.trim();
  for (const [key, { item, children, toggle }] of rows) {
    item.hidden = !visible.has(key);
    if (children) {
      const expanded = searching || !collapsed.has(key);
      children.hidden = !expanded;
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? '▾' : '▸';
      toggle.disabled = searching;
    }
  }
  document.querySelector('#no-matches').hidden = visible.size > 0;
}
search.addEventListener('input', filterValues);
function renderValues() {
  selection.hidden = false;
  selected.clear();
  rows.clear();
  collapsed.clear();
  search.value = '';
  entries = valueTree(current);
  document.querySelector('#path-fallback').hidden = true;
  const tree = document.querySelector('#tree'); tree.replaceChildren();
  const rootList = document.createElement('ul'); rootList.className = 'tree-root'; tree.append(rootList);
  for (const entry of entries) {
    const { value, path, key } = entry;
    const container = value !== null && typeof value === 'object';
    const row = document.createElement('div'); row.className = 'value-row';
    const item = document.createElement('li'); item.className = 'tree-item';
    const children = entry.children.length ? document.createElement('ul') : null;
    if (children) { children.className = 'tree-children'; children.id = `branch-${rows.size}`; }
    const toggle = document.createElement(children ? 'button' : 'span'); toggle.className = 'branch-toggle';
    if (children) {
      toggle.type = 'button';
      toggle.setAttribute('aria-label', `Expand or collapse ${jsonPath(path)}`);
      toggle.setAttribute('aria-controls', children.id);
      toggle.addEventListener('click', () => {
        if (collapsed.has(key)) collapsed.delete(key); else collapsed.add(key);
        filterValues();
      });
    } else toggle.setAttribute('aria-hidden', 'true');
    const label = document.createElement('label');
    const check = document.createElement('input'); check.type = 'checkbox';
    const badge = document.createElement('span'); badge.className = 'selection-badge'; badge.hidden = true;
    rows.set(key, { row, check, item, children, toggle, badge });
    check.setAttribute('aria-label', `Keep ${jsonPath(path)}`);
    check.addEventListener('change', () => { selectBranch(entry, selected, check.checked); updateCount(); });
    const text = document.createElement('code'); text.textContent = !path.length ? '$' : typeof path.at(-1) === 'number' ? `[${path.at(-1)}]` : JSON.stringify(path.at(-1));
    text.title = jsonPath(path);
    const preview = document.createElement('small'); preview.textContent = container ? (Array.isArray(value) ? `Array (${value.length})` : 'Object') : JSON.stringify(value);
    label.append(check, text, preview);
    const copy = document.createElement('button'); copy.textContent = 'Copy path'; copy.setAttribute('aria-label', `Copy path ${jsonPath(path)}`);
    copy.addEventListener('click', async () => {
      const pathText = jsonPath(path);
      try { await navigator.clipboard.writeText(pathText); message('Path copied.'); }
      catch { const fallback = document.querySelector('#path-fallback'); fallback.hidden = false; fallback.value = pathText; fallback.focus(); fallback.select(); message('Path selected; use your keyboard to copy.', true); }
    });
    row.append(toggle, label, badge, copy); item.append(row);
    if (children) item.append(children);
    (entry.parent ? rows.get(entry.parent.key).children : rootList).append(item);
  }
  updateCount();
  filterValues();
}
document.querySelector('#expand-all').addEventListener('click', () => { collapsed.clear(); filterValues(); });
document.querySelector('#collapse-all').addEventListener('click', () => {
  for (const entry of entries) if (entry.parent && entry.children.length) collapsed.add(entry.key);
  filterValues();
});
document.querySelector('#select-all').addEventListener('click', () => {
  selectBranch(entries[0], selected, true);
  updateCount();
});
document.querySelector('#select-none').addEventListener('click', () => {
  selected.clear();
  updateCount();
});
document.querySelector('#trim').addEventListener('click', () => {
  try {
    const next = retainPaths(current, [...selected.values()]);
    const serialized = JSON.stringify(next, null, 2);
    current = next; output.value = serialized; renderValues();
    message('Kept selected values. Paths now match the output.');
  } catch (error) { message(error.message, true); }
});
