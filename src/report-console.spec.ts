import {describe, expect, it} from "vitest";
import {createTestTransform} from "./test-kit";
import transformer from "./report-console";
import { outdent } from 'outdent';


describe('report-console', () => {
  const transform = createTestTransform(transformer);

  it('do not modify source', async () => {
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
      console.log('error string');
      console.log(new Error('error string'));
      console.log(err);

      console.error('error string');
      console.error(new Error('error string'));
      console.error(err);
    `;

    expect(transform({ source })).toEqual(expected);
  })
})
