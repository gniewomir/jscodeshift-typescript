import {API, FileInfo} from 'jscodeshift';
import type {TestOptions} from 'jscodeshift/src/testUtils';

function assert(condition: boolean, message: string = ''): asserts condition is true {
  if (!condition) {
    throw new Error(message ? message : "Assertion failed");
  }
}

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root.find(j.CallExpression, {
    callee: {type: 'Identifier', name: 'logError'}
  }).filter(callPath => {
    return callPath.node.arguments[1] && callPath.node.arguments[1].type && callPath.node.arguments[1].type === 'Identifier' && callPath.node.arguments[1].name === 'undefined';
  }).forEach((callPath) => {
    const replacement = j.callExpression(j.identifier('logError'), callPath.node.arguments.map((argument) => {
      if (argument.type === 'Identifier' && argument.name === 'undefined') {
        return j.identifier('null');
      }
      return argument;
    }),);
    callPath.replace(replacement);
  });

  return root.toSource();
}

// Use TypeScript parser for transformations
export const parser: TestOptions['parser'] = 'ts';
