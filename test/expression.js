var assert = require('assert');
var expression = require('../index');

function cleanTokens(tokens) {
	tokens.forEach(function(t) {
		delete t.xpathCondition;
	});
	return tokens;
}

function expr(e) {
	return expression(e).map(function(token) {
		if (Array.isArray(token)) {
			cleanTokens(token);
		}
		return token;
	});
}

function parse(e) {
	return cleanTokens(expression.parse(e));
}

describe('Expression Parser', function() {
	it('tokenize string', function() {
		assert.deepEqual(expr('a'), ['a']);
		assert.deepEqual(expr('a b'), ['a b']);
		assert.deepEqual(expr('a{b}c'), ['a', [{value: 'b'}], 'c']);
		assert.deepEqual(expr('a {b, c} d'), ['a ', [{value: 'b'}, {value: 'c'}], ' d']);
		assert.deepEqual(expr('a {{b}, c} d'), ['a ', [{value: '{b}'}, {value: 'c'}], ' d']);
	});

	it('parse simple expression', function() {
		assert.deepEqual(parse('a'), [{value: 'a'}]);
		assert.deepEqual(parse('a?'), [{value: 'a', condition: '?'}]);
		assert.deepEqual(parse('a if b'), [{value: 'a', condition: 'b'}]);
		assert.deepEqual(parse('a? if b'), [{value: 'a', condition: 'b'}]);
	});

	it('parse complex expression', function() {
		assert.deepEqual(parse('a if contains(b, \'foo\')'), [{value: 'a', condition: 'contains(b, \'foo\')'}]);
		assert.deepEqual(parse('"a" if "b"'), [{value: '"a"', condition: '"b"'}]);
		assert.deepEqual(parse('fn() if a'), [{value: 'fn()', condition: 'a'}]);
	});

	it('parse lists', function() {
		assert.deepEqual(parse('a, b'), [{value: 'a'}, {value: 'b'}]);
		assert.deepEqual(parse('a, "b, c"'), [{value: 'a'}, {value: '"b, c"'}]);
		assert.deepEqual(parse('a, "b, c", d'), [{value: 'a'}, {value: '"b, c"'}, {value: 'd'}]);
		assert.deepEqual(parse('a?, b if c'), [{value: 'a', condition: '?'}, {value: 'b', condition: 'c'}]);
		assert.deepEqual(parse('a, "b, c" if d, e'), [{value: 'a'}, {value: '"b, c"', condition: 'd'}, {value: 'e'}]);
	});

	it('parse hashes', function() {
		assert.deepEqual(parse('a: b'), [{value: 'b', key: 'a'}]);
		assert.deepEqual(parse('a: b, c: d'), [{value: 'b', key: 'a'}, {value: 'd', key: 'c'}]);
	});

	it('throw exceptions on illegal token mix', function() {
		assert.throws(function() {
			parse('a: b, c')
		});
	});
});