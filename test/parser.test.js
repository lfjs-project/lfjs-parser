import { assert } from 'chai';

import parse from '../src/index';

describe('#parse', function() {
  it('should parse an empty string', function() {
    assert.deepEqual(parse(''), []);
  });

  it('should parse comments', function() {
    assert.deepEqual(parse('; Hello World'), [
      { type: 'comment', value: ' Hello World' }
    ]);
  });

  describe('literals', function() {
    it('string', function() {
      assert.deepEqual(parse('"yolo"'), [
        {
          type: 'string',
          raw: '"yolo"',
          value: 'yolo'
        }
      ]);
    });

    it('string with spaces', function() {
      assert.deepEqual(parse('"hello world  "'), [
        {
          type: 'string',
          raw: '"hello world  "',
          value: 'hello world  '
        }
      ]);
    });

    it('string with special characters', function() {
      assert.deepEqual(parse('"hello [world] # -> ()"'), [
        {
          type: 'string',
          raw: '"hello [world] # -> ()"',
          value: 'hello [world] # -> ()'
        }
      ]);
    });

    it('multiline string', function() {
      assert.deepEqual(
        parse(
          `"hello
world"`
        ),
        [
          {
            type: 'string',
            raw: '"hello\nworld"',
            value: 'hello\nworld'
          }
        ]
      );
    });

    describe('number', function() {
      it('integer', function() {
        assert.deepEqual(parse('1'), [
          {
            type: 'integer',
            raw: '1',
            value: 1
          }
        ]);
      });

      it('negatif integer', function() {
        assert.deepEqual(parse('-1'), [
          {
            type: 'integer',
            raw: '-1',
            value: -1
          }
        ]);
      });

      it('float', function() {
        assert.deepEqual(parse('1.1'), [
          {
            type: 'float',
            raw: '1.1',
            value: 1.1
          }
        ]);
      });

      it('negatif float', function() {
        assert.deepEqual(parse('-1.1'), [
          {
            type: 'float',
            raw: '-1.1',
            value: -1.1
          }
        ]);
      });
    });

    describe('boolean', function() {
      it('true', function() {
        assert.deepEqual(parse('true'), [
          {
            type: 'literal',
            raw: 'true',
            value: true
          }
        ]);
      });

      it('false', function() {
        assert.deepEqual(parse('false'), [
          {
            type: 'literal',
            raw: 'false',
            value: false
          }
        ]);
      });
    });

    it('nil', function() {
      assert.deepEqual(parse('nil'), [
        {
          type: 'literal',
          raw: 'null',
          value: null
        }
      ]);
    });
  });

  describe('symbols', function() {
    it('identifier', function() {
      assert.deepEqual(parse('yolo'), [
        {
          type: 'identifier',
          value: 'yolo'
        }
      ]);
    });

    it('identifier with special character', function() {
      assert.deepEqual(parse('yolo->'), [
        {
          type: 'identifier',
          value: 'yolo__GT_'
        }
      ]);
    });

    it('special characters', function() {
      let chars = {
        '!': '_BANG_',
        '*': '_STAR_',
        '+': '_PLUS_',
        '/': '_SLASH_',
        '<': '_LT_',
        '=': '_EQ_',
        '>': '_GT_',
        '?': '_QMARK_',
        '-': '_'
      };

      Object.keys(chars).forEach(key => {
        assert.deepEqual(parse(key), [
          {
            type: 'identifier',
            value: chars[key]
          }
        ]);
      });

      assert.throws(
        () => parse('%'),
        'Invalid character "%" in not an anonymous function.'
      );
      assert.throws(
        () => parse('%1'),
        'Invalid character "%1" in not an anonymous function.'
      );
    });
  });

  it('keyword', function() {
    assert.deepEqual(parse(':yolo'), [
      {
        type: 'keyword',
        raw: '"yolo"',
        value: 'yolo'
      }
    ]);
  });

  it('regexp', function() {
    assert.deepEqual(parse('#".*"'), [
      {
        type: 'regexp',
        raw: '/.*/',
        value: new RegExp('.*')
      }
    ]);
  });

  describe('list', function() {
    it('with literals', function() {
      assert.deepEqual(parse('(1 "yolo" true)'), [
        {
          type: 'list',
          value: [
            { type: 'integer', raw: '1', value: 1 },
            { type: 'string', raw: '"yolo"', value: 'yolo' },
            { type: 'literal', raw: 'true', value: true }
          ]
        }
      ]);
    });

    it('with comment', function() {
      assert.deepEqual(
        parse(
          `; comment 1
(def todos (atom []))
; comment 2`
        ),
        [
          { type: 'comment', value: ' comment 1' },
          {
            type: 'list',
            value: [
              { type: 'identifier', value: 'def' },
              { type: 'identifier', value: 'todos' },
              {
                type: 'list',
                value: [
                  { type: 'identifier', value: 'atom' },
                  { type: 'array', value: [] }
                ]
              }
            ]
          },
          { type: 'comment', value: ' comment 2' }
        ]
      );
    });

    it('with identifier', function() {
      assert.deepEqual(parse('(map "yolo")'), [
        {
          type: 'list',
          value: [
            { type: 'identifier', value: 'map' },
            { type: 'string', raw: '"yolo"', value: 'yolo' }
          ]
        }
      ]);
    });

    it('with list', function() {
      assert.deepEqual(parse('(map (filter "yolo"))'), [
        {
          type: 'list',
          value: [
            { type: 'identifier', value: 'map' },
            {
              type: 'list',
              value: [
                { type: 'identifier', value: 'filter' },
                { type: 'string', raw: '"yolo"', value: 'yolo' }
              ]
            }
          ]
        }
      ]);
    });
  });

  describe('array', function() {
    it('with literals', function() {
      assert.deepEqual(parse('[1 "yolo" true]'), [
        {
          type: 'array',
          value: [
            { type: 'integer', raw: '1', value: 1 },
            { type: 'string', raw: '"yolo"', value: 'yolo' },
            { type: 'literal', raw: 'true', value: true }
          ]
        }
      ]);
    });
  });

  describe('set', function() {
    it('with literals and collections', function() {
      assert.deepEqual(parse('#{1 "yolo" true ["yolo"] #{4 4 5}}'), [
        {
          type: 'set',
          value: [
            { type: 'integer', raw: '1', value: 1 },
            { type: 'string', raw: '"yolo"', value: 'yolo' },
            { type: 'literal', raw: 'true', value: true },
            {
              type: 'array',
              value: [
                {
                  raw: '"yolo"',
                  type: 'string',
                  value: 'yolo'
                }
              ]
            },
            {
              type: 'set',
              value: [
                {
                  raw: '4',
                  type: 'integer',
                  value: 4
                },
                {
                  raw: '4',
                  type: 'integer',
                  value: 4
                },
                {
                  raw: '5',
                  type: 'integer',
                  value: 5
                }
              ]
            }
          ]
        }
      ]);
    });
  });

  describe('map', function() {
    it('with literals', function() {
      assert.deepEqual(parse('{:a 1 :b "yolo" :c true}'), [
        {
          type: 'map',
          value: [
            { type: 'keyword', raw: '"a"', value: 'a' },
            { type: 'integer', raw: '1', value: 1 },
            { type: 'keyword', raw: '"b"', value: 'b' },
            { type: 'string', raw: '"yolo"', value: 'yolo' },
            { type: 'keyword', raw: '"c"', value: 'c' },
            { type: 'literal', raw: 'true', value: true }
          ]
        }
      ]);
    });
  });

  describe('anonymous fn', function() {
    it('one argument', function() {
      assert.deepEqual(parse('#(+ % 2)'), [
        {
          type: 'list',
          value: [
            { type: 'identifier', value: 'fn' },
            {
              type: 'array',
              value: [{ type: 'identifier', value: '_PERCENT_1' }]
            },
            {
              type: 'list',
              value: [
                { type: 'identifier', value: '_PLUS_' },
                { type: 'identifier', value: '_PERCENT_1' },
                { type: 'integer', raw: '2', value: 2 }
              ]
            }
          ]
        }
      ]);
    });

    it('two arguments', function() {
      assert.deepEqual(parse('#(+ % %2)'), [
        {
          type: 'list',
          value: [
            { type: 'identifier', value: 'fn' },
            {
              type: 'array',
              value: [
                { type: 'identifier', value: '_PERCENT_1' },
                { type: 'identifier', value: '_PERCENT_2' }
              ]
            },
            {
              type: 'list',
              value: [
                { type: 'identifier', value: '_PLUS_' },
                { type: 'identifier', value: '_PERCENT_1' },
                { type: 'identifier', value: '_PERCENT_2' }
              ]
            }
          ]
        }
      ]);
    });

    it('three arguments', function() {
      assert.deepEqual(parse('#(+ % (* %2 %3))'), [
        {
          type: 'list',
          value: [
            { type: 'identifier', value: 'fn' },
            {
              type: 'array',
              value: [
                { type: 'identifier', value: '_PERCENT_1' },
                { type: 'identifier', value: '_PERCENT_2' },
                { type: 'identifier', value: '_PERCENT_3' }
              ]
            },
            {
              type: 'list',
              value: [
                { type: 'identifier', value: '_PLUS_' },
                { type: 'identifier', value: '_PERCENT_1' },
                {
                  type: 'list',
                  value: [
                    { type: 'identifier', value: '_STAR_' },
                    { type: 'identifier', value: '_PERCENT_2' },
                    { type: 'identifier', value: '_PERCENT_3' }
                  ]
                }
              ]
            }
          ]
        }
      ]);
    });

    it('three nested arguments', function() {
      assert.deepEqual(parse('#(+ % (#(+ %2 %3) 3 4 5))'), [
        {
          type: 'list',
          value: [
            { type: 'identifier', value: 'fn' },
            {
              type: 'array',
              value: [{ type: 'identifier', value: '_PERCENT_1' }]
            },
            {
              type: 'list',
              value: [
                { type: 'identifier', value: '_PLUS_' },
                { type: 'identifier', value: '_PERCENT_1' },
                {
                  type: 'list',
                  value: [
                    {
                      type: 'list',
                      value: [
                        { type: 'identifier', value: 'fn' },
                        {
                          type: 'array',
                          value: [
                            { type: 'identifier', value: '_PERCENT_1' },
                            { type: 'identifier', value: '_PERCENT_2' },
                            { type: 'identifier', value: '_PERCENT_3' }
                          ]
                        },
                        {
                          type: 'list',
                          value: [
                            { type: 'identifier', value: '_PLUS_' },
                            { type: 'identifier', value: '_PERCENT_2' },
                            { type: 'identifier', value: '_PERCENT_3' }
                          ]
                        }
                      ]
                    },
                    { type: 'integer', raw: '3', value: 3 },
                    { type: 'integer', raw: '4', value: 4 },
                    { type: 'integer', raw: '5', value: 5 }
                  ]
                }
              ]
            }
          ]
        }
      ]);
    });
  });

  it('quoted identifier', function() {
    assert.deepEqual(parse("'hello"), [
      {
        type: 'list',
        value: [
          { type: 'identifier', value: 'quote' },
          { type: 'identifier', value: 'hello' }
        ]
      }
    ]);
  });

  it('quoted list', function() {
    assert.deepEqual(parse("'(+ 3 4)"), [
      {
        type: 'list',
        value: [
          { type: 'identifier', value: 'quote' },
          {
            type: 'list',
            value: [
              { type: 'identifier', value: '_PLUS_' },
              { type: 'integer', raw: '3', value: 3 },
              { type: 'integer', raw: '4', value: 4 }
            ]
          }
        ]
      }
    ]);
  });

  it('derefered identifier', function() {
    assert.deepEqual(parse('@hello'), [
      {
        type: 'list',
        value: [
          { type: 'identifier', value: 'deref' },
          { type: 'identifier', value: 'hello' }
        ]
      }
    ]);
  });

  describe('meta', function() {
    it('identifier with meta', function() {
      assert.deepEqual(parse('^:dynamic obj'), [
        {
          type: 'list',
          value: [
            { type: 'identifier', value: 'with_meta' },
            { type: 'identifier', value: 'obj' },
            {
              type: 'map',
              value: [
                { type: 'keyword', raw: '"dynamic"', value: 'dynamic' },
                { type: 'literal', raw: 'true', value: true }
              ]
            }
          ]
        }
      ]);
    });

    it('expression with meta', function() {
      assert.deepEqual(parse('^:dynamic (+ 1 2)'), [
        {
          type: 'list',
          value: [
            { type: 'identifier', value: 'with_meta' },
            {
              type: 'list',
              value: [
                { type: 'identifier', value: '_PLUS_' },
                { type: 'integer', raw: '1', value: 1 },
                { type: 'integer', raw: '2', value: 2 }
              ]
            },
            {
              type: 'map',
              value: [
                { type: 'keyword', raw: '"dynamic"', value: 'dynamic' },
                { type: 'literal', raw: 'true', value: true }
              ]
            }
          ]
        }
      ]);
    });

    it('array with meta', function() {
      assert.deepEqual(parse('^:dynamic [1 2 3]'), [
        {
          type: 'list',
          value: [
            { type: 'identifier', value: 'with_meta' },
            {
              type: 'array',
              value: [
                { type: 'integer', raw: '1', value: 1 },
                { type: 'integer', raw: '2', value: 2 },
                { type: 'integer', raw: '3', value: 3 }
              ]
            },
            {
              type: 'map',
              value: [
                { type: 'keyword', raw: '"dynamic"', value: 'dynamic' },
                { type: 'literal', raw: 'true', value: true }
              ]
            }
          ]
        }
      ]);
    });

    it('identifier with expanded meta', function() {
      assert.deepEqual(parse('^{:doc "How obj works!"} obj'), [
        {
          type: 'list',
          value: [
            { type: 'identifier', value: 'with_meta' },
            { type: 'identifier', value: 'obj' },
            {
              type: 'map',
              value: [
                { type: 'keyword', raw: '"doc"', value: 'doc' },
                {
                  type: 'string',
                  raw: '"How obj works!"',
                  value: 'How obj works!'
                }
              ]
            }
          ]
        }
      ]);
    });
  });

  describe('errors', () => {
    it('in a(', () => {
      assert.throws(() => parse('a('), 'Invalid character "(" in symbol');
    });

    it('in #a', () => {
      assert.throws(() => parse('#a'), 'Invalid character "a" in sexp');
    });

    it('in #:', () => {
      assert.throws(() => parse('#:'), 'Invalid character ":" in symbol');
    });
  });
});
