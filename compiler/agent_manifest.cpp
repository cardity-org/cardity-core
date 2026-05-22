#include "agent_manifest.h"
#include <algorithm>
#include <cctype>
#include <regex>
#include <set>

namespace cardity {

json AgentManifestGenerator::generate(const json& car_json, const json& abi_json) {
    const std::string protocol_name = car_json.value("protocol", abi_json.value("protocol", "unknown"));
    const std::string version = car_json.value("version", abi_json.value("version", "1.0.0"));
    const json cpl = car_json.value("cpl", json::object());
    const json abi_state = abi_json.value("state", json::object());
    const json abi_methods = abi_json.value("methods", json::object());
    const json abi_events = abi_json.value("events", json::object());

    json manifest;
    manifest["schema"] = "cardity.agent_manifest.v1";
    manifest["protocol"] = {
        {"name", protocol_name},
        {"version", version},
        {"owner", cpl.value("owner", "")}
    };
    manifest["source"] = {
        {"p", car_json.value("p", "cardity")},
        {"op", car_json.value("op", "deploy")}
    };

    manifest["state"] = json::array();
    for (auto& [state_name, state_def] : abi_state.items()) {
        json item;
        item["name"] = state_name;
        item["type"] = state_def.value("type", "string");
        item["storage"] = "persistent";
        if (state_def.contains("default")) {
            item["default"] = state_def["default"];
        }
        manifest["state"].push_back(item);
    }

    manifest["tables"] = json::array();
    const json cpl_tables = cpl.value("tables", json::array());
    if (cpl_tables.is_array()) {
        for (const auto& table_def : cpl_tables) {
            if (table_def.is_object()) {
                manifest["tables"].push_back(table_def);
            }
        }
    }

    manifest["events"] = json::array();
    for (auto& [event_name, event_def] : abi_events.items()) {
        json item;
        item["name"] = event_name;
        item["params"] = event_def.value("params", json::array());
        item["stream"] = "cardity." + protocol_name + "." + event_name;
        manifest["events"].push_back(item);
    }

    json routes = json::array();
    json tools = json::array();
    json permissions = json::array();
    manifest["methods"] = json::array();

    const json cpl_methods = cpl.value("methods", json::object());
    for (auto& [method_name, method_def] : abi_methods.items()) {
        json cpl_method = cpl_methods.contains(method_name) ? cpl_methods[method_name] : json::object();
        json params = method_def.value("params", json::array());
        json effects = infer_effects(cpl_method);
        bool mutates = !effects.value("writes", json::array()).empty() || !effects.value("emits", json::array()).empty();

        json route = {
            {"method", mutates ? "POST" : "GET"},
            {"path", "/protocols/" + protocol_name + "/methods/" + method_name}
        };

        json method_item;
        method_item["name"] = method_name;
        method_item["params"] = params;
        method_item["returns"] = method_def.contains("returns") ? method_def["returns"] : json(nullptr);
        method_item["effects"] = effects;
        method_item["route"] = route;
        method_item["ui"] = {
            {"kind", mutates ? "action" : "query"},
            {"label", titleize(method_name)}
        };
        manifest["methods"].push_back(method_item);
        routes.push_back(route);

        std::string tool_name = to_snake_case(protocol_name + "_" + method_name);
        tools.push_back({
            {"name", tool_name},
            {"description", "Invoke " + protocol_name + "." + method_name},
            {"method", method_name},
            {"input_schema", build_input_schema(params)}
        });

        if (mutates) {
            permissions.push_back({
                {"action", method_name},
                {"requires_confirmation", true},
                {"reason", "Method writes state or emits protocol events"}
            });
        }
    }

    json tables = json::array();
    json columns = json::array();
    for (const auto& state_item : manifest["state"]) {
        columns.push_back({
            {"name", state_item.value("name", "")},
            {"type", state_item.value("type", "string")}
        });
    }
    tables.push_back({
        {"name", to_snake_case(protocol_name) + "_state"},
        {"columns", columns}
    });
    for (const auto& table_item : manifest["tables"]) {
        tables.push_back(table_item);
    }
    json projections = infer_projections(manifest["tables"], manifest["events"]);

    json workflows = json::array();
    for (const auto& event_item : manifest["events"]) {
        workflows.push_back({
            {"name", "on_" + event_item.value("name", "")},
            {"trigger", {{"event", event_item.value("name", "")}}},
            {"actions", json::array()}
        });
    }

    manifest["permissions"] = permissions;
    manifest["system"] = {
        {"api", {{"routes", routes}}},
        {"database", {{"tables", tables}, {"projections", projections}}},
        {"ui", {
            {"resources", json::array({protocol_name})},
            {"actions", tools}
        }},
        {"workflows", workflows}
    };
    manifest["agent"] = {
        {"tools", tools},
        {"events", manifest["events"]}
    };

    return manifest;
}

json AgentManifestGenerator::infer_projections(const json& tables, const json& events) {
    auto table_has_columns = [](const json& table, const std::set<std::string>& required) {
        if (!table.is_object() || !table.contains("columns") || !table["columns"].is_array()) {
            return false;
        }
        std::set<std::string> columns;
        for (const auto& column : table["columns"]) {
            if (column.is_object()) {
                columns.insert(column.value("name", ""));
            }
        }
        for (const auto& name : required) {
            if (!columns.count(name)) return false;
        }
        return true;
    };

    auto event_has_params = [](const json& event, const std::set<std::string>& required) {
        if (!event.is_object() || !event.contains("params") || !event["params"].is_array()) {
            return false;
        }
        std::set<std::string> params;
        for (const auto& param : event["params"]) {
            if (param.is_object()) {
                params.insert(param.value("name", ""));
            }
        }
        for (const auto& name : required) {
            if (!params.count(name)) return false;
        }
        return true;
    };

    std::string balance_table;
    std::string ledger_table;
    if (tables.is_array()) {
        for (const auto& table : tables) {
            if (balance_table.empty() && table_has_columns(table, {"user", "balance"})) {
                balance_table = table.value("name", "");
            }
            if (ledger_table.empty() && table_has_columns(table, {"user", "delta", "reason", "actor", "operation"})) {
                ledger_table = table.value("name", "");
            }
        }
    }
    if (balance_table.empty() && ledger_table.empty()) {
        return json::array();
    }

    json projections = json::array();
    auto add_point_projection = [&](const std::string& event_name, const std::string& delta_expr, const json& actor_expr, const std::string& operation_name) {
        json projection;
        projection["name"] = to_snake_case(event_name) + "_to_member_points";
        projection["on"] = {{"event", event_name}};
        projection["writes"] = json::array();
        if (!balance_table.empty()) {
            projection["writes"].push_back({
                {"table", balance_table},
                {"operation", "upsert_delta"},
                {"key", {{"user", "$event.user"}}},
                {"delta", {{"balance", delta_expr}}}
            });
        }
        if (!ledger_table.empty()) {
            projection["writes"].push_back({
                {"table", ledger_table},
                {"operation", "insert"},
                {"values", {
                    {"user", "$event.user"},
                    {"delta", delta_expr},
                    {"reason", "$event.reason"},
                    {"actor", actor_expr},
                    {"operation", operation_name}
                }}
            });
        }
        if (!projection["writes"].empty()) {
            projections.push_back(projection);
        }
    };

    if (events.is_array()) {
        for (const auto& event : events) {
            std::string name = event.value("name", "");
            std::string lowered = name;
            std::transform(lowered.begin(), lowered.end(), lowered.begin(), [](unsigned char c) {
                return static_cast<char>(std::tolower(c));
            });
            if (lowered.find("earned") != std::string::npos && event_has_params(event, {"user", "amount", "reason"})) {
                add_point_projection(name, "$event.amount", "$ctx.sender", "earn_points");
            } else if (lowered.find("spent") != std::string::npos && event_has_params(event, {"user", "amount", "reason"})) {
                add_point_projection(name, "-$event.amount", "$ctx.sender", "spend_points");
            } else if (lowered.find("adjusted") != std::string::npos && event_has_params(event, {"user", "delta", "reason"})) {
                add_point_projection(name, "$event.delta", "$event.admin", "admin_adjust_points");
            }
        }
    }

    return projections;
}

std::string AgentManifestGenerator::normalize_logic(const std::string& logic) {
    std::string normalized = logic;
    normalized = std::regex_replace(normalized, std::regex(R"(\s*\.\s*)"), ".");
    normalized = std::regex_replace(normalized, std::regex(R"(\s+)"), " ");
    return normalized;
}

json AgentManifestGenerator::infer_effects(const json& method_json) {
    std::string logic;
    if (method_json.contains("logic")) {
        if (method_json["logic"].is_string()) {
            logic = method_json["logic"].get<std::string>();
        } else if (method_json["logic"].is_array()) {
            for (const auto& line : method_json["logic"]) {
                if (line.is_string()) {
                    logic += line.get<std::string>();
                    logic += "\n";
                }
            }
        }
    }
    logic = normalize_logic(logic);

    std::set<std::string> reads;
    std::set<std::string> writes;
    std::set<std::string> emits;

    std::regex write_re(R"(state\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+))");
    for (auto it = std::sregex_iterator(logic.begin(), logic.end(), write_re); it != std::sregex_iterator(); ++it) {
        std::string field = (*it)[1].str();
        std::string rhs = (*it)[2].str();
        rhs.erase(std::remove_if(rhs.begin(), rhs.end(), [](unsigned char c) { return std::isspace(c); }), rhs.end());
        if (rhs != "state." + field) {
            writes.insert(field);
        }
    }

    std::regex read_re(R"(state\.([A-Za-z_][A-Za-z0-9_]*))");
    for (auto it = std::sregex_iterator(logic.begin(), logic.end(), read_re); it != std::sregex_iterator(); ++it) {
        reads.insert((*it)[1].str());
    }

    std::regex emit_re(R"(emit\s+([A-Za-z_][A-Za-z0-9_]*)\s*\()");
    for (auto it = std::sregex_iterator(logic.begin(), logic.end(), emit_re); it != std::sregex_iterator(); ++it) {
        emits.insert((*it)[1].str());
    }

    json effects;
    effects["reads"] = json::array();
    effects["writes"] = json::array();
    effects["emits"] = json::array();

    for (const auto& read : reads) effects["reads"].push_back(read);
    for (const auto& write : writes) effects["writes"].push_back(write);
    for (const auto& emit : emits) effects["emits"].push_back(emit);

    return effects;
}

json AgentManifestGenerator::build_input_schema(const json& params) {
    json properties = json::object();
    json required = json::array();

    for (const auto& param : params) {
        std::string name = param.value("name", "");
        if (name.empty()) continue;
        std::string type = param.value("type", "string");
        properties[name] = {{"type", json_schema_type(type)}};
        required.push_back(name);
    }

    return {
        {"type", "object"},
        {"properties", properties},
        {"required", required}
    };
}

std::string AgentManifestGenerator::json_schema_type(const std::string& cardity_type) {
    std::string type = cardity_type;
    std::transform(type.begin(), type.end(), type.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    if (type == "int" || type == "integer" || type == "uint" || type == "long") return "integer";
    if (type == "float" || type == "double" || type == "number") return "number";
    if (type == "bool" || type == "boolean") return "boolean";
    if (type == "array" || type == "list") return "array";
    if (type == "object" || type == "map") return "object";
    return "string";
}

std::string AgentManifestGenerator::to_snake_case(const std::string& value) {
    std::string out;
    bool previous_underscore = false;
    for (size_t i = 0; i < value.size(); ++i) {
        unsigned char ch = static_cast<unsigned char>(value[i]);
        if (std::isalnum(ch)) {
            if (std::isupper(ch) && i > 0 && !previous_underscore) {
                out.push_back('_');
            }
            out.push_back(static_cast<char>(std::tolower(ch)));
            previous_underscore = false;
        } else if (!previous_underscore && !out.empty()) {
            out.push_back('_');
            previous_underscore = true;
        }
    }
    if (!out.empty() && out.back() == '_') out.pop_back();
    return out.empty() ? "protocol" : out;
}

std::string AgentManifestGenerator::titleize(const std::string& value) {
    std::string out = value;
    std::replace(out.begin(), out.end(), '_', ' ');
    bool capitalize = true;
    for (char& ch : out) {
        if (std::isspace(static_cast<unsigned char>(ch))) {
            capitalize = true;
        } else if (capitalize) {
            ch = static_cast<char>(std::toupper(static_cast<unsigned char>(ch)));
            capitalize = false;
        }
    }
    return out;
}

} // namespace cardity
