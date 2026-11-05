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
