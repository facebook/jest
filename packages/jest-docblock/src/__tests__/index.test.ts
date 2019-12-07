/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {EOL} from 'os';
import * as docblock from '..';

describe('docblock', () => {
  it('extracts valid docblock with line comment', () => {
    const code =
      '/**' +
      EOL +
      ' * @team foo' +
      EOL +
      '* // TODO: test' +
      EOL +
      '*/' +
      EOL +
      'const x = foo;';
    expect(docblock.extract(code)).toBe(
      '/**' + EOL + ' * @team foo' + EOL + '* // TODO: test' + EOL + '*/',
    );
  });

  it('extracts valid docblock after a line with shebang', () => {
    const code = `#!/usr/bin/env node
    /**
    * @team foo
    */
    const x = foo;`;

    expect(docblock.extract(code)).toBe(
      `/**
    * @team foo
    */`,
    );
  });

  it('extracts valid docblock', () => {
    const code =
      '/**' + EOL + ' * @team foo' + EOL + '*/' + EOL + 'const x = foo;';
    expect(docblock.extract(code)).toBe(
      '/**' + EOL + ' * @team foo' + EOL + '*/',
    );
  });

  it('extracts valid docblock with more comments', () => {
    const code =
      '/**' +
      EOL +
      ' * @team foo' +
      EOL +
      '*/' +
      EOL +
      'const x = foo;' +
      EOL +
      '/**foo*/';
    expect(docblock.extract(code)).toBe(
      '/**' + EOL + ' * @team foo' + EOL + '*/',
    );
  });

  it('extracts from invalid docblock', () => {
    const code =
      '/*' + EOL + ' * @team foo' + EOL + '*/' + EOL + 'const x = foo;';
    expect(docblock.extract(code)).toBe(
      '/*' + EOL + ' * @team foo' + EOL + '*/',
    );
  });

  it('returns extract and parsedocblock', () => {
    const code =
      '/** @provides module-name */' +
      EOL +
      '' +
      '' +
      EOL +
      '' +
      '.dummy {}' +
      EOL +
      '';

    expect(docblock.parse(docblock.extract(code))).toEqual({
      provides: 'module-name',
    });
  });

  it('parses directives out of a docblock', () => {
    const code =
      '/**' +
      EOL +
      '' +
      ' * @team foo' +
      EOL +
      '' +
      ' * @css a b' +
      EOL +
      '' +
      ' * @preserve-whitespace' +
      EOL +
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
      EOL +
      '' +
      ' * @x foo' +
      EOL +
      '' +
      ' * @x bar' +
      EOL +
      '' +
      ' * @y' +
      EOL +
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
      EOL +
      '' +
      ' * @x foo' +
      EOL +
      '' +
      ' * @x bar' +
      EOL +
      '' +
      ' * @x baz' +
      EOL +
      '' +
      ' */';
    expect(docblock.parse(code)).toEqual({
      x: ['foo', 'bar', 'baz'],
    });
  });

  it('parses directives out of a docblock with comments', () => {
    const code =
      '/**' +
      EOL +
      '' +
      ' * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.' +
      EOL +
      '' +
      ' * @team foo' +
      EOL +
      '' +
      ' * @css a b' +
      EOL +
      '' +
      ' *' +
      EOL +
      '' +
      ' * And some license here' +
      EOL +
      '' +
      ' * @preserve-whitespace' +
      EOL +
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
      EOL +
      '' +
      ' * @team foo' +
      EOL +
      '' +
      ' * // TODO: test' +
      EOL +
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
      EOL +
      '' +
      ' * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.' +
      EOL +
      '' +
      ' * @class A long declaration of a class' +
      EOL +
      '' +
      ' *        goes here, so we can read it and enjoy' +
      EOL +
      '' +
      ' *' +
      EOL +
      '' +
      ' * And some license here' +
      EOL +
      '' +
      ' * @preserve-whitespace' +
      EOL +
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
      EOL +
      '' +
      ' * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.' +
      EOL +
      '' +
      ' * @class A long declaration of a class' +
      EOL +
      '' +
      ' *        goes here, so we can read it and enjoy' +
      EOL +
      '' +
      ' *' +
      EOL +
      '' +
      ' * And some license here' +
      EOL +
      '' +
      ' * @preserve-whitespace' +
      EOL +
      '' +
      '// heres a comment' +
      ' */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments:
        'Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.' +
        EOL +
        EOL +
        'And some license here' +
        EOL +
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
    const code = '/**' + EOL + ' * @team apple/banana' + EOL + ' */';
    expect(docblock.parse(code)).toEqual({
      team: 'apple/banana',
    });
  });

  it('extracts comments from docblock', () => {
    const code =
      '/**' + EOL + ' * hello world' + EOL + ' * @flow yes' + EOL + ' */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: 'hello world',
      pragmas: {flow: 'yes'},
    });
  });

  it('extracts multiline comments from docblock', () => {
    const code =
      '/**' +
      EOL +
      ' * hello' +
      EOL +
      ' * world' +
      EOL +
      ' * @flow yes' +
      EOL +
      ' */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: 'hello' + EOL + 'world',
      pragmas: {flow: 'yes'},
    });
  });

  it('preserves leading whitespace in multiline comments from docblock', () => {
    const code = '/**' + EOL + ' *  hello' + EOL + ' *   world' + EOL + ' */';

    expect(docblock.parseWithComments(code).comments).toEqual(
      ' hello' + EOL + '  world',
    );
  });

  it('removes leading newlines in multiline comments from docblock', () => {
    const code =
      '/**' +
      EOL +
      ' * @snailcode' +
      EOL +
      ' *' +
      EOL +
      ' *  hello world' +
      EOL +
      ' */';

    expect(docblock.parseWithComments(code).comments).toEqual(' hello world');
  });

  it('extracts comments from beginning and end of docblock', () => {
    const code =
      '/**' +
      EOL +
      ' * hello' +
      EOL +
      ' * @flow yes' +
      EOL +
      ' * ' +
      EOL +
      ' * world' +
      EOL +
      ' */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: 'hello' + EOL + EOL + 'world',
      pragmas: {flow: 'yes'},
    });
  });

  it("preserve urls within a pragma's values", () => {
    const code = '/**' + EOL + ' * @see: https://example.com' + EOL + ' */';
    expect(docblock.parseWithComments(code)).toEqual({
      comments: '',
      pragmas: {'see:': 'https://example.com'},
    });
  });

  it('strip linecomments from pragmas but preserve for comments', () => {
    const code = '/**' + EOL + ' * @format: everything' + EOL + '// keep me */';
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
    const code = 'someCodeAtTheTop();';
    expect(docblock.strip(code)).toEqual(code);
  });

  it('strips a docblock even if its not at the top', () => {
    const code = 'someCodeAtTheTop();\n/** docblock */';
    expect(docblock.strip(code)).toEqual('someCodeAtTheTop();\n');
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
      '/**' + EOL + ' * @flow' + EOL + ' * @format' + EOL + ' */',
    );
  });

  it('prints docblocks with multiple of the same pragma', () => {
    const pragmas = {
      x: ['a', 'b'],
      y: 'c',
    };
    expect(docblock.print({pragmas})).toEqual(
      '/**' + EOL + ' * @x a' + EOL + ' * @x b' + EOL + ' * @y c' + EOL + ' */',
    );
  });
  it('prints docblocks with pragmas', () => {
    const pragmas = {
      flow: 'foo',
      team: 'x/y/z',
    };
    expect(docblock.print({pragmas})).toEqual(
      '/**' + EOL + ' * @flow foo' + EOL + ' * @team x/y/z' + EOL + ' */',
    );
  });

  it('prints docblocks with comments', () => {
    const pragmas = {flow: 'foo'};
    const comments = 'hello';
    expect(docblock.print({comments, pragmas})).toEqual(
      '/**' +
        EOL +
        ' * hello' +
        EOL +
        ' *' +
        EOL +
        ' * @flow foo' +
        EOL +
        ' */',
    );
  });

  it('prints docblocks with comments and no keys', () => {
    const pragmas = {};
    const comments =
      'Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.';
    expect(docblock.print({comments, pragmas})).toEqual(
      '/**' + EOL + ' * ' + comments + EOL + ' */',
    );
  });

  it('prints docblocks with multiline comments', () => {
    const pragmas = {};
    const comments = 'hello' + EOL + 'world';
    expect(docblock.print({comments, pragmas})).toEqual(
      '/**' + EOL + ' * hello' + EOL + ' * world' + EOL + ' */',
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
    const before = '/**' + EOL + ' * Legalese' + EOL + ' * @flow' + EOL + ' */';
    const {comments, pragmas} = docblock.parseWithComments(before);
    pragmas.format = '';
    const after = docblock.print({comments, pragmas});
    expect(after).toEqual(
      '/**' +
        EOL +
        ' * Legalese' +
        EOL +
        ' *' +
        EOL +
        ' * @flow' +
        EOL +
        ' * @format' +
        EOL +
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
