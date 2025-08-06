#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <nlohmann/json.hpp>

namespace cardity {

// 事件参数定义
struct EventParam {
    std::string name;
    std::string type;
    
    EventParam() : name(""), type("") {}
    EventParam(const std::string& n, const std::string& t) : name(n), type(t) {}
};

// 事件定义
struct EventDefinition {
    std::string name;
    std::vector<EventParam> params;
    
    EventDefinition() : name("") {}
    EventDefinition(const std::string& n) : name(n) {}
    void add_param(const std::string& name, const std::string& type) {
        params.emplace_back(name, type);
    }
};

// 事件实例（运行时触发的事件）
struct EventInstance {
    std::string name;
    std::vector<std::string> values;
    
    EventInstance() : name("") {}
    EventInstance(const std::string& n) : name(n) {}
    void add_value(const std::string& value) {
        values.push_back(value);
    }
};

// 事件管理器
class EventManager {
private:
    std::unordered_map<std::string, EventDefinition> events;
    std::vector<EventInstance> event_log;

public:
    // 注册事件定义
    void register_event(const std::string& name, const std::vector<EventParam>& params);
    
    // 触发事件
    void emit_event(const std::string& name, const std::vector<std::string>& values);
    
    // 获取事件定义
    EventDefinition* get_event_definition(const std::string& name);
    
    // 获取事件日志
    const std::vector<EventInstance>& get_event_log() const { return event_log; }
    
    // 清空事件日志
    void clear_log() { event_log.clear(); }
    
    // 解析事件定义（从 JSON）
    void parse_events_from_json(const nlohmann::json& events_json);
    
    // 导出事件定义到 JSON
    nlohmann::json export_events_to_json() const;
};

// ABI 生成器
class ABIGenerator {
private:
    std::string protocol_name;
    std::string version;
    std::unordered_map<std::string, EventDefinition> events;
    nlohmann::json methods;

public:
    ABIGenerator(const std::string& protocol, const std::string& ver);
    
    // 设置方法定义
    void set_methods(const nlohmann::json& methods_json);
    
    // 设置事件定义
    void set_events(const std::unordered_map<std::string, EventDefinition>& events_def);
    
    // 生成 ABI JSON
    nlohmann::json generate_abi() const;
    
    // 从 .car 文件生成 ABI
    static nlohmann::json generate_abi_from_car(const std::string& car_file);
    
private:
    // 解析编程语言格式
    static nlohmann::json parse_programming_language_format(const std::string& content);
};

} // namespace cardity 