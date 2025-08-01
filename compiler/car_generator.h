#ifndef CARDITY_CAR_GENERATOR_H
#define CARDITY_CAR_GENERATOR_H

#include "ast.h"
#include <nlohmann/json.hpp>

namespace cardity {

using json = nlohmann::json;

class CarGenerator {
public:
    // 将 Protocol AST 编译为 Cardinals .car JSON 格式
    static json compile_to_car(const Protocol& protocol);
    
    // 将 JSON 转换为字符串
    static std::string to_string(const json& car_json);
    
private:
    // 编译状态块
    static json compile_state(const StateBlock& state);
    
    // 编译方法
    static json compile_methods(const std::vector<Method>& methods);
};

} // namespace cardity

#endif // CARDITY_CAR_GENERATOR_H 