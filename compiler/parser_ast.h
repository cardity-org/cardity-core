#ifndef CARDITY_PARSER_AST_H
#define CARDITY_PARSER_AST_H

#include <string>
#include <vector>

namespace cardity {

// 简化的 AST 节点结构（用于新解析器）
struct ParserStateVariable {
    std::string name;
    std::string type;
    std::string default_value;
};

struct ParserMethod {
    std::string name;
    std::vector<std::string> params;
    std::vector<std::string> param_types; // optional types for params
    std::string logic;
    // Optional return support
    std::string return_expr;   // e.g. "state.count" or literal/expr
    std::string return_type;   // optional type annotation (e.g. int/string/bool)
};

struct ProtocolAST {
    std::string protocol_name;
    std::string version;
    std::string owner;
    // import/using declarations
    std::vector<std::string> imports; // module names (resolved later)
    std::vector<std::pair<std::string,std::string>> using_aliases; // {module, alias}
    std::vector<ParserStateVariable> state_variables;
    std::vector<ParserMethod> methods;
};

} // namespace cardity

#endif // CARDITY_PARSER_AST_H 