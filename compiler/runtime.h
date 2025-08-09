#ifndef CARDITY_RUNTIME_H
#define CARDITY_RUNTIME_H

#include <unordered_map>
#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include "expression.h"
#include "type_system.h"
#include "event_system.h"

namespace cardity {

using json = nlohmann::json;

// 状态容器：存储协议的状态变量（支持类型化）
using State = std::unordered_map<std::string, std::string>;
using TypedState = std::unordered_map<std::string, Value>;

class Runtime {
public:
    Runtime();
    
    // 加载 .car JSON 协议文件
    static json load_car_file(const std::string& filename);
    
    // 初始化协议状态
    static State initialize_state(const json& car);
    
    // 执行方法调用
    std::string invoke_method(const json& car, State& state, 
                            const std::string& method_name, 
                            const std::vector<std::string>& args);

    // 设置调用上下文（可选）：sender/txid/data_length 等
    void set_context(const std::string& key, const std::string& value) { context[key] = value; }
    const std::unordered_map<std::string, std::string>& get_context() const { return context; }
    
    // 打印当前状态
    static void print_state(const State& state, const std::string& title = "Current State");
    
    // 验证方法是否存在
    static bool method_exists(const json& car, const std::string& method_name);
    
    // 获取方法参数列表
    static std::vector<std::string> get_method_params(const json& car, const std::string& method_name);
    
    // 获取事件管理器
    EventManager& get_event_manager() { return event_manager; }
    
    // 获取事件日志
    const std::vector<EventInstance>& get_event_log() const { return event_manager.get_event_log(); }

private:
    EventManager event_manager;
    std::unordered_map<std::string, std::string> context;
    
    // 解析简单的赋值语句：state.xxx = yyy
    static void parse_assignment(const std::string& logic, State& state, 
                               const std::vector<std::string>& args,
                               const std::vector<std::string>& param_names);
    
    // 解析返回语句：return state.xxx
    static std::string parse_return(const std::string& returns, const State& state);
    
    // 解析事件触发语句：emit EventName(params.xxx)
    void parse_emit_statement(const std::string& emit_stmt, const State& state,
                            const std::vector<std::string>& args,
                            const std::vector<std::string>& param_names);
    
    // 清理字符串（移除空白字符）
    static std::string trim(const std::string& str);
};

} // namespace cardity

#endif // CARDITY_RUNTIME_H 