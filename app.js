import { sanitize, retainPaths, jsonPath } from './sanitizer.mjs';
const input = document.querySelector('#input');
const output = document.querySelector('#output');
const status = document.querySelector('#status');
let current;
const selected = new Map();
const selection = document.querySelector('#selection');
function resetSelection() { current = undefined; selected.clear(); selection.hidden = true; document.querySelector('#tree').replaceChildren(); }
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
  document.querySelector('#count').textContent = ` · ${selected.size} selected`;
  document.querySelector('#trim').disabled = !selected.size;
}
function renderValues() {
  selection.hidden = false;
  selected.clear();
  document.querySelector('#path-fallback').hidden = true;
  const tree = document.querySelector('#tree'); tree.replaceChildren();
  const pending = [[current, []]];
  while (pending.length) {
    const [value, path] = pending.pop();
    const container = value !== null && typeof value === 'object';
    const row = document.createElement('div'); row.className = 'value-row';
    row.style.paddingLeft = `${Math.min(path.length, 8) * 14}px`;
    const label = document.createElement('label');
    const check = document.createElement('input'); check.type = 'checkbox';
    const key = JSON.stringify(path);
    check.addEventListener('change', () => { if (check.checked) selected.set(key, path); else selected.delete(key); updateCount(); });
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
    if (container) {
      const keys = Object.keys(value);
      for (let i = keys.length - 1; i >= 0; i--) { const key = keys[i]; pending.push([value[key], [...path, Array.isArray(value) ? Number(key) : key]]); }
    }
  }
  updateCount();
}
document.querySelector('#select-all').addEventListener('click', () => {
  document.querySelectorAll('#tree input').forEach(check => { if (!check.checked) check.click(); });
});
document.querySelector('#select-none').addEventListener('click', () => {
  document.querySelectorAll('#tree input').forEach(check => { if (check.checked) check.click(); });
});
document.querySelector('#trim').addEventListener('click', () => {
  try {
    const next = retainPaths(current, [...selected.values()]);
    const serialized = JSON.stringify(next, null, 2);
    current = next; output.value = serialized; renderValues();
    message('Kept selected values. Paths now match the output.');
  } catch (error) { message(error.message, true); }
});
