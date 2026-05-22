#include "event_system.h"
#include "parser.h"
#include "tokenizer.h"
#include <iostream>
#include <fstream>
#include <regex>
#include <algorithm>

namespace cardity {

// EventManager 实现
void EventManager::register_event(const std::string& name, const std::vector<EventParam>& params) {
    EventDefinition event(name);
    event.params = params;
    events[name] = event;
}

void EventManager::emit_event(const std::string& name, const std::vector<std::string>& values) {
    auto it = events.find(name);
    if (it == events.end()) {
        throw std::runtime_error("Event not defined: " + name);
    }
    
    EventInstance instance(name);
    instance.values = values;
    event_log.push_back(instance);
    
    std::cout << "📢 Event emitted: " << name << "(";
    for (size_t i = 0; i < values.size(); ++i) {
        if (i > 0) std::cout << ", ";
        std::cout << values[i];
    }
    std::cout << ")" << std::endl;
}

EventDefinition* EventManager::get_event_definition(const std::string& name) {
    auto it = events.find(name);
    if (it != events.end()) {
        return &it->second;
    }
    return nullptr;
}

void EventManager::parse_events_from_json(const nlohmann::json& events_json) {
    for (auto& [event_name, event_data] : events_json.items()) {
        std::vector<EventParam> params;
        
        if (event_data.contains("params")) {
            auto params_json = event_data["params"];
            for (const auto& param : params_json) {
                std::string param_name = param["name"];
                std::string param_type = param["type"];
                params.emplace_back(param_name, param_type);
            }
        }
        
        register_event(event_name, params);
    }
}

nlohmann::json EventManager::export_events_to_json() const {
    nlohmann::json result;
    
    for (const auto& [name, event] : events) {
        nlohmann::json event_json;
        nlohmann::json params_json = nlohmann::json::array();
        
        for (const auto& param : event.params) {
            nlohmann::json param_json;
            param_json["name"] = param.name;
            param_json["type"] = param.type;
            params_json.push_back(param_json);
        }
        
        event_json["params"] = params_json;
        result[name] = event_json;
    }
    
    return result;
}

// ABIGenerator 实现
ABIGenerator::ABIGenerator(const std::string& protocol, const std::string& ver) 
    : protocol_name(protocol), version(ver) {}

void ABIGenerator::set_methods(const nlohmann::json& methods_json) {
    methods = methods_json;
}

void ABIGenerator::set_state(const nlohmann::json& state_json) {
    state = state_json;
}

void ABIGenerator::set_events(const std::unordered_map<std::string, EventDefinition>& events_def) {
    events = events_def;
}

nlohmann::json ABIGenerator::generate_abi() const {
    nlohmann::json abi;
    
    abi["protocol"] = protocol_name;
    abi["version"] = version;

    nlohmann::json state_abi = nlohmann::json::object();
    for (auto& [state_name, state_data] : state.items()) {
        nlohmann::json state_item;
        state_item["type"] = state_data.value("type", "string");
        if (state_data.contains("default")) {
            state_item["default"] = state_data["default"];
        }
        state_abi[state_name] = state_item;
    }
    abi["state"] = state_abi;
    
    // 处理方法
    nlohmann::json methods_abi;
    for (auto& [method_name, method_data] : methods.items()) {
        nlohmann::json method_abi;
        
        // 参数
        if (method_data.contains("params")) {
            nlohmann::json params_abi = nlohmann::json::array();
            auto params = method_data["params"];
            nlohmann::json param_types = nlohmann::json::array();
            if (method_data.contains("param_types") && method_data["param_types"].is_array()) {
                param_types = method_data["param_types"];
            }
            
            for (size_t i = 0; i < params.size(); ++i) {
                nlohmann::json param_abi;
                param_abi["name"] = params[i];
                if (i < param_types.size() && param_types[i].is_string() && !param_types[i].get<std::string>().empty()) {
                    param_abi["type"] = param_types[i];
                } else {
                    param_abi["type"] = "string";
                }
                params_abi.push_back(param_abi);
            }
            
            method_abi["params"] = params_abi;
        } else {
            method_abi["params"] = nlohmann::json::array();
        }
        
        // 返回值
        if (method_data.contains("returns")) {
            if (method_data["returns"].is_string()) {
                method_abi["returns"] = "string";
            } else if (method_data["returns"].is_object()) {
                auto returns_obj = method_data["returns"];
                if (returns_obj.contains("type")) {
                    method_abi["returns"] = returns_obj["type"];
                } else {
                    method_abi["returns"] = "string";
                }
            }
        } else {
            method_abi["returns"] = nullptr;
        }
        
        methods_abi[method_name] = method_abi;
    }
    
    abi["methods"] = methods_abi;
    
    // 处理事件
    nlohmann::json events_abi = nlohmann::json::object();
    for (const auto& [event_name, event_def] : events) {
        nlohmann::json event_abi;
        nlohmann::json params_abi = nlohmann::json::array();
        
        for (const auto& param : event_def.params) {
            nlohmann::json param_abi;
            param_abi["name"] = param.name;
            param_abi["type"] = param.type;
            params_abi.push_back(param_abi);
        }
        
        event_abi["params"] = params_abi;
        events_abi[event_name] = event_abi;
    }
    
    abi["events"] = events_abi;
    
    return abi;
}

nlohmann::json ABIGenerator::generate_abi_from_car(const std::string& car_file) {
    std::ifstream ifs(car_file);
    if (!ifs.is_open()) {
        throw std::runtime_error("Failed to open .car file: " + car_file);
    }
    
    // 读取文件内容
    std::string content((std::istreambuf_iterator<char>(ifs)),
                       std::istreambuf_iterator<char>());
    ifs.close();
    
    // 尝试解析为 JSON 格式
    try {
        nlohmann::json car = nlohmann::json::parse(content);
        
        std::string protocol = car.value("protocol", "unknown");
        std::string version = car.value("version", "1.0");
        
        ABIGenerator generator(protocol, version);
        
        if (car.contains("cpl")) {
            auto cpl = car["cpl"];
            
            // 设置状态
            if (cpl.contains("state")) {
                generator.set_state(cpl["state"]);
            }

            // 设置方法
            if (cpl.contains("methods")) {
                generator.set_methods(cpl["methods"]);
            }
            
            // 设置事件
            if (cpl.contains("events")) {
                EventManager event_manager;
                event_manager.parse_events_from_json(cpl["events"]);
                
                // 从 EventManager 获取事件定义
                auto events_def = event_manager.export_events_to_json();
                std::unordered_map<std::string, EventDefinition> events_map;
                
                for (auto& [event_name, event_data] : events_def.items()) {
                    EventDefinition event_def(event_name);
                    if (event_data.contains("params")) {
                        auto params = event_data["params"];
                        for (const auto& param : params) {
                            event_def.add_param(param["name"], param["type"]);
                        }
                    }
                    events_map[event_name] = event_def;
                }
                
                generator.set_events(events_map);
            }
        }
        
        return generator.generate_abi();
        
    } catch (const nlohmann::json::parse_error& e) {
        // 如果不是 JSON 格式，尝试解析为编程语言格式
        return parse_programming_language_format(content);
    }
}

nlohmann::json ABIGenerator::parse_programming_language_format(const std::string& content) {
    Tokenizer tokenizer(content);
    Parser parser(tokenizer);
    ProtocolAST ast = parser.parse_protocol();

    ABIGenerator generator(ast.protocol_name, ast.version);

    nlohmann::json state = nlohmann::json::object();
    for (const auto& state_var : ast.state_variables) {
        state[state_var.name] = {
            {"type", state_var.type},
            {"default", state_var.default_value}
        };
    }
    generator.set_state(state);

    nlohmann::json methods = nlohmann::json::object();
    for (const auto& method_ast : ast.methods) {
        nlohmann::json method;
        method["params"] = method_ast.params;
        if (!method_ast.param_types.empty()) {
            method["param_types"] = method_ast.param_types;
        }
        if (!method_ast.return_expr.empty() || !method_ast.return_type.empty()) {
            nlohmann::json returns;
            if (!method_ast.return_type.empty()) returns["type"] = method_ast.return_type;
            if (!method_ast.return_expr.empty()) returns["expr"] = method_ast.return_expr;
            method["returns"] = returns;
        }
        methods[method_ast.name] = method;
    }
    generator.set_methods(methods);

    std::unordered_map<std::string, EventDefinition> events;
    for (const auto& event_ast : ast.events) {
        EventDefinition event_def(event_ast.name);
        for (const auto& param_ast : event_ast.params) {
            event_def.add_param(param_ast.name, param_ast.type);
        }
        events[event_ast.name] = event_def;
    }
    generator.set_events(events);

    return generator.generate_abi();
}

} // namespace cardity 
