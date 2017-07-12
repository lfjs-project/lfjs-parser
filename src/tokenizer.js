const SYMBOL_REGEXP = /[^()\[\]\{\}\#"'`,:;\|\s]/;
const SPACE_REGEXP = /[\t\n\f ]/;

function preprocessInput(input) {
  return input.replace(/\r\n?/g, '\n');
}

export default class Tokenizer {
  constructor(input) {
    this.input = preprocessInput(input);
    this.char = 0;
    this.line = 1;
    this.column = 0;

    this.state = 'sexp';
    this.token = null;
  }

  parse() {
    let tokens = [], token;

    while (token !== 'EOF') {
      token = this.lex(token);

      if (token) {
        tokens.push(token);
      }
    }

    return tokens;
  }

  addChar(char) {
    if (this.token && typeof this.token.chars === 'string') {
      this.token.chars += char;
    }
  }

  addLocInfo(token, line, column) {
    if (!token) {
      return;
    }

    token.firstLine = this.firstLine;
    token.firstColumn = this.firstColumn;
    token.lastLine = line === 0 ? 0 : line || this.line;
    token.lastColumn = column === 0 ? 0 : column || this.column;
  }

  lex(lastToken) {
    let char = this.input.charAt(this.char++);

    if (char) {
      if (char === '\n') {
        this.line++;
        this.column = 0;
      } else {
        this.column++;
      }
      let token = this[this.state].call(this, char, lastToken);
      //this.addLocInfo(token, this.line, this.column);
      return token;
    } else {
      //this.addLocInfo(this.line, this.column);
      return 'EOF';
    }
  }

  sexp(char, lastToken) {
    switch (char) {
      case '#':
        if (lastToken && lastToken.type === 'dispatch') {
          invalidCharacterError(char, this.state);
        }
        return { type: 'dispatch' };
      case '^':
        if (lastToken && lastToken.type === 'meta') {
          invalidCharacterError(char, this.state);
        }
        return { type: 'meta' };
      case "'":
        return { type: 'quote' };
      case '@':
        return { type: 'deref' };
      case '(':
        return { type: 'open-paren' };
      case '{':
        return { type: 'open-brace' };
      case '[':
      case ')':
      case '}':
      case ']':
        if (lastToken && lastToken.type === 'dispatch') {
          invalidCharacterError(char, this.state);
        }

        return { type: charToType(char) };
      case '"':
        this.state = 'string';

        return (this.token = { type: 'string', chars: '' });
      case ';':
        this.state = 'comment';

        return (this.token = { type: 'comment', chars: '' });
      case ':':
        this.state = 'symbol';

        if (lastToken && lastToken.type === 'dispatch') {
          invalidCharacterError(char, this.state);
        }

        return (this.token = { type: charToType(char), chars: '' });
      case '&':
        return { type: charToType(char) };
      default:
        if (lastToken && lastToken.type === 'dispatch') {
          invalidCharacterError(char, this.state);
        }

        if (SYMBOL_REGEXP.test(char)) {
          this.state = 'symbol';

          return (this.token = { type: 'symbol', chars: char });
        } else if (!SPACE_REGEXP.test(char)) {
          invalidCharacterError(char, this.state);
        }
    }
  }

  string(char) {
    if (char === '"') {
      this.state = 'sexp';
    } else {
      this.addChar(char);
    }
  }

  comment(char) {
    if (char === '\n' || char === '\r') {
      this.state = 'sexp';
    } else {
      this.addChar(char);
    }
  }

  symbol(char) {
    switch (char) {
      case ')':
      case '}':
      case ']':
        this.state = 'sexp';
        return { type: charToType(char) };
      default:
        if (SPACE_REGEXP.test(char)) {
          this.state = 'sexp';
        } else if (SYMBOL_REGEXP.test(char)) {
          this.addChar(char);
        } else {
          invalidCharacterError(char, this.state);
        }
    }
  }
}

function charToType(char) {
  switch (char) {
    case '#':
      return 'dispatch';
    case '^':
      return 'meta';
    case '@':
      return 'deref';
    case "'":
      return 'quote';
    case ':':
      return 'keyword';
    case '"':
      return 'string';
    case '&':
      return 'rest';
    case '(':
      return 'open-paren';
    case '[':
      return 'open-bracket';
    case '{':
      return 'open-brace';
    case ')':
    case ']':
    case '}':
      return 'close-delimiter';
  }
}

export function invalidCharacterError(char, state) {
  throw new Error(`Invalid character "${char}" in ${state}.`);
}
