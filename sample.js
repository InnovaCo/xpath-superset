var expressionParser = require('./lib/expressionParser');

console.log(expressionParser('hello {sample?, "sample" if test} end'));