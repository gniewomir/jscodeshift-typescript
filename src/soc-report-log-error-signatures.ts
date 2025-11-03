import {API, FileInfo} from 'jscodeshift';
import type {TestOptions} from 'jscodeshift/src/testUtils';

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const SEARCH = 'logError';

  const calls = root.find(j.CallExpression, {
    type: 'CallExpression',
    callee: {type: 'Identifier', name: SEARCH}
  });

  calls.forEach(callPath => {
    const callSignatures = [
      [ 'StringLiteral', 'ConditionalExpression' ],
      [ 'StringLiteral', 'MemberExpression' ],
      [ 'StringLiteral', 'MemberExpression', 'ObjectExpression' ],
      [ 'StringLiteral', 'TSAsExpression' ],
      [ 'StringLiteral', 'TSAsExpression', 'ObjectExpression' ],
      [ 'TemplateLiteral', 'MemberExpression' ],
      [ 'TemplateLiteral', 'NewExpression', 'ObjectExpression' ],
      [ 'TemplateLiteral', 'TSAsExpression' ],
    ];
    const signature = callPath.node.arguments.map(arg => arg.type);
    const source =j(callPath.node).toSource().replace('\n', '');

    for (const search of callSignatures) {
      if (search.toString() === signature.toString()) {
        console.log(source);
      }
    }
  });

  return root.toSource();
}

// Use TypeScript parser for transformations
export const parser: TestOptions['parser'] = 'ts';
