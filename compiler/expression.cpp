#include "expression.h"
#include <algorithm>
#include <cctype>
#include <stdexcept>
#include <tuple>

namespace cardity {

static std::vector<std::string> split_bracket_keys(const std::string& token) {
    // expects token trimmed, starting with state.
    std::vector<std::string> keys;
    size_t pos = token.find('[');
    while (pos != std::string::npos) {
        size_t end = token.find(']', pos);
        if (end == std::string::npos) break;
        std::string inside = token.substr(pos + 1, end - pos - 1);
        keys.push_back(inside);
        pos = token.find('[', end + 1);
    }
    return keys;
}

static std::string flatten_composite_key(const std::string& base,
                                         const std::vector<std::string>& resolved_keys) {
    std::string flat = base;
    for (const auto& k : resolved_keys) {
        flat += "@" + k;
    }
    return flat;
}

static std::string resolve_index_token(const std::string& raw,
                                       const State& state,
                                       const std::vector<std::string>& args,
                                       const json& method,
                                       const std::unordered_map<std::string, std::string>& ctx) {
    // raw could be params.xxx, state.yyy, ctx.zzz, or literal (unquoted)
    if (raw.rfind("params.", 0) == 0) {
        return ExpressionEvaluator::resolve_variable(raw, state, args, method, ctx);
    } else if (raw.rfind("state.", 0) == 0) {
        return ExpressionEvaluator::resolve_variable(raw, state, args, method, ctx);
    } else if (raw.rfind("ctx.", 0) == 0) {
        return ExpressionEvaluator::resolve_context(raw, ctx);
    }
    return raw; // treat as literal key
}

bool ExpressionEvaluator::evaluate_condition(const std::string& expr, 
                                            const State& state, 
                                            const std::vector<std::string>& args, 
                                            const json& method,
                                            const std::unordered_map<std::string, std::string>& ctx) {
    try {
        auto [left, op, right] = parse_expression(expr);
        
        std::string lval, rval;
        
        // 解析左侧值
        if (left.find("state.") == 0 || left.find("params.") == 0 || left.find("ctx.") == 0) {
            if (left.find("ctx.") == 0) {
                lval = resolve_context(left, ctx);
            } else {
                lval = resolve_variable(left, state, args, method, ctx);
            }
        } else {
            lval = resolve_literal(left);
        }
        
        // 解析右侧值
        if (right.find("state.") == 0 || right.find("params.") == 0 || right.find("ctx.") == 0) {
            if (right.find("ctx.") == 0) {
                rval = resolve_context(right, ctx);
            } else {
                rval = resolve_variable(right, state, args, method, ctx);
            }
        } else {
            rval = resolve_literal(right);
        }
        
        // 执行比较操作
        if (op == "==") {
            return lval == rval;
        } else if (op == "!=") {
            return lval != rval;
        } else if (op == ">") {
            return std::stoi(lval) > std::stoi(rval);
        } else if (op == "<") {
            return std::stoi(lval) < std::stoi(rval);
        } else if (op == ">=") {
            return std::stoi(lval) >= std::stoi(rval);
        } else if (op == "<=") {
            return std::stoi(lval) <= std::stoi(rval);
        } else {
            throw std::runtime_error("Unsupported operator: " + op);
        }
        
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to evaluate condition: " + std::string(e.what()));
    }
}

bool ExpressionEvaluator::execute_if_statement(const std::string& logic, 
                                             State& state, 
                                             const std::vector<std::string>& args, 
                                             const json& method,
                                             const std::unordered_map<std::string, std::string>& ctx) {
    // 查找 if 语句的结构：if (condition) { body }
    size_t if_pos = logic.find("if");
    if (if_pos == std::string::npos) {
        return false; // 不是 if 语句
    }
    
    size_t lparen = logic.find("(", if_pos);
    size_t rparen = logic.find(")", lparen);
    size_t lbrace = logic.find("{", rparen);
    size_t rbrace = logic.find("}", lbrace);
    
    if (lparen == std::string::npos || rparen == std::string::npos || 
        lbrace == std::string::npos || rbrace == std::string::npos) {
        throw std::runtime_error("Invalid if statement syntax");
    }
    
    // 提取条件和主体
    std::string condition = logic.substr(lparen + 1, rparen - lparen - 1);
    std::string body = logic.substr(lbrace + 1, rbrace - lbrace - 1);
    
    // 清理空白字符
    condition = trim(condition);
    body = trim(body);
    
    // 评估条件
    bool condition_result = evaluate_condition(condition, state, args, method, ctx);
    
    if (condition_result) {
        // 条件为真，执行主体
        parse_assignment(body, state, args, method, ctx);
    }
    
    return true; // 表示这是一个 if 语句
}

void ExpressionEvaluator::parse_assignment(const std::string& assignment, 
                                         State& state, 
                                         const std::vector<std::string>& args, 
                                         const json& method,
                                         const std::unordered_map<std::string, std::string>& ctx) {
    size_t eq = assignment.find('=');
    if (eq == std::string::npos) {
        throw std::runtime_error("Invalid assignment syntax: " + assignment);
    }
    
    std::string lhs = assignment.substr(0, eq);
    std::string rhs = assignment.substr(eq + 1);
    
    // 清理空白字符
    lhs = trim(lhs);
    rhs = trim(rhs);
    
    // 检查左侧是否为 state.xxx 或 state.map[key][key2] 格式
    if (lhs.rfind("state.", 0) == 0) {
        std::string after = lhs.substr(6);
        // 拆出基础名与索引
        size_t bracket = after.find('[');
        std::string base = after;
        std::vector<std::string> idx_tokens;
        if (bracket != std::string::npos) {
            base = after.substr(0, bracket);
            idx_tokens = split_bracket_keys(lhs);
        }

        // 解析右侧值，支持简单加减乘除（二元、无括号）。对多步运算请分多条语句。
        auto eval_token = [&](const std::string& tok) -> std::string {
            if (tok.rfind("params.", 0) == 0 || tok.rfind("state.", 0) == 0) {
                return resolve_variable(tok, state, args, method, ctx);
            } else if (tok.rfind("ctx.", 0) == 0) {
                return resolve_context(tok, ctx);
            } else {
                return resolve_literal(tok);
            }
        };

        std::string value;
        // 检测 + 或 - 表达式（不处理一元负号）
        size_t plus_pos = rhs.find('+');
        size_t minus_pos = rhs.find('-', 1); // 跳过可能的开头负号
        size_t mul_pos = rhs.find('*');
        size_t div_pos = rhs.find('/');
        if (plus_pos != std::string::npos || minus_pos != std::string::npos) {
            char op = (plus_pos != std::string::npos) ? '+' : '-';
            size_t pos = (op == '+') ? plus_pos : minus_pos;
            std::string a = rhs.substr(0, pos);
            std::string b = rhs.substr(pos + 1);
            a = trim(a);
            b = trim(b);
            int av = std::stoi(eval_token(a));
            int bv = std::stoi(eval_token(b));
            int rv = (op == '+') ? (av + bv) : (av - bv);
            value = std::to_string(rv);
        } else if (mul_pos != std::string::npos || div_pos != std::string::npos) {
            char op = (mul_pos != std::string::npos) ? '*' : '/';
            size_t pos = (op == '*') ? mul_pos : div_pos;
            std::string a = rhs.substr(0, pos);
            std::string b = rhs.substr(pos + 1);
            a = trim(a);
            b = trim(b);
            long long av = std::stoll(eval_token(a));
            long long bv = std::stoll(eval_token(b));
            long long rv = (op == '*') ? (av * bv) : (bv == 0 ? 0 : (av / bv));
            value = std::to_string(rv);
        } else {
            value = eval_token(rhs);
        }

        // 解析索引值
        if (!idx_tokens.empty()) {
            std::vector<std::string> resolved;
            for (const auto& rawk : idx_tokens) {
                resolved.push_back(resolve_index_token(rawk, state, args, method, ctx));
            }
            std::string flat = flatten_composite_key(base, resolved);
            state[flat] = value;
        } else {
            state[base] = value;
        }
    } else {
        throw std::runtime_error("Invalid state assignment: " + lhs);
    }
}

std::tuple<std::string, std::string, std::string> ExpressionEvaluator::parse_expression(const std::string& expr) {
    std::string left, op, right;
    
    // 支持的比较操作符
    std::vector<std::string> operators = {"==", "!=", ">=", "<=", ">", "<"};
    
    for (const auto& op_test : operators) {
        size_t pos = expr.find(op_test);
        if (pos != std::string::npos) {
            left = expr.substr(0, pos);
            op = op_test;
            right = expr.substr(pos + op_test.length());
            break;
        }
    }
    
    if (op.empty()) {
        throw std::runtime_error("No valid operator found in expression: " + expr);
    }
    
    return {trim(left), op, trim(right)};
}

std::string ExpressionEvaluator::resolve_variable(const std::string& token, 
                                                const State& state, 
                                                const std::vector<std::string>& args, 
                                                const json& method,
                                                const std::unordered_map<std::string, std::string>& ctx) {
    if (token.find("state.") == 0) {
        std::string after = token.substr(6);
        size_t bracket = after.find('[');
        std::string base = after;
        if (bracket == std::string::npos) {
            auto it = state.find(base);
            if (it != state.end()) {
                return it->second;
            } else {
                return ""; // default empty
            }
        }
        base = after.substr(0, bracket);
        auto idx_tokens = split_bracket_keys(token);
        std::vector<std::string> resolved;
        for (const auto& rawk : idx_tokens) {
            resolved.push_back(resolve_index_token(rawk, state, args, method, ctx));
        }
        std::string flat = flatten_composite_key(base, resolved);
        auto it2 = state.find(flat);
        if (it2 != state.end()) return it2->second;
        return "0"; // default zero for maps
    } else if (token.find("params.") == 0) {
        std::string key = token.substr(7);
        if (!method.contains("params")) {
            throw std::runtime_error("Method has no parameters");
        }
        
        auto param_list = method["params"];
        auto it = std::find(param_list.begin(), param_list.end(), key);
        if (it == param_list.end()) {
            throw std::runtime_error("Unknown parameter: " + key);
        }
        
        size_t idx = std::distance(param_list.begin(), it);
        if (idx >= args.size()) {
            throw std::runtime_error("Missing argument for parameter: " + key);
        }
        
        return args[idx];
    } else if (token.find("ctx.") == 0) {
        // ctx 解析在 Runtime 中注入时处理，这里占位由上层传入已解析值时替换
        // 在没有显式 ctx 表时，返回空串，留给上层做容错
        return "";
    } else {
        throw std::runtime_error("Invalid variable reference: " + token);
    }
}

std::string ExpressionEvaluator::resolve_context(const std::string& token,
                                                const std::unordered_map<std::string, std::string>& ctx) {
    if (token.rfind("ctx.", 0) != 0) return "";
    std::string key = token.substr(4);
    auto it = ctx.find(key);
    if (it != ctx.end()) return it->second;
    return "";
}

std::string ExpressionEvaluator::resolve_literal(const std::string& token) {
    if (is_string_literal(token)) {
        return extract_string_literal(token);
    } else if (is_number_literal(token)) {
        return token; // 数字字面量直接返回
    } else if (token == "true" || token == "false") {
        return token; // 布尔字面量按字符串 true/false 存储
    } else {
        throw std::runtime_error("Invalid literal: " + token);
    }
}

std::string ExpressionEvaluator::trim(const std::string& str) {
    std::string result = str;
    result.erase(std::remove_if(result.begin(), result.end(), ::isspace), result.end());
    return result;
}

bool ExpressionEvaluator::is_string_literal(const std::string& token) {
    return token.length() >= 2 && 
           ((token.front() == '"' && token.back() == '"') ||
            (token.front() == '\'' && token.back() == '\''));
}

bool ExpressionEvaluator::is_number_literal(const std::string& token) {
    if (token.empty()) return false;
    
    // 检查是否为数字（包括负号）
    size_t start = 0;
    if (token[0] == '-') start = 1;
    
    for (size_t i = start; i < token.length(); ++i) {
        if (!std::isdigit(token[i])) {
            return false;
        }
    }
    
    return true;
}

std::string ExpressionEvaluator::extract_string_literal(const std::string& token) {
    if (!is_string_literal(token)) {
        throw std::runtime_error("Not a string literal: " + token);
    }
    
    // 移除首尾的引号
    return token.substr(1, token.length() - 2);
}

} // namespace cardity 