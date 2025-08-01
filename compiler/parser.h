#ifndef CARDITY_PARSER_H
#define CARDITY_PARSER_H

#include <string>
#include <vector>
#include <memory>
#include <map>
#include "tokenizer.h"

namespace cardity {

// AST 节点基础类
class ASTNode {
public:
    virtual ~ASTNode() = default;
};

// 表达式节点
struct ExprNode : public ASTNode {
    virtual ~ExprNode() = default;
};

// 字面量表达式
struct LiteralExpr : public ExprNode {
    std::string value;
    std::string type; // "string", "number", "boolean"
};

// 标识符表达式
struct IdentifierExpr : public ExprNode {
    std::string name;
};

// 成员访问表达式
struct MemberAccessExpr : public ExprNode {
    std::unique_ptr<ExprNode> object;
    std::string member;
};

// 语句节点
struct StatementNode : public ASTNode {
    virtual ~StatementNode() = default;
};

// 赋值语句
struct AssignmentStmt : public StatementNode {
    std::unique_ptr<ExprNode> target;
    std::unique_ptr<ExprNode> value;
};

// 返回语句
struct ReturnStmt : public StatementNode {
    std::unique_ptr<ExprNode> value;
};

// 状态变量定义
struct StateVarDef : public ASTNode {
    std::string name;
    std::string type;
    std::unique_ptr<ExprNode> default_value;
};

// 状态块
struct StateBlock : public ASTNode {
    std::vector<std::unique_ptr<StateVarDef>> variables;
};

// 方法参数
struct MethodParam : public ASTNode {
    std::string name;
};

// 方法体
struct MethodBody : public ASTNode {
    std::vector<std::unique_ptr<StatementNode>> statements;
};

// 方法定义
struct MethodDef : public ASTNode {
    std::string name;
    std::vector<std::unique_ptr<MethodParam>> parameters;
    std::unique_ptr<MethodBody> body;
};

// 元数据
struct Metadata : public ASTNode {
    std::string version;
    std::string owner;
};

// 程序节点
struct ProgramNode : public ASTNode {
    std::string protocol_name;
    std::unique_ptr<Metadata> metadata;
    std::unique_ptr<StateBlock> state;
    std::vector<std::unique_ptr<MethodDef>> methods;
};

// 解析器类定义
class Parser {
public:
    Parser(const std::vector<Token>& tokens);
    std::unique_ptr<ProgramNode> parse();

private:
    const std::vector<Token>& tokens;
    size_t current;

    const Token& peek();
    const Token& advance();
    bool match(TokenType type);
    bool isAtEnd() const;
    void consume(TokenType type, const std::string& message);

    // 程序解析
    std::unique_ptr<ProgramNode> parseProgram();
    std::unique_ptr<Metadata> parseMetadata();
    std::unique_ptr<StateBlock> parseStateBlock();
    std::unique_ptr<MethodDef> parseMethodDef();

    // 表达式解析
    std::unique_ptr<ExprNode> parseExpr();
    std::unique_ptr<ExprNode> parsePrimary();

    // 语句解析
    std::unique_ptr<StatementNode> parseStatement();
    std::unique_ptr<AssignmentStmt> parseAssignment();
    std::unique_ptr<ReturnStmt> parseReturn();

    // 辅助解析
    std::unique_ptr<StateVarDef> parseStateVarDef();
    std::unique_ptr<MethodParam> parseMethodParam();
    std::unique_ptr<MethodBody> parseMethodBody();
};

} // namespace cardity

#endif // CARDITY_PARSER_H 