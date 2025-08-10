#include "car_generator.h"
#include <iostream>

namespace cardity {

json CarGenerator::compile_to_car(const Protocol& protocol) {
    json car;
    car["p"] = "cardinals";
    car["op"] = "deploy";
    car["protocol"] = protocol.name;
    car["version"] = protocol.metadata.version;

    json cpl;
    cpl["owner"] = protocol.metadata.owner;

    // 输出 imports/using（可选）
    if (!protocol.imports.empty()) {
        cpl["imports"] = protocol.imports;
    }
    if (!protocol.using_aliases.empty()) {
        json arr = json::array();
        for (const auto& pr : protocol.using_aliases) {
            json o; o["module"] = pr.first; o["alias"] = pr.second; arr.push_back(o);
        }
        cpl["using"] = arr;
    }

    // 编译 state
    cpl["state"] = compile_state(protocol.state);

    // 编译 methods
    cpl["methods"] = compile_methods(protocol.methods);

    car["cpl"] = cpl;
    return car;
}

json CarGenerator::compile_state(const StateBlock& state) {
    json state_json;
    for (const auto& var : state.variables) {
        state_json[var.name] = {
            {"type", var.type},
            {"default", var.default_value}
        };
    }
    return state_json;
}

json CarGenerator::compile_methods(const std::vector<Method>& methods) {
    json methods_json;
    for (const auto& method : methods) {
        json m;
        m["params"] = method.params;
        if (!method.param_types.empty()) {
            m["param_types"] = method.param_types;
        }
        // 如果只有一行逻辑，直接使用字符串；否则使用数组
        if (method.logic_lines.size() == 1) {
            m["logic"] = method.logic_lines[0];
        } else {
            m["logic"] = method.logic_lines;
        }
        // 输出可选返回定义
        if (!method.return_expr.empty() || !method.return_type.empty()) {
            json r;
            if (!method.return_type.empty()) r["type"] = method.return_type;
            if (!method.return_expr.empty()) r["expr"] = method.return_expr;
            m["returns"] = r;
        }
        methods_json[method.name] = m;
    }
    return methods_json;
}

std::string CarGenerator::to_string(const json& car_json) {
    return car_json.dump(2); // 使用2个空格缩进
}

} // namespace cardity 