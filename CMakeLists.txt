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
)

# 头文件
set(HEADERS
    compiler/tokenizer.h
    compiler/parser.h
    compiler/parser_ast.h
    compiler/ast.h
    compiler/car_generator.h
)

# 创建主可执行文件
add_executable(cardity ${SOURCES} ${HEADERS})

# 链接库
target_link_libraries(cardity nlohmann_json::nlohmann_json)

# 创建词法分析器测试程序
add_executable(lexer_test compiler/lexer_test.cpp compiler/tokenizer.cpp)

# 创建解析器测试程序
add_executable(parser_test compiler/parser_test.cpp compiler/tokenizer.cpp compiler/parser.cpp)

# 安装规则
install(TARGETS cardity DESTINATION bin) 