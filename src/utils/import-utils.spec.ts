import {describe, expect, it} from 'vitest';
import {createTestTransform} from '../test-kit';
import {outdent} from 'outdent';
import {API, FileInfo} from 'jscodeshift';
import {ensureNamedImport} from './import-utils';

// Create a simple transformer that uses ensureNamedImport for testing
function createImportTransformer(
  importedName: string,
  importSource: string,
  localName?: string
) {
  return function transformer(file: FileInfo, api: API) {
    const j = api.jscodeshift;
    const root = j(file.source);

    ensureNamedImport(root, api, {
      importedName,
      importSource,
      localName,
    });

    return root.toSource();
  };
}

describe('import-utils', () => {
  describe('ensureNamedImport', () => {
    it('adds import when no imports exist', () => {
      const transformer = createImportTransformer('logError', 'src/lib.logger');
      const transform = createTestTransform(transformer);

      const source = outdent`
        const error = new Error('thrown');
        console.error(error);
      `;

      const expected = outdent`
        import { logError } from "src/lib.logger";
        const error = new Error('thrown');
        console.error(error);
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('adds import to existing imports from different source', () => {
      const transformer = createImportTransformer('logError', 'src/lib.logger');
      const transform = createTestTransform(transformer);

      const source = outdent`
        import { something } from 'other-module';

        const error = new Error('thrown');
      `;

      const expected = outdent`
        import { something } from 'other-module';

        import { logError } from "src/lib.logger";

        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('adds import specifier to existing import from same source', () => {
      const transformer = createImportTransformer('logError', 'src/lib.logger');
      const transform = createTestTransform(transformer);

      const source = outdent`
        import { log } from 'src/lib.logger';

        const error = new Error('thrown');
      `;

      const expected = outdent`
        import { log, logError } from "src/lib.logger";

        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('does not duplicate import specifiers', () => {
      const transformer = createImportTransformer('logError', 'src/lib.logger');
      const transform = createTestTransform(transformer);

      const source = outdent`
        import { logError } from 'src/lib.logger';

        const error = new Error('thrown');
      `;

      const expected = outdent`
        import { logError } from 'src/lib.logger';

        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('preserves leading comments when adding first import', () => {
      const transformer = createImportTransformer('logError', 'src/lib.logger');
      const transform = createTestTransform(transformer);

      const source = outdent`
        /* eslint-disable no-unused-vars */
        // comment 1
        const error = new Error('thrown');
        // comment 2
        console.error(error);
      `;

      const expected = outdent`
        /* eslint-disable no-unused-vars */
        // comment 1
        import { logError } from "src/lib.logger";

        const error = new Error('thrown');
        // comment 2
        console.error(error);
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('adds import after last existing import', () => {
      const transformer = createImportTransformer('logError', 'src/lib.logger');
      const transform = createTestTransform(transformer);

      const source = outdent`
        import { first } from 'first-module';
        import { second } from 'second-module';
        import { third } from 'third-module';

        const error = new Error('thrown');
      `;

      const expected = outdent`
        import { first } from 'first-module';
        import { second } from 'second-module';
        import { third } from 'third-module';

        import { logError } from "src/lib.logger";

        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('adds aliased import (localName)', () => {
      const transformer = createImportTransformer(
        'logError',
        'src/lib.logger',
        'customLogError'
      );
      const transform = createTestTransform(transformer);

      const source = outdent`
        const error = new Error('thrown');
      `;

      const expected = outdent`
        import { logError as customLogError } from "src/lib.logger";
        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('adds aliased import to existing import from same source', () => {
      const transformer = createImportTransformer(
        'logError',
        'src/lib.logger',
        'customLogError'
      );
      const transform = createTestTransform(transformer);

      const source = outdent`
        import { log } from 'src/lib.logger';

        const error = new Error('thrown');
      `;

      const expected = outdent`
        import { log, logError as customLogError } from "src/lib.logger";

        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('handles multiple specifiers from same source', () => {
      const transformer = createImportTransformer('logError', 'src/lib.logger');
      const transform = createTestTransform(transformer);

      const source = outdent`
        import { log, warn, info } from 'src/lib.logger';

        const error = new Error('thrown');
      `;

      const expected = outdent`
        import { log, warn, info, logError } from "src/lib.logger";

        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('preserves existing aliased imports', () => {
      const transformer = createImportTransformer('logError', 'src/lib.logger');
      const transform = createTestTransform(transformer);

      const source = outdent`
        import { log as customLog } from 'src/lib.logger';

        const error = new Error('thrown');
      `;

      const expected = outdent`
        import { log as customLog, logError } from "src/lib.logger";

        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('handles type imports in the same source', () => {
      const transformer = createImportTransformer('logError', 'src/lib.logger');
      const transform = createTestTransform(transformer);

      const source = outdent`
        import type { Logger } from 'src/lib.logger';

        const error = new Error('thrown');
      `;

      // Type imports are kept separate from regular imports
      const expected = outdent`
        import type { Logger } from 'src/lib.logger';

        import { logError } from "src/lib.logger";

        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('handles files with only comments', () => {
      const transformer = createImportTransformer('logError', 'src/lib.logger');
      const transform = createTestTransform(transformer);

      const source = outdent`
        /* Comment only file */
        // More comments
      `;

      // When there are only comments, the import is added at the top
      const expected = outdent`
        import { logError } from "src/lib.logger";
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('handles empty files', () => {
      const transformer = createImportTransformer('logError', 'src/lib.logger');
      const transform = createTestTransform(transformer);

      const source = '';

      const expected = outdent`
        import { logError } from "src/lib.logger";
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('deduplicates when adding same import twice', () => {
      // Transformer that tries to add the same import twice
      function doubleImportTransformer(file: FileInfo, api: API) {
        const j = api.jscodeshift;
        const root = j(file.source);

        ensureNamedImport(root, api, {
          importedName: 'logError',
          importSource: 'src/lib.logger',
        });

        ensureNamedImport(root, api, {
          importedName: 'logError',
          importSource: 'src/lib.logger',
        });

        return root.toSource();
      }

      const transform = createTestTransform(doubleImportTransformer);

      const source = outdent`
        const error = new Error('thrown');
      `;

      const expected = outdent`
        import { logError } from "src/lib.logger";
        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('adds multiple different imports from different sources', () => {
      // Transformer that adds multiple imports
      function multiImportTransformer(file: FileInfo, api: API) {
        const j = api.jscodeshift;
        const root = j(file.source);

        ensureNamedImport(root, api, {
          importedName: 'logError',
          importSource: 'src/lib.logger',
        });

        ensureNamedImport(root, api, {
          importedName: 'fetchData',
          importSource: 'src/lib.api',
        });

        return root.toSource();
      }

      const transform = createTestTransform(multiImportTransformer);

      const source = outdent`
        const error = new Error('thrown');
      `;

      const expected = outdent`
        import { logError } from "src/lib.logger";
        import { fetchData } from "src/lib.api";
        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });

    it('adds multiple imports to same source', () => {
      // Transformer that adds multiple imports from same source
      function multiImportTransformer(file: FileInfo, api: API) {
        const j = api.jscodeshift;
        const root = j(file.source);

        ensureNamedImport(root, api, {
          importedName: 'logError',
          importSource: 'src/lib.logger',
        });

        ensureNamedImport(root, api, {
          importedName: 'logWarn',
          importSource: 'src/lib.logger',
        });

        return root.toSource();
      }

      const transform = createTestTransform(multiImportTransformer);

      const source = outdent`
        const error = new Error('thrown');
      `;

      const expected = outdent`
        import { logError, logWarn } from "src/lib.logger";
        const error = new Error('thrown');
      `;

      expect(transform({source})).toEqual(expected);
    });
  });
});
