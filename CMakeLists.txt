cmake_minimum_required(VERSION 3.16)
project(cardity VERSION 1.0.0 LANGUAGES CXX)

# 设置 C++ 标准
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 编译选项
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -O2")

# 查找必要的包
find_package(nlohmann_json REQUIRED)

# 包含目录
include_directories(compiler)

# 源文件
set(SOURCES
    compiler/main.cpp
    compiler/tokenizer.cpp
    compiler/parser.cpp
    compiler/car_generator.cpp
    compiler/car_generator_ast.cpp
    compiler/runtime.cpp
    compiler/expression.cpp
    compiler/type_system.cpp
    compiler/event_system.cpp
    compiler/car_deployer.cpp
)

# 头文件
set(HEADERS
    compiler/tokenizer.h
    compiler/parser.h
    compiler/parser_ast.h
    compiler/ast.h
    compiler/car_generator.h
    compiler/runtime.h
    compiler/expression.h
    compiler/type_system.h
    compiler/event_system.h
    compiler/car_deployer.h
)

# 创建主可执行文件
add_executable(cardity ${SOURCES} ${HEADERS})

# 链接库
target_link_libraries(cardity nlohmann_json::nlohmann_json)

# 创建词法分析器测试程序
add_executable(lexer_test compiler/lexer_test.cpp compiler/tokenizer.cpp)

# 创建解析器测试程序
add_executable(parser_test compiler/parser_test.cpp compiler/tokenizer.cpp compiler/parser.cpp)

# 创建运行时执行器
add_executable(cardity_runtime compiler/runtime_main.cpp compiler/runtime.cpp compiler/expression.cpp compiler/type_system.cpp compiler/event_system.cpp)

# 链接库
target_link_libraries(cardity_runtime nlohmann_json::nlohmann_json)

# 创建 ABI 生成器
add_executable(cardity_abi compiler/abi_generator_main.cpp compiler/event_system.cpp)

# 链接库
target_link_libraries(cardity_abi nlohmann_json::nlohmann_json)

# 创建 Cardity 编译器
add_executable(cardityc compiler/cardityc_main.cpp compiler/car_deployer.cpp compiler/event_system.cpp)

# 链接库
target_link_libraries(cardityc nlohmann_json::nlohmann_json)

# 创建运行时测试程序
add_executable(runtime_test tests/test_runtime.cpp compiler/runtime.cpp compiler/expression.cpp compiler/type_system.cpp compiler/event_system.cpp)

# 链接库
target_link_libraries(runtime_test nlohmann_json::nlohmann_json)

# 创建表达式测试程序
add_executable(expression_test tests/test_expression.cpp compiler/expression.cpp compiler/type_system.cpp)

# 链接库
target_link_libraries(expression_test nlohmann_json::nlohmann_json)

# 创建类型系统测试程序
add_executable(type_system_test tests/test_type_system.cpp compiler/type_system.cpp)

# 链接库
target_link_libraries(type_system_test nlohmann_json::nlohmann_json)

# 安装规则
install(TARGETS cardity cardity_runtime cardity_abi cardityc DESTINATION bin) 