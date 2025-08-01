#ifndef CARDITY_PARSER_H
#define CARDITY_PARSER_H

#include <string>
#include <vector>
#include <memory>
#include <map>

namespace cardity {

// Token 类型定义
enum class TokenType {
    Identifier,
    Keyword,
    Number,
    String,
    LBrace,
    RBrace,
    LParen,
    RParen,
    LBracket,
    RBracket,
    Colon,
    Comma,
    Equal,
    Arrow,
    Newline,
    EndOfFile,
    Unknown
};

// Token 数据结构
struct Token {
    TokenType type;
    std::string value;
    int line;
    int column;
};

// AST 节点基础类
class ASTNode {
public:
    virtual ~ASTNode() = default;
};

// 变量定义
struct VariableDef : public ASTNode {
    std::string name;
    std::string type;
    std::string default_value;
};

// 方法定义
struct MethodDef : public ASTNode {
    std::string name;
    std::vector<std::string> params;
    std::string logic;
};

// 状态结构
struct StateDef : public ASTNode {
    std::map<std::string, VariableDef> variables;
};

// 合约结构
struct ContractDef : public ASTNode {
    std::string protocol_name;
    std::string version;
    std::string owner;
    StateDef state;
    std::vector<MethodDef> methods;
};

// 解析器类定义
class Parser {
public:
    Parser(const std::vector<Token>& tokens);
    std::unique_ptr<ContractDef> parse();

private:
    const std::vector<Token>& tokens;
    size_t current;

    const Token& peek();
    const Token& advance();
    bool match(const std::string& keyword);

    std::unique_ptr<ContractDef> parse_contract();
    StateDef parse_state();
    MethodDef parse_method();
    VariableDef parse_variable();
};

} // namespace cardity

#endif // CARDITY_PARSER_H 