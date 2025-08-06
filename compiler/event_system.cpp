#include "event_system.h"
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

void ABIGenerator::set_events(const std::unordered_map<std::string, EventDefinition>& events_def) {
    events = events_def;
}

nlohmann::json ABIGenerator::generate_abi() const {
    nlohmann::json abi;
    
    abi["protocol"] = protocol_name;
    abi["version"] = version;
    
    // 处理方法
    nlohmann::json methods_abi;
    for (auto& [method_name, method_data] : methods.items()) {
        nlohmann::json method_abi;
        
        // 参数
        if (method_data.contains("params")) {
            nlohmann::json params_abi = nlohmann::json::array();
            auto params = method_data["params"];
            
            for (size_t i = 0; i < params.size(); ++i) {
                nlohmann::json param_abi;
                param_abi["name"] = params[i];
                param_abi["type"] = "string"; // 默认类型，可以从状态定义推断
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
    nlohmann::json events_abi;
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
    std::string protocol_name = "unknown";
    std::string version = "1.0.0";
    
    // 使用正则表达式解析编程语言格式
    std::regex protocol_regex("protocol\\s+(\\w+)\\s*\\{");
    std::regex version_regex("version:\\s*\"([^\"]+)\"");
    std::regex method_regex("method\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{");
    std::regex event_regex("event\\s+(\\w+)\\s*\\{");
    
    std::smatch matches;
    
    // 提取协议名
    if (std::regex_search(content, matches, protocol_regex)) {
        protocol_name = matches[1].str();
    }
    
    // 提取版本
    if (std::regex_search(content, matches, version_regex)) {
        version = matches[1].str();
    }
    
    ABIGenerator generator(protocol_name, version);
    
    // 解析方法
    nlohmann::json methods;
    std::string::const_iterator search_start(content.cbegin());
    
    while (std::regex_search(search_start, content.cend(), matches, method_regex)) {
        std::string method_name = matches[1].str();
        nlohmann::json method;
        method["name"] = method_name;
        method["params"] = nlohmann::json::array();
        method["returns"] = nullptr;
        methods[method_name] = method;
        search_start = matches.suffix().first;
    }
    
    generator.set_methods(methods);
    
    // 解析事件（简化版本）
    std::unordered_map<std::string, EventDefinition> events;
    search_start = content.cbegin();
    
    while (std::regex_search(search_start, content.cend(), matches, event_regex)) {
        std::string event_name = matches[1].str();
        EventDefinition event_def(event_name);
        
        // 简单的事件参数解析
        if (event_name == "TokenDeployed") {
            event_def.add_param("tick", "string");
            event_def.add_param("max_supply", "string");
        } else if (event_name == "TokenMinted") {
            event_def.add_param("tick", "string");
            event_def.add_param("amount", "int");
            event_def.add_param("total_supply", "int");
        } else if (event_name == "TokenTransferred") {
            event_def.add_param("tick", "string");
            event_def.add_param("amount", "int");
            event_def.add_param("to_address", "string");
        } else if (event_name == "MessageUpdated") {
            event_def.add_param("new_message", "string");
        }
        
        events[event_name] = event_def;
        search_start = matches.suffix().first;
    }
    
    generator.set_events(events);
    
    return generator.generate_abi();
}

} // namespace cardity 