import { escapeRegExp } from 'lodash';

const SPECIAL_CHARS_MAP = {
  '!': '_BANG_',
  '%': '_PERCENT_',
  '*': '_STAR_',
  '+': '_PLUS_',
  '/': '_SLASH_',
  '<': '_LT_',
  '=': '_EQ_',
  '>': '_GT_',
  '?': '_QMARK_',
  '-': '_'
};
const SPECIAL_CHARS_INVERTED_MAP = Object.keys(SPECIAL_CHARS_MAP).reduce(
  (map, key) => Object.assign(map, { [SPECIAL_CHARS_MAP[key]]: key }),
  {}
);

const SPECIAL_CHARS = Object.keys(SPECIAL_CHARS_MAP).join('');
const SPECIAL_CHARS_REGEXP = new RegExp(
  `[${escapeRegExp(SPECIAL_CHARS)}]`,
  'g'
);

const SPECIAL_CHARS_INVERTED = Object.keys(SPECIAL_CHARS_INVERTED_MAP).join(
  '|'
);
const SPECIAL_CHARS_INVERTED_REGEXP = new RegExp(SPECIAL_CHARS_INVERTED, 'g');

const ANONYMOUS_FIRST_ARGUMENT_REGEXP = /^\%$/;

export function denormalize(str) {
  return str.replace(
    SPECIAL_CHARS_INVERTED_REGEXP,
    char => SPECIAL_CHARS_INVERTED_MAP[char]
  );
}

export default function normalize(str) {
  return str
    .replace(ANONYMOUS_FIRST_ARGUMENT_REGEXP, () => '_PERCENT_1')
    .replace(SPECIAL_CHARS_REGEXP, char => SPECIAL_CHARS_MAP[char]);
}
