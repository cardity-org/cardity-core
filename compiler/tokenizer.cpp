#include "tokenizer.h"
#include <cctype>
#include <stdexcept>

namespace cardity {

Tokenizer::Tokenizer(const std::string& input)
    : source(input), pos(0) {}

Token Tokenizer::next_token() {
    while (pos < source.size() && std::isspace(source[pos])) ++pos;
    
    if (pos >= source.size()) return {TokenType::END, ""};

    char current = source[pos];

    if (std::isalpha(current) || current == '_') {
        size_t start = pos;
        while (pos < source.size() && (std::isalnum(source[pos]) || source[pos] == '_')) ++pos;
        std::string word = source.substr(start, pos - start);

        if (word == "contract") return {TokenType::KEYWORD_CONTRACT, word};
        if (word == "state") return {TokenType::KEYWORD_STATE, word};
        if (word == "string") return {TokenType::KEYWORD_STRING, word};
        if (word == "int") return {TokenType::KEYWORD_INT, word};
        if (word == "default") return {TokenType::KEYWORD_DEFAULT, word};
        if (word == "method") return {TokenType::KEYWORD_METHOD, word};
        if (word == "params") return {TokenType::KEYWORD_PARAMS, word};
        if (word == "returns") return {TokenType::KEYWORD_RETURNS, word};
        if (word == "owner") return {TokenType::KEYWORD_OWNER, word};

        return {TokenType::IDENTIFIER, word};
    }

    if (std::isdigit(current)) {
        size_t start = pos;
        while (pos < source.size() && std::isdigit(source[pos])) ++pos;
        return {TokenType::NUMBER, source.substr(start, pos - start)};
    }

    if (current == '"') {
        ++pos;
        size_t start = pos;
        while (pos < source.size() && source[pos] != '"') ++pos;
        if (pos >= source.size()) throw std::runtime_error("Unterminated string literal");
        std::string str = source.substr(start, pos - start);
        ++pos;
        return {TokenType::STRING, str};
    }

    switch (current) {
        case '=': ++pos; return {TokenType::EQUAL, "="};
        case ':': ++pos; return {TokenType::COLON, ":"};
        case ';': ++pos; return {TokenType::SEMICOLON, ";"};
        case '{': ++pos; return {TokenType::LBRACE, "{"};
        case '}': ++pos; return {TokenType::RBRACE, "}"};
        case '(': ++pos; return {TokenType::LPAREN, "("};
        case ')': ++pos; return {TokenType::RPAREN, ")"};
        case '[': ++pos; return {TokenType::LBRACKET, "["};
        case ']': ++pos; return {TokenType::RBRACKET, "]"};
        case ',': ++pos; return {TokenType::COMMA, ","};
        default:
            throw std::runtime_error(std::string("Unknown character: ") + current);
    }
}

bool Tokenizer::has_more_tokens() const {
    return pos < source.size();
}

} // namespace cardity 