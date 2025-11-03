import {describe, expect, it} from "vitest";
import {createTestTransform} from "./test-kit";
import transformer from "./soc-console-error-to-log-error";
import {outdent} from 'outdent';


describe('soc-console-error-to-log-error', () => {
  const transform = createTestTransform(transformer);

  it('replaces console.error( error ) calls with logError calls and imports logError', async () => {
    const source = outdent`
      const error = new Error('thrown');
      console.error('test', error, { service: 'test' });
    `;

    const expected = outdent`
      import { logError } from "src/lib.logger";
      const error = new Error('thrown');
      logError('test', error, { service: 'test' });
    `;

    expect(transform({source})).toEqual(expected);
  });

  it('do not duplicate imports', async () => {
    const source = outdent`
      import { log } from 'src/lib.logger';

      const error = new Error('thrown');
      console.error(error);
      log(error);
    `;

    const expected = outdent`
      import { log, logError } from "src/lib.logger";

      const error = new Error('thrown');
      logError(error);
      log(error);
    `;

    expect(transform({source})).toEqual(expected);
  });

  it('do not duplicate import specifiers', async () => {
    const source = outdent`
      import { logError } from 'src/lib.logger';

      const error = new Error('thrown');
      console.error(error);
      logError(error);
    `;

    const expected = outdent`
      import { logError } from 'src/lib.logger';

      const error = new Error('thrown');
      logError(error);
      logError(error);
    `;

    expect(transform({source})).toEqual(expected);
  });

  it('do not put imports above comments, if there was no imports before', async () => {
    const source = outdent`
      /* eslint-disable no-unused-vars */
      // comment 1
      const error = new Error('thrown');
      // comment 2
      console.error(error);
      // comment 3
      statement;
    `;

    const expected = outdent`
      /* eslint-disable no-unused-vars */
      // comment 1
      import { logError } from "src/lib.logger";

      const error = new Error('thrown');
      // comment 2
      logError(error);
      // comment 3
      statement;
    `;

    expect(transform({source})).toEqual(expected);
  })

  it('do not replace arrow function expressions', async () => {
    const source = outdent`
      import { logError } from 'src/lib.logger';

      const error = new Error('thrown');
      (
        (error) => console.error(error)
      )(error);
    `;

    const expected = outdent`
      import { logError } from 'src/lib.logger';

      const error = new Error('thrown');
      (
        (error) => logError(error)
      )(error);
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
