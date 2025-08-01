#ifndef CARDITY_PARSER_H
#define CARDITY_PARSER_H

#include <string>
#include <vector>
#include <memory>
#include "ast.h"
#include "lexer.h"

namespace cardity {

class Parser {
public:
    explicit Parser(const std::string& source);
    std::shared_ptr<ContractNode> parse();

private:
    std::string source;
    size_t pos;
    std::vector<Token> tokens;
    size_t current;

    void skipWhitespace();
    std::string parseIdentifier();
    std::string parseString();
    std::shared_ptr<ContractNode> parseContract();
    std::shared_ptr<FunctionNode> parseMethod();
    std::shared_ptr<StateNode> parseState();
    std::shared_ptr<ExpressionNode> parseExpression();
    std::shared_ptr<TypeNode> parseType();
    
    // 辅助方法
    char currentChar() const;
    char peekChar() const;
    void advance();
    bool isAtEnd() const;
    void consume(char expected, const std::string& message);
    
    // 错误处理
    class ParseError : public std::runtime_error {
    public:
        explicit ParseError(const std::string& message) : std::runtime_error(message) {}
    };
};

} // namespace cardity

#endif // CARDITY_PARSER_H 