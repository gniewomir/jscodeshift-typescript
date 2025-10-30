import {API, FileInfo} from 'jscodeshift';
import type {TestOptions} from 'jscodeshift/src/testUtils';

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const targetedConsoleCalls = root.find(j.CallExpression, {
    arguments: [{
      type: 'Identifier', name: 'error'
    }],
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
    // get parent expression, bc we replace expression for expression
    .closest(j.ExpressionStatement)
    .forEach((callPath) => {
      const replacement = j.expressionStatement(
        j.callExpression(
          j.identifier('logError'),
          [ j.identifier('error') ]
        )
      );
      callPath.replace(replacement);
    });

  // skip if file is not actionable
  if (targetedConsoleCalls.length === 0) {
    return root.toSource();
  }

  // atm we leave sorting out duplicated imports to linter
  const loggerImport = j.importDeclaration(
    [j.importSpecifier(j.identifier('logError'))],
    j.literal('src/lib.logger'),
  );
  const programBody = root.get().node.program.body;
  programBody.unshift(loggerImport);

  return root.toSource();
}

// Use TypeScript parser for transformations
export const parser: TestOptions['parser'] = 'ts';
