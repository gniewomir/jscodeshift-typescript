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

  const FUNCTION_IDENTIFIER_NAME = 'logError';
  const ERROR_VARIABLE_IDENTIFIER_NAME = 'error';
  const IMPORT_SOURCE_LITERAL = 'src/lib.logger';

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
    .forEach((callPath) => {
      const replacement = j.callExpression(
        j.identifier('logError'),
        [ j.identifier(ERROR_VARIABLE_IDENTIFIER_NAME) ]
      );
      callPath.replace(replacement);
    });

  // skip if file is not actionable
  if (targetedConsoleCalls.length === 0) {
    return root.toSource();
  }

  // Find all existing import declarations
  const allImportDeclarations = root.find(j.ImportDeclaration);
  const knownImportDeclarations = allImportDeclarations.filter(callPath => {
    return callPath.node.source.value === IMPORT_SOURCE_LITERAL;
  })

  assert(knownImportDeclarations.length === 0 || knownImportDeclarations.length === 1, 'Expected no more than one import from specified source');

  if (knownImportDeclarations.length === 1) {
    const knownDeclaration = knownImportDeclarations.nodes()[0];
    const knownDeclarationSpecifiers = knownDeclaration.specifiers || [];
    allImportDeclarations.filter(callPath => {
      return callPath.node.source.value === IMPORT_SOURCE_LITERAL;
    }).replaceWith(
      j.importDeclaration(
        [...knownDeclarationSpecifiers, j.importSpecifier(j.identifier(FUNCTION_IDENTIFIER_NAME))],
        j.literal(IMPORT_SOURCE_LITERAL)
      )
    );
    return root.toSource();
  }

  const newImport = j.importDeclaration(
    [j.importSpecifier(j.identifier(FUNCTION_IDENTIFIER_NAME))],
    j.literal(IMPORT_SOURCE_LITERAL)
  );

  if (allImportDeclarations.length > 0) {
    // Imports exist
    // Find the last import and insert after it.
    // This automatically keeps the header comment (which is on the *first* import) in place.
    j(allImportDeclarations.at(allImportDeclarations.length - 1).get()).insertAfter(newImport);
  } else {
    // No imports exist
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
