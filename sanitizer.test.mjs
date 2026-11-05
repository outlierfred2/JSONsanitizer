import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitize } from './sanitizer.mjs';
test('preserves structure and types and leaves source unchanged', () => {
 const source = {name:'secret', amount:42.5, enabled:true, missing:null, items:['private', 9, false, {}, []]};
 const before = JSON.stringify(source);
 assert.deepEqual(sanitize(source), {name:'string', amount:0, enabled:false, missing:null, items:['string',0,false,{},[]]});
 assert.equal(JSON.stringify(source), before);
});
test('supports primitive roots', () => {
 for (const [source, expected] of [['secret','string'],[42,0],[true,false],[null,null]]) assert.equal(sanitize(source),expected);
});
test('preserves special property names without prototype changes', () => {
 const result = sanitize(JSON.parse('{"__proto__":{"secret":"value"},"constructor":4}'));
 assert.equal(Object.getPrototypeOf(result), Object.prototype);
 assert.equal(JSON.stringify(result), '{"__proto__":{"secret":"string"},"constructor":0}');
});

import { retainPaths, jsonPath } from './sanitizer.mjs';
test('retains ancestors and compacts arrays', () => {
 assert.deepEqual(retainPaths({users:[{name:'a', age:0},{name:'b', age:0}], other:false}, [['users',1,'name']]), {users:[{name:'b'}]});
});
test('retains selected containers, empty values, and root primitives', () => {
 const value = {a:{x:1,y:2}, b:[], c:null};
 assert.deepEqual(retainPaths(value, [['a'],['a','x'],['b']]), {a:{x:1,y:2},b:[]});
 assert.equal(retainPaths(null,[[]]),null);
 assert.throws(() => retainPaths(value, []));
});
test('paths quote special keys and distinguish numeric keys from indexes', () => {
 assert.equal(jsonPath(['a.b','0',2,'"']), '$["a.b"]["0"][2]["\\\""]');
 const value = JSON.parse('{"__proto__":{"x":0,"y":0}}');
 assert.equal(JSON.stringify(retainPaths(value,[['__proto__','x']])), '{"__proto__":{"x":0}}');
});

import { valueTree, selectBranch, selectionStates, searchValues } from './sanitizer.mjs';
test('child selections include upstream branches without retaining siblings', () => {
 const value = {task:{params:{id:0}, secret:'string'}, other:false};
 const entries = valueTree(value), selected = new Map();
 selectBranch(entries.find(e => e.key === '["task","params","id"]'), selected, true);
 const states = selectionStates(entries, selected);
 assert.deepEqual(states.get('["task"]'), {checked:false, included:true});
 assert.deepEqual(states.get('[]'), {checked:false, included:true});
 assert.deepEqual(states.get('["task","params"]'), {checked:true, included:true});
 assert.deepEqual(retainPaths(value, [...selected.values()]), {task:{params:{id:0}}});
 selectBranch(entries.find(e => e.key === '["task"]'), selected, false);
 assert.deepEqual(retainPaths(value, [...selected.values()]), {task:{params:{id:0}}});
});
test('whole branch selection permits deselecting one child', () => {
 const value = {a:{x:0,y:0}, empty:[], nothing:null};
 const entries = valueTree(value), selected = new Map();
 selectBranch(entries[0], selected, true);
 assert.equal(selectionStates(entries, selected).get('[]').checked, true);
 selectBranch(entries.find(e => e.key === '["a","x"]'), selected, false);
 assert.deepEqual(retainPaths(value, [...selected.values()]), {a:{y:0},empty:[],nothing:null});
});
test('search matches dotted paths and values, keeps ancestors, and preserves selection', () => {
 const entries = valueTree({task:{params:{id:0}, name:'string'}, other:false});
 const selected = new Map();
 selectBranch(entries.find(e => e.key === '["other"]'), selected, true);
 const visible = searchValues(entries, ' TASK.PARAMS ');
 assert.deepEqual([...visible].sort(), ['[]','["task"]','["task","params"]','["task","params","id"]'].sort());
 assert.ok(searchValues(entries, 'false').has('["other"]'));
 assert.equal(searchValues(entries, 'no matches').size, 0);
 assert.equal(searchValues(entries, '').size, entries.length);
 assert.deepEqual([...selected.values()], [['other']]);
});

test('parent on/off preserves an earlier child selection and removes only parent additions', () => {
 const value = {item1:{item2:0, other:0}, outside:false};
 const entries = valueTree(value), selected = new Map();
 const parent = entries.find(e => e.key === '["item1"]');
 const child = entries.find(e => e.key === '["item1","item2"]');
 selectBranch(child, selected, true);
 selectBranch(parent, selected, true);
 assert.deepEqual(retainPaths(value, [...selected.values()]), {item1:{item2:0,other:0}});
 selectBranch(parent, selected, false);
 assert.deepEqual(retainPaths(value, [...selected.values()]), {item1:{item2:0}});
 assert.deepEqual(selectionStates(entries, selected).get(parent.key), {checked:false,included:true});
 selectBranch(child, selected, false);
 assert.equal(selected.size, 0);
});
test('independent nested branch selections survive root toggles and clear resets history', () => {
 const value = {a:{x:0,y:0},b:0};
 const entries = valueTree(value), selected = new Map();
 const branch = entries.find(e => e.key === '["a"]');
 selectBranch(branch, selected, true);
 selectBranch(entries[0], selected, true);
 selectBranch(entries[0], selected, false);
 assert.deepEqual(retainPaths(value, [...selected.values()]), {a:{x:0,y:0}});
 selected.clear();
 selectBranch(entries[0], selected, true);
 selectBranch(entries[0], selected, false);
 assert.equal(selected.size, 0);
});
