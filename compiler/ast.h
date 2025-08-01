#pragma once

#include <string>
#include <vector>
#include <memory>
#include <variant>

namespace cardity {

// 前向声明
class ASTNode;
class ContractNode;
class StateNode;
class FunctionNode;
class StatementNode;
class ExpressionNode;
class TypeNode;

// AST 节点基类
class ASTNode {
public:
    virtual ~ASTNode() = default;
    virtual std::string to_string() const = 0;
};

// 类型节点
class TypeNode : public ASTNode {
public:
    enum class Type {
        INT,
        STRING,
        BOOL,
        VOID
    };
    
    Type type;
    std::string name;
    
    explicit TypeNode(Type t) : type(t) {}
    explicit TypeNode(const std::string& n) : name(n) {}
    
    std::string to_string() const override;
};

// 表达式节点
class ExpressionNode : public ASTNode {
public:
    virtual ~ExpressionNode() = default;
};

// 字面量表达式
class LiteralNode : public ExpressionNode {
public:
    std::variant<int, std::string, bool> value;
    
    template<typename T>
    explicit LiteralNode(const T& v) : value(v) {}
    
    std::string to_string() const override;
};

// 标识符表达式
class IdentifierNode : public ExpressionNode {
public:
    std::string name;
    
    explicit IdentifierNode(const std::string& n) : name(n) {}
    
    std::string to_string() const override;
};

// 二元运算表达式
class BinaryOpNode : public ExpressionNode {
public:
    std::string op;
    std::shared_ptr<ExpressionNode> left;
    std::shared_ptr<ExpressionNode> right;
    
    BinaryOpNode(const std::string& o, std::shared_ptr<ExpressionNode> l, std::shared_ptr<ExpressionNode> r)
        : op(o), left(l), right(r) {}
    
    std::string to_string() const override;
};

// 成员访问表达式
class MemberAccessNode : public ExpressionNode {
public:
    std::shared_ptr<ExpressionNode> object;
    std::string member;
    
    MemberAccessNode(std::shared_ptr<ExpressionNode> obj, const std::string& mem)
        : object(obj), member(mem) {}
    
    std::string to_string() const override;
};

// 语句节点
class StatementNode : public ASTNode {
public:
    virtual ~StatementNode() = default;
};

// 赋值语句
class AssignmentNode : public StatementNode {
public:
    std::shared_ptr<ExpressionNode> target;
    std::shared_ptr<ExpressionNode> value;
    
    AssignmentNode(std::shared_ptr<ExpressionNode> t, std::shared_ptr<ExpressionNode> v)
        : target(t), value(v) {}
    
    std::string to_string() const override;
};

// 返回语句
class ReturnNode : public StatementNode {
public:
    std::shared_ptr<ExpressionNode> value;
    
    explicit ReturnNode(std::shared_ptr<ExpressionNode> v = nullptr) : value(v) {}
    
    std::string to_string() const override;
};

// 状态变量声明
class StateVariableNode : public ASTNode {
public:
    std::string name;
    std::shared_ptr<TypeNode> type;
    std::shared_ptr<ExpressionNode> initial_value;
    
    StateVariableNode(const std::string& n, std::shared_ptr<TypeNode> t, std::shared_ptr<ExpressionNode> init = nullptr)
        : name(n), type(t), initial_value(init) {}
    
    std::string to_string() const override;
};

// 状态块
class StateNode : public ASTNode {
public:
    std::vector<std::shared_ptr<StateVariableNode>> variables;
    
    std::string to_string() const override;
};

// 函数参数
class ParameterNode : public ASTNode {
public:
    std::string name;
    std::shared_ptr<TypeNode> type;
    
    ParameterNode(const std::string& n, std::shared_ptr<TypeNode> t)
        : name(n), type(t) {}
    
    std::string to_string() const override;
};

// 函数节点
class FunctionNode : public ASTNode {
public:
    std::string name;
    std::vector<std::shared_ptr<ParameterNode>> parameters;
    std::shared_ptr<TypeNode> return_type;
    std::vector<std::shared_ptr<StatementNode>> body;
    
    std::string to_string() const override;
};

// 合约节点
class ContractNode : public ASTNode {
public:
    std::string name;
    std::shared_ptr<StateNode> state;
    std::vector<std::shared_ptr<FunctionNode>> functions;
    
    std::string to_string() const override;
};

// 程序根节点
class ProgramNode : public ASTNode {
public:
    std::vector<std::shared_ptr<ContractNode>> contracts;
    
    std::string to_string() const override;
};

} // namespace cardity 