/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import chalk from 'chalk';
import pretty from 'pretty-format';
import {Global} from '@jest/types';

type TemplateData = Global.TemplateData;

const EXPECTED_COLOR = chalk.green;
const RECEIVED_COLOR = chalk.red;

export const validateArrayTable = (table: any) => {
  if (!Array.isArray(table)) {
    throw new Error(
      '`.each` must be called with an Array or Tagged Template Literal.\n\n' +
        `Instead was called with: ${pretty(table, {
          maxDepth: 1,
          min: true,
        })}\n`,
    );
  }

  if (isTaggedTemplateLiteral(table)) {
    if (isEmptyString(table[0])) {
      throw new Error(
        'Error: `.each` called with an empty Tagged Template Literal of table data.\n',
      );
    }

    throw new Error(
      'Error: `.each` called with a Tagged Template Literal with no data, remember to interpolate with ${expression} syntax.\n',
    );
  }

  if (isEmptyTable(table)) {
    throw new Error(
      'Error: `.each` called with an empty Array of table data.\n',
    );
  }
};

const isTaggedTemplateLiteral = (array: any) => array.raw !== undefined;
const isEmptyTable = (table: Array<any>) => table.length === 0;
const isEmptyString = (str: string | unknown) =>
  typeof str === 'string' && str.trim() === '';

export const validateTemplateTableHeadings = (
  headings: Array<string>,
  data: TemplateData,
) => {
  const missingHeadings = headings.length === 0;
  if (missingHeadings === true) {
    throw new Error('Headings are required');
  }

  const missingData = data.length % headings.length;

  if (missingData > 0) {
    throw new Error(
      'Not enough arguments supplied for given headings:\n' +
        EXPECTED_COLOR(headings.join(' | ')) +
        '\n\n' +
        'Received:\n' +
        RECEIVED_COLOR(pretty(data)) +
        '\n\n' +
        `Missing ${RECEIVED_COLOR(missingData.toString())} ${pluralize(
          'argument',
          missingData,
        )}`,
    );
  }
};

const pluralize = (word: string, count: number) =>
  word + (count === 1 ? '' : 's');
