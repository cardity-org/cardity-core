#include "car_generator_ast.h"
#include <fstream>
#include <algorithm>

namespace cardity {

json generate_car_json(const ProtocolAST& ast) {
    json j;
    j["p"] = "cardinals";
    j["op"] = "deploy";
    j["protocol"] = ast.protocol_name;
    j["version"] = ast.version;

    json cpl;
    // state
    json state_json;
    for (const auto& var : ast.state_variables) {
        state_json[var.name] = {
            {"type", var.type},
            {"default", var.default_value}
        };
    }
    cpl["state"] = state_json;

    // methods
    json methods_json;
    for (const auto& method : ast.methods) {
        json m;
        m["params"] = method.params;
        std::string trimmed = method.logic;
        // 去除前后空格
        trimmed.erase(trimmed.begin(), std::find_if(trimmed.begin(), trimmed.end(), [](int ch) { return !std::isspace(ch); }));
        trimmed.erase(std::find_if(trimmed.rbegin(), trimmed.rend(), [](int ch) { return !std::isspace(ch); }).base(), trimmed.end());
        if (trimmed.find("return ") == 0) {
            m["returns"] = trimmed.substr(7); // skip "return "
        } else if (!trimmed.empty()) {
            m["logic"] = trimmed;
        }
        methods_json[method.name] = m;
    }
    cpl["methods"] = methods_json;

    if (!ast.owner.empty()) {
        cpl["owner"] = ast.owner;
    }

    j["cpl"] = cpl;
    return j;
}

void write_car_file(const json& j, const std::string& filename) {
    std::ofstream ofs(filename);
    if (!ofs.is_open()) throw std::runtime_error("Failed to open output file");
    ofs << j.dump(2); // pretty print with 2 spaces
    ofs.close();
}

} // namespace cardity