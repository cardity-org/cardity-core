#pragma once

#include <nlohmann/json.hpp>

namespace cardity {

using json = nlohmann::json;

class AgentManifestGenerator {
public:
    static json generate(const json& car_json, const json& abi_json);

private:
    static std::string normalize_logic(const std::string& logic);
    static json infer_effects(const json& method_json);
    static json infer_projections(const json& tables, const json& events);
    static json build_input_schema(const json& params);
    static std::string json_schema_type(const std::string& cardity_type);
    static std::string to_snake_case(const std::string& value);
    static std::string titleize(const std::string& value);
};

} // namespace cardity
