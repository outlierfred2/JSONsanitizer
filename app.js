import { sanitize, retainPaths, jsonPath, valueTree, selectBranch, selectionStates, searchValues } from './sanitizer.mjs';
const input = document.querySelector('#input');
const output = document.querySelector('#output');
const status = document.querySelector('#status');
let current;
let entries = [];
const rows = new Map();
const search = document.querySelector('#search-values');
const selected = new Map();
const selection = document.querySelector('#selection');
function resetSelection() { current = undefined; entries = []; rows.clear(); search.value = ''; selected.clear(); selection.hidden = true; document.querySelector('#tree').replaceChildren(); }
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
    const { check } = rows.get(entry.key);
    check.checked = state.checked;
    check.indeterminate = state.included && !state.checked;
    if (state.included) included++;
  }
  document.querySelector('#count').textContent = ` · ${included} included`;
  document.querySelector('#trim').disabled = !selected.size;
}
function filterValues() {
  const visible = searchValues(entries, search.value);
  for (const [key, { row }] of rows) row.hidden = !visible.has(key);
  document.querySelector('#no-matches').hidden = visible.size > 0;
}
search.addEventListener('input', filterValues);
function renderValues() {
  selection.hidden = false;
  selected.clear();
  rows.clear();
  search.value = '';
  entries = valueTree(current);
  document.querySelector('#path-fallback').hidden = true;
  const tree = document.querySelector('#tree'); tree.replaceChildren();
  for (const entry of entries) {
    const { value, path, key } = entry;
    const container = value !== null && typeof value === 'object';
    const row = document.createElement('div'); row.className = 'value-row';
    row.style.paddingLeft = `${Math.min(path.length, 8) * 14}px`;
    const label = document.createElement('label');
    const check = document.createElement('input'); check.type = 'checkbox';
    rows.set(key, { row, check });
    check.addEventListener('change', () => { selectBranch(entry, selected, check.checked); updateCount(); });
    const text = document.createElement('code'); text.textContent = jsonPath(path);
    const preview = document.createElement('small'); preview.textContent = container ? (Array.isArray(value) ? `Array (${value.length})` : 'Object') : JSON.stringify(value);
    label.append(check, text, preview);
    const copy = document.createElement('button'); copy.textContent = 'Copy path'; copy.setAttribute('aria-label', `Copy path ${jsonPath(path)}`);
    copy.addEventListener('click', async () => {
      const pathText = jsonPath(path);
      try { await navigator.clipboard.writeText(pathText); message('Path copied.'); }
      catch { const fallback = document.querySelector('#path-fallback'); fallback.hidden = false; fallback.value = pathText; fallback.focus(); fallback.select(); message('Path selected; use your keyboard to copy.', true); }
    });
    row.append(label, copy); tree.append(row);
  }
  updateCount();
  filterValues();
}
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
