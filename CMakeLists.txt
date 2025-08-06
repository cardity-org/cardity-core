cmake_minimum_required(VERSION 3.16)
project(cardity VERSION 1.0.0 LANGUAGES CXX)

# 设置 C++ 标准
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 编译选项
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -O2")

# 查找必要的包
find_package(nlohmann_json REQUIRED)
find_package(CURL REQUIRED)
find_package(OpenSSL REQUIRED)

# 查找 LibArchive
find_package(PkgConfig QUIET)
if(PkgConfig_FOUND)
    pkg_check_modules(LIBARCHIVE QUIET libarchive)
endif()

if(LIBARCHIVE_FOUND)
    set(LibArchive_INCLUDE_DIRS ${LIBARCHIVE_INCLUDE_DIRS})
    set(LibArchive_LIBRARIES ${LIBARCHIVE_LIBRARIES})
    set(LibArchive_LIBRARY_DIRS ${LIBARCHIVE_LIBRARY_DIRS})
    set(LibArchive_LDFLAGS ${LIBARCHIVE_LDFLAGS})
    set(LibArchive_CFLAGS ${LIBARCHIVE_CFLAGS})
else()
    # 尝试手动查找
    find_path(LibArchive_INCLUDE_DIR archive.h
        PATHS
        /usr/local/opt/libarchive/include
        /usr/include
        /usr/local/include
    )
    
    find_library(LibArchive_LIBRARY
        NAMES archive
        PATHS
        /usr/local/opt/libarchive/lib
        /usr/lib
        /usr/local/lib
    )
    
    if(LibArchive_INCLUDE_DIR AND LibArchive_LIBRARY)
        set(LibArchive_FOUND TRUE)
        set(LibArchive_INCLUDE_DIRS ${LibArchive_INCLUDE_DIR})
        set(LibArchive_LIBRARIES ${LibArchive_LIBRARY})
    else()
        message(FATAL_ERROR "LibArchive not found. Please install it with: brew install libarchive")
    endif()
endif()

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

# 包管理系统源文件
set(PACKAGE_SOURCES
    package_manager.cpp
    package_config.cpp
    package_builder.cpp
    registry_client.cpp
)

# 包管理系统头文件
set(PACKAGE_HEADERS
    package_manager.h
    registry_client.h
)

# 注意：移除了有问题的 cardity 可执行文件
# 使用 cardity_cli 作为主要的 CLI 工具

# 注意：测试程序已移除，因为测试文件不存在
# # 创建词法分析器测试程序
# add_executable(lexer_test compiler/lexer_test.cpp compiler/tokenizer.cpp)

# # 创建解析器测试程序
# add_executable(parser_test compiler/parser_test.cpp compiler/tokenizer.cpp compiler/parser.cpp)

# 创建运行时执行器
add_executable(cardity_runtime compiler/runtime_main.cpp compiler/runtime.cpp compiler/expression.cpp compiler/type_system.cpp compiler/event_system.cpp)

# 链接库
target_link_libraries(cardity_runtime nlohmann_json::nlohmann_json)

# 创建 ABI 生成器
add_executable(cardity_abi compiler/abi_generator_main.cpp compiler/event_system.cpp)

# 链接库
target_link_libraries(cardity_abi nlohmann_json::nlohmann_json)

# 创建 Cardity 编译器
add_executable(cardityc 
    compiler/cardityc_main.cpp 
    compiler/car_deployer.cpp 
    compiler/event_system.cpp 
    compiler/parser.cpp 
    compiler/tokenizer.cpp 
    compiler/car_generator.cpp 
    compiler/carc_generator.cpp
    compiler/drc20_standard.cpp
    compiler/drc20_compiler.cpp
)

# 创建 Dogecoin 部署工具
add_executable(cardity_deploy compiler/deploy_main.cpp compiler/dogecoin_deployer.cpp compiler/carc_generator.cpp)

# 创建 DRC-20 CLI 工具
add_executable(cardity_drc20 compiler/drc20_cli.cpp compiler/drc20_standard.cpp compiler/drc20_compiler.cpp)

# 链接库
target_link_libraries(cardityc nlohmann_json::nlohmann_json)
target_link_libraries(cardity_deploy nlohmann_json::nlohmann_json OpenSSL::SSL OpenSSL::Crypto)
target_link_libraries(cardity_drc20 nlohmann_json::nlohmann_json)

# 创建包管理器 CLI
add_executable(cardity_cli cardity_cli.cpp ${PACKAGE_SOURCES} ${PACKAGE_HEADERS})

# 链接库
target_link_libraries(cardity_cli 
    nlohmann_json::nlohmann_json 
    CURL::libcurl 
    ${LibArchive_LIBRARIES}
)

# 创建包管理器库
add_library(cardity_package_manager STATIC ${PACKAGE_SOURCES} ${PACKAGE_HEADERS})

# 链接库
target_link_libraries(cardity_package_manager 
    nlohmann_json::nlohmann_json 
    CURL::libcurl 
    ${LibArchive_LIBRARIES}
)

# 注意：测试文件暂时不存在，已注释掉相关测试程序
# 如果需要测试，请先创建 tests/ 目录和相应的测试文件

# # 创建运行时测试程序
# add_executable(runtime_test tests/test_runtime.cpp compiler/runtime.cpp compiler/expression.cpp compiler/type_system.cpp compiler/event_system.cpp)
# target_link_libraries(runtime_test nlohmann_json::nlohmann_json)

# # 创建表达式测试程序
# add_executable(expression_test tests/test_expression.cpp compiler/expression.cpp compiler/type_system.cpp)
# target_link_libraries(expression_test nlohmann_json::nlohmann_json)

# # 创建类型系统测试程序
# add_executable(type_system_test tests/test_type_system.cpp compiler/type_system.cpp)
# target_link_libraries(type_system_test nlohmann_json::nlohmann_json)

# # 创建包管理器测试程序
# add_executable(package_manager_test tests/test_package_manager.cpp)
# target_link_libraries(package_manager_test cardity_package_manager)

# 安装规则
install(TARGETS 
    cardity_runtime 
    cardity_abi 
    cardityc 
    cardity_deploy
    cardity_drc20
    cardity_cli 
    cardity_package_manager
    DESTINATION bin
)

# 安装头文件
install(FILES 
    ${HEADERS}
    ${PACKAGE_HEADERS}
    DESTINATION include/cardity
)

# 安装配置文件
install(FILES 
    examples/package_example/cardity.json
    DESTINATION share/cardity/examples
)

# 安装文档
install(FILES 
    docs/package_management.md
    docs/development_guide.md
    docs/language_spec.md
    DESTINATION share/cardity/docs
) 