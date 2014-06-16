if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}
define(function(require, exports, module) {
	var stringStream = require('string-stream');

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
	 * Check if given token list contains Xpath superset token
	 * @param  {Array}  tokens
	 * @return {Boolean}
	 */
	function hasSupersetTokens(tokens) {
		for (var i = 0, il = tokens.length, tok; i < il; i++) {
			tok = tokens[i];
			if ('key' in tok || 'condition' in tok) {
				return true;
			}
		}

		return false;
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
			} else if (ch in pairs) {
				// brace found, skip to its pair
				if (!stream.skipToPair(ch, pairs[ch], true)) {
					var err = new Error('Unable to find closing brace for character at ' + stream.pos);
					err.pos = stream.pos;
					throw err;
				}
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
		var reIf = /^\s+if\s+/;
		var reSpace = /^\s/;

		var parts = split(expr).map(function(token) {
			var stream = stringStream(token), ch;
			
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
				} else if (ch === ':' && reSpace.test(stream.string.charAt(stream.pos + 1))) {
					// key found
					key = stream.current();
					stream.next();
					stream.start = stream.pos;
					token = token.substring(stream.pos);
				} else if (stream.match(reIf, false)) {
					// found condition
					token = stream.current();
					stream.match(reIf, true);
					stream.start = stream.pos;
					stream.skipToEnd();
					condition = stream.current().trim() || null;
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

			var out = {
				value: token
			};

			if (key !== null) {
				out.key = key;
			}

			if (condition !== null) {
				out.condition = condition;
				out.xpathCondition = (condition === '?') 
					? 'normalize-space(' + out.value + ')' 
					: condition;
			}

			return out;
		});

		try {
			validateTokens(parts);
		} catch (e) {
			throw new Error('Error while parsing `' + expr + '`: ' + e.message);
		}

		return parts;
	}

	function validateTokens(tokens) {
		var keys = 0;
		tokens.forEach(function(token) {
			if (token.key) {
				keys++;
			}
		});

		if (keys && keys !== tokens.length) {
			throw new Error('Illegal mix of plain list and hashes');
		}

		return true;
	}

	module.exports = function(str) {
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

	module.exports.parse = parseExpression;
	module.exports.hasXpathSuperset = function(tokens) {
		if (typeof tokens === 'string') {
			tokens = module.exports(tokens);
		}

		for (var i = 0, il = tokens.length; i < il; i++) {
			if (Array.isArray(tokens[i]) && hasSupersetTokens(tokens[i])) {
				return true;
			}
		}

		return false;
	};

	/**
	 * Check if given token list is a node-set
	 * @param  {Array}  tokens
	 * @return {Boolean}
	 */
	module.exports.isNodeSet = function(tokens) {
		return tokens.every(function(token) {
			return 'key' in token;
		});
	};

	return module.exports;
});
