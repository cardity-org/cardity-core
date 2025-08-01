#ifndef CARDITY_AST_H
#define CARDITY_AST_H

#include <string>
#include <vector>
#include <memory>

namespace cardity {

// 基类 ASTNode
class ASTNode {
public:
    virtual ~ASTNode() = default;
};

// ----------------------
// Metadata（协议元信息）
struct Metadata : public ASTNode {
    std::string version;
    std::string owner;
};

// ----------------------
// State变量定义
struct StateVariable : public ASTNode {
    std::string name;
    std::string type;
    std::string default_value;
};

struct StateBlock : public ASTNode {
    std::vector<StateVariable> variables;
};

// ----------------------
// 方法定义
struct Method : public ASTNode {
    std::string name;
    std::vector<std::string> params;
    std::vector<std::string> logic_lines; // 暂用字符串表达逻辑
};

// ----------------------
// 程序结构（协议根部）
struct Protocol : public ASTNode {
    std::string name;
    Metadata metadata;
    StateBlock state;
    std::vector<Method> methods;
};

} // namespace cardity

#endif // CARDITY_AST_H 