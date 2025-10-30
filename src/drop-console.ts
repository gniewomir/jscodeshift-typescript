import {API, FileInfo} from 'jscodeshift';
import type {TestOptions} from 'jscodeshift/src/testUtils';

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const globalConsoleCalls = root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression', object: {type: 'Identifier', name: 'console'}
    }
  })
    .filter(callPath => {
      const consoleIdentifierPath = callPath.get('callee', 'object');
      const binding = consoleIdentifierPath.scope.lookup('console');
      return binding === null;
    });

  globalConsoleCalls.remove();

  return root.toSource();
}

// Use TypeScript parser for transformations
export const parser: TestOptions['parser'] = 'ts';
