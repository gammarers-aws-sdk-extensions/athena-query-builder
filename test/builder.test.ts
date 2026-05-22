import { AthenaQueryBuilder } from '../src';

test('hello', () => {
  expect(new AthenaQueryBuilder().build()).toBe('hello, world!');
});