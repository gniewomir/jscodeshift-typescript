import {describe, expect, it} from "vitest";
import {createTestTransform} from "./test-kit";
import transformer from "./soc-console-error-to-log-error";
import {outdent} from 'outdent';


describe('soc-console-error-to-log-error', () => {
  const transform = createTestTransform(transformer);

  it('replaces console.error( error ) calls with logError calls and imports logError', async () => {
    const source = outdent`
      const error = new Error('thrown');
      console.error(error);
    `;

    const expected = outdent`
      import { logError } from "src/lib.logger";
      const error = new Error('thrown');
      logError(error);
    `;

    expect(transform({source})).toEqual(expected);
  });

  it('at the moment we do not deduplicate imports leaving it for the linter', async () => {
    const source = outdent`
      import { logError } from 'src/lib.logger';

      const error = new Error('thrown');
      console.error(error);
    `;

    const expected = outdent`
      import { logError } from "src/lib.logger";
      import { logError } from 'src/lib.logger';

      const error = new Error('thrown');
      logError(error);
    `;

    expect(transform({source})).toEqual(expected);
  });

  it('do not touch console, if defined outside global scope', async () => {
    const source = outdent`
      (
        function () {
          const console = {
            error: (err) => err,
          };
          console.error( 'error' );
        }
      )();
    `;

    const expected = outdent`
      (
        function () {
          const console = {
            error: (err) => err,
          };
          console.error( 'error' );
        }
      )();
    `;

    expect(transform({source})).toEqual(expected);
  });
})
