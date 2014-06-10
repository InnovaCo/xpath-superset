var assert = require('assert');
var expr = require('../lib/expressionParser');

describe('Expression Parser', function() {
	it('should tokenize string', function() {
		assert.deepEqual(expr('a'), ['a']);
		assert.deepEqual(expr('a b'), ['a b']);
		assert.deepEqual(expr('a{b}c'), ['a', [{value: 'b'}], 'c']);
		assert.deepEqual(expr('a {b, c} d'), ['a ', [{value: 'b'}, {value: 'c'}], ' d']);
		assert.deepEqual(expr('a {{b}, c} d'), ['a ', [{value: '{b}'}, {value: 'c'}], ' d']);
	});

	it('should parse simple expression', function() {
		assert.deepEqual(expr.parse('a'), [{value: 'a'}]);
		assert.deepEqual(expr.parse('a?'), [{value: 'a', condition: '?'}]);
		assert.deepEqual(expr.parse('a if b'), [{value: 'a', condition: 'b'}]);
		assert.deepEqual(expr.parse('a? if b'), [{value: 'a', condition: 'b'}]);
	});

	it('should parse lists', function() {
		assert.deepEqual(expr.parse('a, b'), [{value: 'a'}, {value: 'b'}]);
		assert.deepEqual(expr.parse('a, "b, c"'), [{value: 'a'}, {value: '"b, c"'}]);
		assert.deepEqual(expr.parse('a, "b, c", d'), [{value: 'a'}, {value: '"b, c"'}, {value: 'd'}]);
		assert.deepEqual(expr.parse('a?, b if c'), [{value: 'a', condition: '?'}, {value: 'b', condition: 'c'}]);
		assert.deepEqual(expr.parse('a, "b, c" if d, e'), [{value: 'a'}, {value: '"b, c"', condition: 'd'}, {value: 'e'}]);
	});

	it('should parse hashes', function() {
		assert.deepEqual(expr.parse('a: b'), [{value: 'b', key: 'a'}]);
		assert.deepEqual(expr.parse('a: b, c: d'), [{value: 'b', key: 'a'}, {value: 'd', key: 'c'}]);
	});

	it('should throw exceptions on illegal token mix', function() {
		assert.throws(function() {
			expr.parse('a: b, c')
		});
	});
});