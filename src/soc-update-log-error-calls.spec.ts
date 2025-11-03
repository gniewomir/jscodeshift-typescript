import {describe, expect, it} from "vitest";
import {createTestTransform} from "./test-kit";
import transformer from "./soc-console-error-to-log-error";
import {outdent} from "outdent";

describe('soc-update-log-error-calls', () => {
  const transform = createTestTransform(transformer);

  it('replaces undefined with null in log error calls', async () => {
    const source = outdent`
      logError('test', undefined, { service: 'test' });
    `;

    const expected = outdent`
      logError('test', null, { service: 'test' });
    `;

    expect(transform({source})).toEqual(expected);
  });
});
