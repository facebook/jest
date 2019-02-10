/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 * All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import os from 'os';
import * as docblock from '..';

describe('docblock', () => {
  it('extracts valid docblock with line comment', () => {
    const code =
      '/**' +
      os.EOL +
      ' * @team foo' +
      os.EOL +
      '* // TODO: test' +
      os.EOL +
      '*/' +
      os.EOL +
      'const x = foo;';
    expect(docblock.extract(code)).toBe(
      '/**' +
        os.EOL +
        ' * @team foo' +
        os.EOL +
        '* // TODO: test' +
        os.EOL +
        '*/',
    );
  });

  it('extracts valid docblock', () => {
    const code =
      '/**' +
      os.EOL +
      ' * @team foo' +
      os.EOL +
      '*/' +
      os.EOL +
      'const x = foo;';
    expect(docblock.extract(code)).toBe(
      '/**' + os.EOL + ' * @team foo' + os.EOL + '*/',
    );
  });

  it('extracts valid docblock with more comments', () => {
    const code =
      '/**' +
      os.EOL +
      ' * @team foo' +
      os.EOL +
      '*/' +
      os.EOL +
      'const x = foo;' +
      os.EOL +
      '/**foo*/';
    expect(docblock.extract(code)).toBe(
      '/**' + os.EOL + ' * @team foo' + os.EOL + '*/',
    );
  });

  it('extracts from invalid docblock', () => {
    const code =
      '/*' +
      os.EOL +
      ' * @team foo' +
      os.EOL +
      '*/' +
      os.EOL +
      'const x = foo;';
    expect(docblock.extract(code)).toBe(
      '/*' + os.EOL + ' * @team foo' + os.EOL + '*/',
    );
  });

  it('returns extract and parsedocblock', () => {
    const code =
      '/** @provides module-name */' +
      os.EOL +
      '' +
      '' +
      os.EOL +
      '' +
      '.dummy {}' +
      os.EOL +
      '';

    expect(docblock.parse(docblock.extract(code))).toEqual({
      provides: 'module-name',
    });
  });

  it('parses directives out of a docblock', () => {
    const code =
      '/**' +
      os.EOL +
      '' +
      ' * @team foo' +
      os.EOL +
      '' +
      ' * @css a b' +
      os.EOL +
      '' +
      ' * @preserve-whitespace' +
      os.EOL +
      '' +
      ' */';
    expect(docblock.parse(code)).toEqual({
      css: 'a b',
      'preserve-whitespace': '',
      team: 'foo',
    });
  });

  it('parses multiple of the same directives out of a docblock', () => {
    const code =
      '/**' +
      os.EOL +
      '' +
      ' * @x foo' +
      os.EOL +
      '' +
      ' * @x bar' +
      os.EOL +
      '' +
      ' * @y' +
      os.EOL +
      '' +
      ' */';
    expect(docblock.parse(code)).toEqual({
      x: ['foo', 'bar'],
      y: '',
    });
  });

  it('parses >=3 of the same directives out of a docblock', () => {
    const code =
      '/**' +
      os.EOL +
      '' +
      ' * @x foo' +
      os.EOL +
      '' +
      ' * @x bar' +
      os.EOL +
      '' +
      ' * @x baz' +
      os.EOL +
      '' +
      ' */';
    expect(docblock.parse(code)).toEqual({
      x: ['foo', 'bar', 'baz'],
    });
  });

  it('parses directives out of a docblock with comments', () => {
    const code =
      '/**' +
      os.EOL +
      '' +
      ' * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.' +
      os.EOL +
      '' +
      ' * @team foo' +
      os.EOL +
      '' +
      ' * @css a b' +
      os.EOL +
      '' +
      ' *' +
      os.EOL +
      '' +
      ' * And some license here' +
      os.EOL +
      '' +
      ' * @preserve-whitespace' +
      os.EOL +
      '' +
      ' */';
    expect(docblock.parse(code)).toEqual({
      css: 'a b',
      'preserve-whitespace': '',
      team: 'foo',
    });
  });

  it('parses directives out of a docblock with line comments', () => {
    const code =
      '/**' +
      os.EOL +
      '' +
      ' * @team foo' +
      os.EOL +
      '' +
      ' * // TODO: test' +
      os.EOL +
      '' +
      ' */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: '// TODO: test',
      pragmas: {team: 'foo'},
    });
  });

  it('parses multiline directives', () => {
    const code =
      '/**' +
      os.EOL +
      '' +
      ' * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.' +
      os.EOL +
      '' +
      ' * @class A long declaration of a class' +
      os.EOL +
      '' +
      ' *        goes here, so we can read it and enjoy' +
      os.EOL +
      '' +
      ' *' +
      os.EOL +
      '' +
      ' * And some license here' +
      os.EOL +
      '' +
      ' * @preserve-whitespace' +
      os.EOL +
      '' +
      ' */';
    expect(docblock.parse(code)).toEqual({
      class:
        'A long declaration of a class goes here, ' +
        'so we can read it and enjoy',
      'preserve-whitespace': '',
    });
  });

  it('parses multiline directives even if there are linecomments within the docblock', () => {
    const code =
      '/**' +
      os.EOL +
      '' +
      ' * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.' +
      os.EOL +
      '' +
      ' * @class A long declaration of a class' +
      os.EOL +
      '' +
      ' *        goes here, so we can read it and enjoy' +
      os.EOL +
      '' +
      ' *' +
      os.EOL +
      '' +
      ' * And some license here' +
      os.EOL +
      '' +
      ' * @preserve-whitespace' +
      os.EOL +
      '' +
      '// heres a comment' +
      ' */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments:
        'Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.' +
        os.EOL +
        os.EOL +
        'And some license here' +
        os.EOL +
        '// heres a comment',
      pragmas: {
        class:
          'A long declaration of a class goes here, ' +
          'so we can read it and enjoy',
        'preserve-whitespace': '',
      },
    });
  });

  it('supports slashes in @team directive', () => {
    const code = '/**' + os.EOL + ' * @team apple/banana' + os.EOL + ' */';
    expect(docblock.parse(code)).toEqual({
      team: 'apple/banana',
    });
  });

  it('extracts comments from docblock', () => {
    const code =
      '/**' +
      os.EOL +
      ' * hello world' +
      os.EOL +
      ' * @flow yes' +
      os.EOL +
      ' */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: 'hello world',
      pragmas: {flow: 'yes'},
    });
  });

  it('extracts multiline comments from docblock', () => {
    const code =
      '/**' +
      os.EOL +
      ' * hello' +
      os.EOL +
      ' * world' +
      os.EOL +
      ' * @flow yes' +
      os.EOL +
      ' */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: 'hello' + os.EOL + 'world',
      pragmas: {flow: 'yes'},
    });
  });

  it('preserves leading whitespace in multiline comments from docblock', () => {
    const code =
      '/**' + os.EOL + ' *  hello' + os.EOL + ' *   world' + os.EOL + ' */';

    expect(docblock.parseWithComments(code).comments).toEqual(
      ' hello' + os.EOL + '  world',
    );
  });

  it('removes leading newlines in multiline comments from docblock', () => {
    const code =
      '/**' +
      os.EOL +
      ' * @snailcode' +
      os.EOL +
      ' *' +
      os.EOL +
      ' *  hello world' +
      os.EOL +
      ' */';

    expect(docblock.parseWithComments(code).comments).toEqual(' hello world');
  });

  it('extracts comments from beginning and end of docblock', () => {
    const code =
      '/**' +
      os.EOL +
      ' * hello' +
      os.EOL +
      ' * @flow yes' +
      os.EOL +
      ' * ' +
      os.EOL +
      ' * world' +
      os.EOL +
      ' */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: 'hello' + os.EOL + os.EOL + 'world',
      pragmas: {flow: 'yes'},
    });
  });

  it("preserve urls within a pragma's values", () => {
    const code =
      '/**' + os.EOL + ' * @see: https://example.com' + os.EOL + ' */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: '',
      pragmas: {'see:': 'https://example.com'},
    });
  });

  it('strip linecomments from pragmas but preserve for comments', () => {
    const code =
      '/**' + os.EOL + ' * @format: everything' + os.EOL + '// keep me */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: '// keep me',
      pragmas: {'format:': 'everything'},
    });
  });

  it('extracts docblock comments as CRLF when docblock contains CRLF', () => {
    const code = '/**\r\n * foo\r\n * bar\r\n*/';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: 'foo\r\nbar',
      pragmas: {},
    });
  });

  it('extracts docblock comments as LF when docblock contains LF', () => {
    const code = '/**\n * foo\n * bar\n*/';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: 'foo\nbar',
      pragmas: {},
    });
  });

  it('strips the docblock out of a file that contains a top docblock', () => {
    const code = '/**\n * foo\n * bar\n*/\nthe rest';
    expect(docblock.strip(code)).toEqual('\nthe rest');
  });

  it('returns a file unchanged if there is no top docblock to strip', () => {
    const code = 'someCodeAtTheTop();\n/** docblock */';
    expect(docblock.strip(code)).toEqual(code);
  });

  it('prints docblocks with no pragmas as empty string', () => {
    const pragmas = {};
    expect(docblock.print({pragmas})).toEqual('');
  });

  it('prints docblocks with one pragma on one line', () => {
    const pragmas = {flow: ''};
    expect(docblock.print({pragmas})).toEqual('/** @flow */');
  });

  it('prints docblocks with multiple pragmas on multiple lines', () => {
    const pragmas = {
      flow: '',
      format: '',
    };
    expect(docblock.print({pragmas})).toEqual(
      '/**' + os.EOL + ' * @flow' + os.EOL + ' * @format' + os.EOL + ' */',
    );
  });

  it('prints docblocks with multiple of the same pragma', () => {
    const pragmas = {
      x: ['a', 'b'],
      y: 'c',
    };
    expect(docblock.print({pragmas})).toEqual(
      '/**' +
        os.EOL +
        ' * @x a' +
        os.EOL +
        ' * @x b' +
        os.EOL +
        ' * @y c' +
        os.EOL +
        ' */',
    );
  });
  it('prints docblocks with pragmas', () => {
    const pragmas = {
      flow: 'foo',
      team: 'x/y/z',
    };
    expect(docblock.print({pragmas})).toEqual(
      '/**' +
        os.EOL +
        ' * @flow foo' +
        os.EOL +
        ' * @team x/y/z' +
        os.EOL +
        ' */',
    );
  });

  it('prints docblocks with comments', () => {
    const pragmas = {flow: 'foo'};
    const comments = 'hello';
    expect(docblock.print({comments, pragmas})).toEqual(
      '/**' +
        os.EOL +
        ' * hello' +
        os.EOL +
        ' *' +
        os.EOL +
        ' * @flow foo' +
        os.EOL +
        ' */',
    );
  });

  it('prints docblocks with comments and no keys', () => {
    const pragmas = {};
    const comments =
      'Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.';
    expect(docblock.print({comments, pragmas})).toEqual(
      '/**' + os.EOL + ' * ' + comments + os.EOL + ' */',
    );
  });

  it('prints docblocks with multiline comments', () => {
    const pragmas = {};
    const comments = 'hello' + os.EOL + 'world';
    expect(docblock.print({comments, pragmas})).toEqual(
      '/**' + os.EOL + ' * hello' + os.EOL + ' * world' + os.EOL + ' */',
    );
  });

  it('prints docblocks that are parseable', () => {
    const pragmas = {a: 'b', c: ''};
    const comments = 'hello world!';
    const formatted = docblock.print({comments, pragmas});
    const parsed = docblock.parse(formatted);
    expect(parsed).toEqual(pragmas);
  });

  it('can augment existing docblocks with comments', () => {
    const before =
      '/**' + os.EOL + ' * Legalese' + os.EOL + ' * @flow' + os.EOL + ' */';
    const {comments, pragmas} = docblock.parseWithComments(before);
    pragmas.format = '';
    const after = docblock.print({comments, pragmas});
    expect(after).toEqual(
      '/**' +
        os.EOL +
        ' * Legalese' +
        os.EOL +
        ' *' +
        os.EOL +
        ' * @flow' +
        os.EOL +
        ' * @format' +
        os.EOL +
        ' */',
    );
  });

  it('prints docblocks using CRLF if comments contains CRLF', () => {
    const pragmas = {};
    const comments = 'hello\r\nworld';
    const formatted = docblock.print({comments, pragmas});
    expect(formatted).toEqual('/**\r\n * hello\r\n * world\r\n */');
  });

  it('prints docblocks using LF if comments contains LF', () => {
    const pragmas = {};
    const comments = 'hello\nworld';
    const formatted = docblock.print({comments, pragmas});
    expect(formatted).toEqual('/**\n * hello\n * world\n */');
  });
});
