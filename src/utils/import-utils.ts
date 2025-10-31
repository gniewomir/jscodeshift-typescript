import {
  API,
  Collection,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
} from 'jscodeshift';

function assert(condition: boolean, message: string = ''): asserts condition is true {
  if (!condition) {
    throw new Error(message ? message : 'Assertion failed');
  }
}

export interface EnsureImportOptions {
  /** The name of the identifier to import (e.g., 'logError') */
  importedName: string;
  /** The module source to import from (e.g., 'src/lib.logger') */
  importSource: string;
  /** Optional: The local name if different from importedName (for aliased imports) */
  localName?: string;
}

/**
 * Ensures that a named import exists in the file. If an import from the specified
 * source already exists, it adds the identifier to that import. Otherwise, it creates
 * a new import declaration.
 *
 * @param root - The root collection from jscodeshift
 * @param api - The jscodeshift API
 * @param options - Configuration for the import to ensure
 * @returns true if an import was added/modified, false if it already existed
 */
export function ensureNamedImport(
  root: Collection,
  api: API,
  options: EnsureImportOptions
): boolean {
  const j = api.jscodeshift;
  const {importedName, importSource, localName} = options;

  // Find all existing import declarations
  const allImportDeclarations = root.find(j.ImportDeclaration);
  const knownImportDeclarations = allImportDeclarations.filter(callPath => {
    return callPath.node.source.value === importSource;
  });

  assert(
    knownImportDeclarations.length === 0 || knownImportDeclarations.length === 1,
    'Expected no more than one import from specified source'
  );

  // Check if the import already exists
  if (knownImportDeclarations.length === 1) {
    const knownDeclaration = knownImportDeclarations.nodes()[0];
    const knownDeclarationSpecifiers = knownDeclaration.specifiers || [];

    // Skip if this is a type-only import
    if (knownDeclaration.importKind === 'type') {
      // Don't merge with type-only imports, create a new import instead
      // Fall through to create new import logic
    } else {
      // Check if the identifier is already imported
      const alreadyExists = knownDeclarationSpecifiers.some(specifier => {
        if (specifier.type === 'ImportSpecifier') {
          return specifier.imported.name === importedName;
        }
        return false;
      });

      if (alreadyExists) {
        return false; // Already imported, nothing to do
      }

      // Add the new specifier to existing import
      const uniqueSpecifiersMap = new Map<
        string,
        ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier
      >();

      const newSpecifier = localName
        ? j.importSpecifier(j.identifier(importedName), j.identifier(localName))
        : j.importSpecifier(j.identifier(importedName));

      for (const specifier of [...knownDeclarationSpecifiers, newSpecifier]) {
        if (specifier.type === 'ImportSpecifier') {
          const name = specifier.imported.name.toString();
          uniqueSpecifiersMap.set(name, specifier);
        } else if (specifier.type === 'ImportDefaultSpecifier') {
          uniqueSpecifiersMap.set('__default__', specifier);
        } else if (specifier.type === 'ImportNamespaceSpecifier') {
          uniqueSpecifiersMap.set('__namespace__', specifier);
        }
      }

      allImportDeclarations
        .filter(callPath => {
          return callPath.node.source.value === importSource;
        })
        .replaceWith(
          j.importDeclaration(
            uniqueSpecifiersMap.values().toArray(),
            j.literal(importSource)
          )
        );

      return true;
    }
  }

  // Create a new import declaration
  const newSpecifier = localName
    ? j.importSpecifier(j.identifier(importedName), j.identifier(localName))
    : j.importSpecifier(j.identifier(importedName));

  const newImport = j.importDeclaration([newSpecifier], j.literal(importSource));

  if (allImportDeclarations.length > 0) {
    // Imports exist - insert after the last import
    // This automatically keeps the header comment (which is on the *first* import) in place
    j(allImportDeclarations.at(allImportDeclarations.length - 1).get()).insertAfter(
      newImport
    );
  } else {
    // No imports exist - insert at the top, preserving any leading comments
    const program = root.get().node.program;

    // Check for comments attached to the *program* itself (e.g., from newlines)
    if (program.comments && program.comments.length > 0) {
      // Just unshift. Program-level comments will print first.
      program.body.unshift(newImport);
      return true;
    }

    const firstNode = program.body[0];
    const secondNode = program.body[1];

    // No nodes exist (empty file or only comments at program level)
    if (!firstNode) {
      program.body.unshift(newImport);
      return true;
    }

    // No comments to be concerned about
    if (!('comments' in firstNode) || !firstNode.comments || firstNode.comments.length === 0) {
      program.body.unshift(newImport);
      return true;
    }

    // If we don't have a second node, just unshift
    if (!secondNode) {
      const leadingComments = firstNode.leadingComments;
      newImport.comments = leadingComments;
      firstNode.comments = [];
      program.body.unshift(newImport);
      return true;
    }

    const leadingComments = firstNode.leadingComments;
    const trailingComments = firstNode.trailingComments;

    newImport.comments = leadingComments;
    firstNode.comments = [];
    secondNode.comments = trailingComments;

    program.body.unshift(newImport);
  }

  return true;
}