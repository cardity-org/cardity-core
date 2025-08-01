#pragma once

#include "ast.h"
#include <unordered_map>
#include <string>
#include <memory>

namespace cardity {

// 符号表项
struct Symbol {
    std::string name;
    std::shared_ptr<TypeNode> type;
    bool is_constant;
    
    Symbol(const std::string& n, std::shared_ptr<TypeNode> t, bool constant = false)
        : name(n), type(t), is_constant(constant) {}
};

// 作用域
class Scope {
private:
    std::unordered_map<std::string, Symbol> symbols;
    Scope* parent;
    
public:
    explicit Scope(Scope* p = nullptr) : parent(p) {}
    
    void define(const std::string& name, const Symbol& symbol);
    Symbol* lookup(const std::string& name);
    bool is_defined(const std::string& name) const;
};

// 语义分析器
class SemanticAnalyzer {
private:
    std::shared_ptr<ProgramNode> ast;
    Scope* current_scope;
    std::vector<std::string> errors;
    
    // 分析方法
    void analyze_program(std::shared_ptr<ProgramNode> node);
    void analyze_contract(std::shared_ptr<ContractNode> node);
    void analyze_state(std::shared_ptr<StateNode> node);
    void analyze_function(std::shared_ptr<FunctionNode> node);
    void analyze_statement(std::shared_ptr<StatementNode> node);
    std::shared_ptr<TypeNode> analyze_expression(std::shared_ptr<ExpressionNode> node);
    
    // 类型检查
    bool is_compatible(std::shared_ptr<TypeNode> from, std::shared_ptr<TypeNode> to);
    std::shared_ptr<TypeNode> get_expression_type(std::shared_ptr<ExpressionNode> node);
    
    // 作用域管理
    void enter_scope();
    void exit_scope();
    
public:
    explicit SemanticAnalyzer(std::shared_ptr<ProgramNode> ast);
    ~SemanticAnalyzer();
    
    bool analyze();
    const std::vector<std::string>& get_errors() const { return errors; }
    
    // 错误报告
    void report_error(const std::string& message);
};

} // namespace cardity 