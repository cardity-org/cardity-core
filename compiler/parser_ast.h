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
    std::string logic;
};

struct ProtocolAST {
    std::string protocol_name;
    std::string version;
    std::string owner;
    std::vector<ParserStateVariable> state_variables;
    std::vector<ParserMethod> methods;
};

} // namespace cardity

#endif // CARDITY_PARSER_AST_H 