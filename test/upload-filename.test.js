import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeUploadFilename } from '../src/lib/utils.js';

test('decodes UTF-8 upload filenames interpreted as Latin-1', () => {
  const filename = 'Thời khóa biểu tuần 1.xlsx';
  const encodedAsLatin1 = Buffer.from(filename, 'utf8').toString('latin1');

  assert.equal(decodeUploadFilename(encodedAsLatin1), filename);
});

test('preserves already-decoded and ASCII filenames', () => {
  assert.equal(decodeUploadFilename('Thời khóa biểu.xlsx'), 'Thời khóa biểu.xlsx');
  assert.equal(decodeUploadFilename('timetable.csv'), 'timetable.csv');
});
