import {API, FileInfo} from 'jscodeshift';
import type {TestOptions} from 'jscodeshift/src/testUtils';

function assert(condition: boolean, message: string = ''): asserts condition is true {
  if (!condition) {
    throw new Error(message ? message : "Assertion failed" );
  }
}

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const ERROR_VARIABLE_IDENTIFIER_NAME =  'error';

  const targetedConsoleCalls = root.find(j.CallExpression, {
    arguments: [{
      type: 'Identifier', name: ERROR_VARIABLE_IDENTIFIER_NAME
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
          [ j.identifier(ERROR_VARIABLE_IDENTIFIER_NAME) ]
        )
      );
      callPath.replace(replacement);
    });

  // skip if file is not actionable
  if (targetedConsoleCalls.length === 0) {
    return root.toSource();
  }

  // atm we leave sorting out duplicated imports to linter
  const newImport = j.importDeclaration(
    [j.importSpecifier(j.identifier('logError'))],
    j.literal('src/lib.logger'),
  );

  // 2. Find all existing import declarations
  const importDeclarations = root.find(j.ImportDeclaration);

  if (importDeclarations.length > 0) {
    // Find the last import and insert after it.
    // This automatically keeps the header comment (which is on the *first* import) in place.
    j(importDeclarations.at(importDeclarations.length - 1).get()).insertAfter(
      newImport
    );
  } else {
    // --- CASE 2: No imports exist ---
    // This is the tricky part. We must insert at the top,
    // but manually preserve any leading comments.
    const program = root.get().node.program;

    // Check for comments attached to the *program* itself (e.g., from newlines)
    if (program.comments && program.comments.length > 0) {
      // Just unshift. Program-level comments will print first.
      program.body.unshift(newImport);
      return root.toSource();
    }

    const firstNode = program.body[0];
    const secondNode = program.body[1];

    // no comments to be concerned about
    if (!('comments' in firstNode) || firstNode.comments.length === 0) {
      program.body.unshift(newImport);
      return root.toSource();
    }

    assert(!!firstNode, 'File have to have at least one node');
    assert(!!secondNode, 'File have to have at least two nodes');

    const leadingComments = firstNode.leadingComments;
    const trailingComments = firstNode.trailingComments;

    newImport.comments = leadingComments;
    firstNode.comments = [];
    secondNode.comments = trailingComments;

    program.body.unshift(newImport);

    return root.toSource();

  }

  return root.toSource();
}

// Use TypeScript parser for transformations
export const parser: TestOptions['parser'] = 'ts';
