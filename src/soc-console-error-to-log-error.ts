import {API, FileInfo} from 'jscodeshift';
import type {TestOptions} from 'jscodeshift/src/testUtils';
import {ensureNamedImport} from './utils/import-utils';

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const FUNCTION_IDENTIFIER_NAME = 'logError';
  const IMPORT_SOURCE_LITERAL = 'src/lib.logger';

  const targetedConsoleCalls = root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      object: {type: 'Identifier', name: 'console'},
      property: {type: 'Identifier', name: 'error'},
    }
  })
    // make sure console is not overridden in local scope
    .filter(callPath => {
      const consoleIdentifierPath = callPath.get('callee', 'object');
      const binding = consoleIdentifierPath.scope.lookup('console');
      return binding === null;
    })
    .forEach((callPath) => {
      const replacement = j.callExpression(
        j.identifier('logError'),
        callPath.node.arguments
      );
      callPath.replace(replacement);
    });

  // skip if file is not actionable
  if (targetedConsoleCalls.length === 0) {
    return root.toSource();
  }

  // Ensure the import exists
  ensureNamedImport(root, api, {
    importedName: FUNCTION_IDENTIFIER_NAME,
    importSource: IMPORT_SOURCE_LITERAL,
  });

  return root.toSource();
}

// Use TypeScript parser for transformations
export const parser: TestOptions['parser'] = 'ts';
