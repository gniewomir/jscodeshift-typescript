import {describe, expect, it} from "vitest";
import {createTestTransform} from "./test-kit";
import transformer from "./drop-console";
import { outdent } from 'outdent';


describe('drop-console', () => {
  const transform = createTestTransform(transformer);

  it('removes all console logs/errors/warnings etc.', async () => {
    const source = outdent`
      const err = new Error('thrown');
      console.log('error string');
      console.log(new Error('error string'));
      console.log(err);

      console.error('error string');
      console.error(new Error('error string'));
      console.error(err);
    `;

    const expected = outdent`
      const err = new Error('thrown');
    `;

    expect(transform({ source })).toEqual(expected);
  })
})
