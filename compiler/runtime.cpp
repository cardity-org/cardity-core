#include "runtime.h"
#include <iostream>
#include <fstream>
#include <algorithm>
#include <cctype>
#include <stdexcept>

namespace cardity {

Runtime::Runtime() {
    // 构造函数，初始化事件管理器
}

json Runtime::load_car_file(const std::string& filename) {
    std::ifstream ifs(filename);
    if (!ifs.is_open()) {
        throw std::runtime_error("Failed to open .car file: " + filename);
    }
    return json::parse(ifs);
}

State Runtime::initialize_state(const json& car) {
    State state;
    
    // 检查是否存在 cpl.state 字段
    if (!car.contains("cpl") || !car["cpl"].contains("state")) {
        throw std::runtime_error("Invalid .car file: missing cpl.state section");
    }
    
    // 初始化所有状态变量
    for (auto& [k, v] : car["cpl"]["state"].items()) {
        if (v.contains("default")) {
            state[k] = v["default"];
        } else {
            state[k] = ""; // 默认空字符串
        }
    }
    
    return state;
}

std::string Runtime::invoke_method(const json& car, State& state, 
                                 const std::string& method_name, 
                                 const std::vector<std::string>& args) {
    auto methods = car["cpl"]["methods"];
    if (!methods.contains(method_name)) {
        throw std::runtime_error("Method not found: " + method_name);
    }
    
    auto method = methods[method_name];
    std::vector<std::string> param_names;
    
    if (method.contains("params")) {
        param_names = method["params"].get<std::vector<std::string>>();
    }

    // 处理逻辑字段：state.xxx = yyy 或 if 条件语句
    if (method.contains("logic")) {
        if (method["logic"].is_string()) {
            // 可能包含多条以分号分隔的简单语句
            std::string logic = method["logic"];
            // 跳过空白逻辑字符串
            std::string no_space = logic;
            no_space.erase(std::remove_if(no_space.begin(), no_space.end(), ::isspace), no_space.end());
            if (!no_space.empty()) {
            // 如果是 if 开头，按 if 语句处理
            std::string trimmed = logic;
            trimmed.erase(std::remove_if(trimmed.begin(), trimmed.end(), ::isspace), trimmed.end());
            bool is_if = logic.find("if") != std::string::npos && logic.find("(") != std::string::npos && logic.find(")") != std::string::npos && logic.find("{") != std::string::npos;
            if (is_if) {
                (void)ExpressionEvaluator::execute_if_statement(logic, state, args, method, context);
            } else if (logic.find("emit ") == 0) {
                parse_emit_statement(logic, state, args, param_names);
            } else if (logic.find(';') != std::string::npos) {
                // 按分号分割逐条执行
                size_t start = 0;
                while (true) {
                    size_t pos = logic.find(';', start);
                    std::string stmt = (pos == std::string::npos) ? logic.substr(start) : logic.substr(start, pos - start);
                    // trim spaces
                    stmt.erase(stmt.begin(), std::find_if(stmt.begin(), stmt.end(), [](int ch){ return !std::isspace(ch); }));
                    stmt.erase(std::find_if(stmt.rbegin(), stmt.rend(), [](int ch){ return !std::isspace(ch); }).base(), stmt.end());
                    if (!stmt.empty()) {
                        ExpressionEvaluator::parse_assignment(stmt, state, args, method, context);
                    }
                    if (pos == std::string::npos) break;
                    start = pos + 1;
                }
            } else {
                // 单条赋值
                ExpressionEvaluator::parse_assignment(logic, state, args, method, context);
            }
            }
        } else if (method["logic"].is_array()) {
            // 多个逻辑语句
            auto logic_array = method["logic"];
            for (const auto& logic_item : logic_array) {
                std::string logic = logic_item;
                
                // 尝试解析 if 语句
                (void)ExpressionEvaluator::execute_if_statement(logic, state, args, method, context);
                
                // 尝试解析 emit 语句
                if (logic.find("emit ") == 0) {
                    parse_emit_statement(logic, state, args, param_names);
                    continue;
                }
                
                // 如果不是 if 或 emit，当作普通赋值处理
                ExpressionEvaluator::parse_assignment(logic, state, args, method, context);
            }
        }
    }

    // 处理返回语句：return 表达式（支持 state/params/ctx 与简单比较/取值）
    if (method.contains("returns")) {
        if (method["returns"].is_string()) {
            // 旧格式：简单字符串
            std::string returns = method["returns"];
            return parse_return(returns, state);
        } else if (method["returns"].is_object()) {
            // 新格式：类型化对象
            auto returns_obj = method["returns"];
            if (returns_obj.contains("expr")) {
                std::string expr = returns_obj["expr"];
                // 尝试用表达式求值：优先条件，其次变量解析
                try {
                    // 条件表达式
                    if (expr.find("==") != std::string::npos || expr.find("!=") != std::string::npos ||
                        expr.find(">=") != std::string::npos || expr.find("<=") != std::string::npos ||
                        expr.find(">") != std::string::npos || expr.find("<") != std::string::npos) {
                        bool b = ExpressionEvaluator::evaluate_condition(expr, state, args, method, context);
                        return b ? "true" : "false";
                    }
                    // 变量/索引/ctx/params 解析
                    std::string expr_trimmed = ExpressionEvaluator::trim(expr);
                    if (expr_trimmed.find("state.") == 0 || expr_trimmed.find("params.") == 0) {
                        return ExpressionEvaluator::resolve_variable(expr_trimmed, state, args, method, context);
                    }
                    if (expr_trimmed.find("ctx.") == 0) {
                        return ExpressionEvaluator::resolve_context(expr_trimmed, context);
                    }
                } catch (...) {
                    // 回退到原有解析
                    return parse_return(expr, state);
                }
                return parse_return(expr, state);
            }
        }
    }

    return "ok";
}

void Runtime::parse_assignment(const std::string& logic, State& state, 
                             const std::vector<std::string>& args,
                             const std::vector<std::string>& param_names) {
    // 解析简单赋值：state.msg = new_msg
    size_t eq = logic.find('=');
    if (eq == std::string::npos) {
        throw std::runtime_error("Invalid assignment syntax: " + logic);
    }
    
    std::string lhs = logic.substr(0, eq);
    std::string rhs = logic.substr(eq + 1);

    // 清理空白字符
    lhs = trim(lhs);
    rhs = trim(rhs);
    


    // 检查左侧是否为 state.xxx 格式
    if (lhs.find("state.") == 0) {
        std::string varname = lhs.substr(6); // 移除 "state."
        
        // 处理右侧参数
        std::string param_name = rhs;
        if (rhs.find("params.") == 0) {
            param_name = rhs.substr(7); // 移除 "params." 前缀
        }
        
        // 查找参数位置
        auto it = std::find(param_names.begin(), param_names.end(), param_name);
        if (it == param_names.end()) {
            throw std::runtime_error("Unknown parameter: " + param_name);
        }
        
        size_t idx = std::distance(param_names.begin(), it);
        if (idx >= args.size()) {
            throw std::runtime_error("Missing argument for parameter: " + param_name);
        }

        state[varname] = args[idx];
    } else {
        throw std::runtime_error("Invalid state assignment: " + lhs);
    }
}

std::string Runtime::parse_return(const std::string& returns, const State& state) {
    std::string ret = trim(returns);
    

    
    // 检查是否为表达式（包含操作符）
    std::vector<std::string> operators = {"==", "!=", ">=", "<=", ">", "<", "+", "-", "*", "/"};
    for (const auto& op : operators) {
        if (ret.find(op) != std::string::npos) {
            // 这是一个表达式，需要求值
            // 暂时简化处理：只支持简单的比较表达式
            if (ret.find(">=") != std::string::npos) {
                size_t pos = ret.find(">=");
                std::string left = ret.substr(0, pos);
                std::string right = ret.substr(pos + 2);
                
                // 清理空白字符
                left.erase(std::remove_if(left.begin(), left.end(), ::isspace), left.end());
                right.erase(std::remove_if(right.begin(), right.end(), ::isspace), right.end());
                
                // 解析左右两边
                int left_val = 0, right_val = 0;
                
                if (left.find("state.") == 0) {
                    std::string var_name = left.substr(6);
                    auto it = state.find(var_name);
                    if (it != state.end()) {
                        left_val = std::stoi(it->second);
                    }
                } else {
                    left_val = std::stoi(left);
                }
                
                if (right.find("state.") == 0) {
                    std::string var_name = right.substr(6);
                    auto it = state.find(var_name);
                    if (it != state.end()) {
                        right_val = std::stoi(it->second);
                    }
                } else {
                    right_val = std::stoi(right);
                }
                
                return left_val >= right_val ? "true" : "false";
            }
        }
    }
    
    // 检查是否为 state.xxx 格式（简单变量引用）
    if (ret.find("state.") == 0 && ret.find(" ") == std::string::npos && ret.find(">") == std::string::npos && ret.find("<") == std::string::npos) {
        std::string varname = ret.substr(6); // 移除 "state."
        
        auto it = state.find(varname);
        if (it != state.end()) {
            return it->second;
        } else {
            throw std::runtime_error("State variable not found: " + varname);
        }
    }
    
    return ret; // 直接返回字符串值
}

void Runtime::parse_emit_statement(const std::string& emit_stmt, const State& state,
                                 const std::vector<std::string>& args,
                                 const std::vector<std::string>& param_names) {
    // 解析 emit EventName(params.xxx) 格式
    size_t emit_pos = emit_stmt.find("emit ");
    size_t lparen = emit_stmt.find("(");
    size_t rparen = emit_stmt.find(")");
    
    if (emit_pos == std::string::npos || lparen == std::string::npos || rparen == std::string::npos) {
        throw std::runtime_error("Invalid emit syntax: " + emit_stmt);
    }
    
    std::string event_name = emit_stmt.substr(emit_pos + 5, lparen - emit_pos - 5);
    event_name = trim(event_name);
    
    std::string params_str = emit_stmt.substr(lparen + 1, rparen - lparen - 1);
    params_str = trim(params_str);
    

    
    // 解析参数（支持逗号分隔的多个参数）
    std::vector<std::string> event_values;
    
    if (!params_str.empty()) {
        size_t start = 0;
        while (true) {
            size_t pos = params_str.find(',', start);
            std::string tok = (pos == std::string::npos) ? params_str.substr(start) : params_str.substr(start, pos - start);
            // trim spaces
            tok.erase(tok.begin(), std::find_if(tok.begin(), tok.end(), [](int ch){ return !std::isspace(ch); }));
            tok.erase(std::find_if(tok.rbegin(), tok.rend(), [](int ch){ return !std::isspace(ch); }).base(), tok.end());
            if (!tok.empty()) {
                if (tok.rfind("params.", 0) == 0) {
                    std::string param_name = tok.substr(7);
                    auto it = std::find(param_names.begin(), param_names.end(), param_name);
                    if (it == param_names.end()) throw std::runtime_error("Unknown parameter: " + param_name);
                    size_t idx = std::distance(param_names.begin(), it);
                    if (idx >= args.size()) throw std::runtime_error("Missing argument for parameter: " + param_name);
                    event_values.push_back(args[idx]);
                } else if (tok.rfind("state.", 0) == 0) {
                    std::string state_ref = tok.substr(6);
                    auto it2 = state.find(state_ref);
                    if (it2 != state.end()) event_values.push_back(it2->second); else event_values.push_back("");
                } else if (tok.rfind("ctx.", 0) == 0) {
                    event_values.push_back(ExpressionEvaluator::resolve_context(tok, context));
                } else {
                    // 原样字面量
                    event_values.push_back(tok);
                }
            }
            if (pos == std::string::npos) break;
            start = pos + 1;
        }
    }
    
    // 触发事件
    event_manager.emit_event(event_name, event_values);
}

void Runtime::print_state(const State& state, const std::string& title) {
    std::cout << "🔁 " << title << ":\n";
    for (const auto& [k, v] : state) {
        std::cout << "  " << k << ": " << v << "\n";
    }
}

bool Runtime::method_exists(const json& car, const std::string& method_name) {
    if (!car.contains("cpl") || !car["cpl"].contains("methods")) {
        return false;
    }
    return car["cpl"]["methods"].contains(method_name);
}

std::vector<std::string> Runtime::get_method_params(const json& car, const std::string& method_name) {
    if (!method_exists(car, method_name)) {
        throw std::runtime_error("Method not found: " + method_name);
    }
    
    auto method = car["cpl"]["methods"][method_name];
    if (method.contains("params")) {
        return method["params"].get<std::vector<std::string>>();
    }
    
    return {};
}

std::string Runtime::trim(const std::string& str) {
    std::string result = str;
    result.erase(std::remove_if(result.begin(), result.end(), ::isspace), result.end());
    return result;
}

} // namespace cardity 