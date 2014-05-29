if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}
define(function(require, exports, module) {
	var stringStream = require('./stringStream');

	var pairs = {
		'{': '}',
		'[': ']',
		'(': ')'
	};

	function compact(arr) {
		return arr.filter(function(item) {
			return !!item;
		});
	}

	/**
	 * Splits given expression by comma
	 * @param  {String} expr Expression to split
	 * @return {Array}
	 */
	function split(expr) {
		var stream = stringStream(expr);
		var parts = [], ch;
		while (ch = stream.next()) {
			if (ch === ',') {
				parts.push(stream.current(true).trim());
				stream.start = stream.pos;
			}
			stream.skipQuoted();
		}

		parts.push(stream.current().trim());
		return compact(parts);
	}

	/**
	 * Parses expression, e.g. the string between `{` and `}`
	 * @param  {String} expr Expression to parse
	 * @return {Object}
	 */
	function parseExpression(expr) {
		if (expr.charAt(0) == '{' && expr.charAt(expr.length - 1) == '}') {
			expr = expr.substring(1, expr.length - 1);
		}

		var parts = split(expr).map(function(token) {
			var stream = stringStream(token), ch;
			var reIf = /^\s+if\s+/;
			
			var condition = null;
			var key = null;

			// extract key and " if ..." condition
			while (!stream.eol()) {
				ch = stream.peek();
				if (ch in pairs) {
					// brace found, skip to its pair
					if (!stream.skipToPair(ch, pairs[ch], true)) {
						var err = new Error('Unable to find closing brace for character at ' + stream.pos);
						err.pos = stream.pos;
						throw err;
					}
				} else if (ch === ':') {
					// key found
					key = stream.current();
					stream.next();
					strea.start = stream.pos;
				} else if (stream.match(reIf, false)) {
					// found condition
					token = stream.current();
					stream.match(reIf, true);
					stream.start = stream.pos;
					stream.skipToEnd();
					condition = stream.current();
					break;
				}

				stream.next();
				stream.skipQuoted();
			}

			token = token.trim();
			if (token.charAt(token.length - 1) == '?') {
				token = token.substring(0, token.length - 1);
				if (!condition) {
					condition = '?';
				}
			}

			return {
				key: key,
				value: token,
				condition: condition
			};
		});

		return parts;
	}

	return function(str) {
		var stream = stringStream(str);
		var tokens = [], expr;

		while (!stream.eol()) {
			if (stream.peek() === '{') {
				tokens.push(stream.current());
				stream.start = stream.pos;
				if (stream.skipToPair('{', '}', true)) {
					tokens.push(parseExpression(stream.current()));
					stream.start = stream.pos;
				} else {
					var err = new Error('Invalid expression: unable to find "}" for opening brace at ' + stream.pos);
					err.pos = stream.pos;
					throw err;
				}
			}

			stream.next();
			stream.skipQuoted();
		}

		tokens.push(stream.current());

		return compact(tokens);
	};
});
