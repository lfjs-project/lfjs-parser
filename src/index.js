import Tokenizer, { invalidCharacterError } from './tokenizer';
import normalize from './normalize';

const SYMBOL_REGEXP = /[^()\[\]\{\}\#"'`,:;\|\s]/;
const FLOAT_REGEXP = /^[-+]?[0-9]+\.[0-9]*$/;
const INTEGER_REGEXP = /^[-+]?[0-9]+$/;
const ANONYMOUS_ARGUMENT_REGEXP = /^\%[0-9]?$/;

export default function parse(str) {
  let tokens = new Tokenizer(str).parse();
  let tree = [list()];
  let anonymousParams = [];
  let current;

  let iterator = tokens[Symbol.iterator]();
  let token = iterator.next();
  let lastType;

  while (!token.done) {
    let { chars, type } = token.value;

    switch (type) {
      case 'dispatch':
      case 'meta':
        break;
      case 'comment':
        push(tree, comment(chars));
        break;
      // List or Function
      case 'open-paren':
        current = list();
        push(tree, current);

        if (lastType === 'dispatch') {
          current.anonymous = true;
          anonymousParams.unshift(new Set());
        }

        tree.unshift(current);
        break;
      // Vector
      case 'open-bracket':
        current = ESNode('vector', []);
        push(tree, current);

        tree.unshift(current);
        break;
      // Map or Set
      case 'open-brace':
        switch (lastType) {
          case 'dispatch':
            current = ESNode('set', []);

            push(tree, current);
            break;
          case 'meta':
            current = ESNode('map', []);

            push(tree, list(symbol('with-meta'), current));
            break;
          default:
            current = ESNode('map', []);

            push(tree, current);
        }

        tree.unshift(current);
        break;
      case 'close-delimiter':
        postProcessNode(tree.shift(), anonymousParams);
        break;
      case 'rest':
        push(tree, rest(iterator.next().value.chars));
        break;
      // Wrapping
      case 'deref':
      case 'quote':
        push(tree, list(symbol(type)));
        break;
      // Keyword
      case 'keyword':
        if (lastType === 'meta') {
          push(
            tree,
            list(
              symbol('with-meta'),
              ESNode('map', [keyword(chars), literal(true)])
            )
          );
        } else {
          push(tree, keyword(chars));
        }
        break;
      // String or RegExp
      case 'string':
        if (lastType === 'dispatch') {
          push(tree, regexp(chars));
        } else {
          push(tree, string(chars));
        }
        break;
      // Symbol or Number
      case 'symbol':
        if (FLOAT_REGEXP.test(chars)) {
          push(tree, float(chars));
        } else if (INTEGER_REGEXP.test(chars)) {
          push(tree, integer(chars));
        } else if (ANONYMOUS_ARGUMENT_REGEXP.test(chars)) {
          if (anonymousParams[0]) {
            anonymousParams[0].add(chars);
          } else {
            invalidCharacterError(chars, 'not an anonymous function');
          }
          push(tree, symbol(chars));
        } else if (SYMBOL_REGEXP.test(chars)) {
          push(tree, symbol(chars));
        }
        break;
    }

    lastType = type;
    token = iterator.next();
  }

  return val(tree);
}

function val(tree) {
  return tree[0].value;
}

function isMeta(node) {
  return node.type === 'list' &&
    node.value.length === 2 &&
    node.value[0].value === 'with_meta';
}

function isWrapping(node) {
  return node.type === 'list' &&
    node.value.length === 1 &&
    (node.value[0].value === 'deref' || node.value[0].value === 'quote');
}

function push(tree, value) {
  let nodes = val(tree);
  if (nodes.length > 0) {
    let node = nodes[nodes.length - 1];

    if (isMeta(node)) {
      node.value.push(value, node.value.pop());
      return;
    }

    if (isWrapping(node)) {
      node.value.push(value);
      return;
    }
  }

  nodes.push(value);
}

function postProcessNode(node, anonymousParams) {
  switch (node.type) {
    case 'list':
      anonymousFnArguments(node, anonymousParams);
  }
}

function anonymousFnArguments(node, anonymousParams) {
  if (node.anonymous) {
    delete node.anonymous;

    let params = Array.from(anonymousParams.shift());
    let max = params.sort().pop();

    if (max) {
      max = parseInt(max.replace('%', '') || 1, 10);
      params = [...Array(max)].map((_, i) => identifier(`%${i+1}`));
    }

    node.value = [
      identifier('fn'),
      ESNode('vector', params),
      list(...node.value)
    ];
  }
}

function ESNode(type, value, raw = null) {
  let node = { type, value };

  if (raw) {
    node.raw = raw;
  }

  return node;
}

function list(...value) {
  return ESNode('list', value);
}

function comment(value) {
  return ESNode('comment', value);
}

function string(chars) {
  return ESNode('string', chars, `"${chars}"`);
}

function keyword(value) {
  return ESNode('keyword', value, `"${value}"`);
}

function regexp(value) {
  return ESNode('regexp', new RegExp(value), `/${value}/`);
}

function float(value) {
  return ESNode('float', parseFloat(value, 10), value);
}

function integer(value) {
  return ESNode('integer', parseInt(value, 10), value);
}

function literal(value) {
  return ESNode('literal', value, `${value}`);
}

function identifier(value) {
  return ESNode('identifier', normalize(value));
}

function rest(value) {
  return ESNode('rest', normalize(value));
}

function symbol(value) {
  switch (value) {
    case 'nil':
      return literal(null);
    case 'true':
      return literal(true);
    case 'false':
      return literal(false);
    default:
      return identifier(value);
  }
}
