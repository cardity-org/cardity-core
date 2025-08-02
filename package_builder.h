#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <nlohmann/json.hpp>
#include <filesystem>
#include "package_config.h"

namespace cardity {

using json = nlohmann::json;
namespace fs = std::filesystem;

// 构建配置
struct BuildConfig {
    std::string source_dir;
    std::string output_dir;
    std::string temp_dir;
    bool optimize;
    bool minify;
    bool generate_docs;
    bool run_tests;
    std::vector<std::string> include_paths;
    std::vector<std::string> exclude_patterns;
    
    BuildConfig() : optimize(true), minify(false), generate_docs(true), run_tests(true) {}
};

// 构建结果
struct BuildResult {
    bool success;
    std::string output_path;
    std::vector<std::string> compiled_files;
    std::vector<std::string> errors;
    std::vector<std::string> warnings;
    std::string build_time;
    size_t total_size;
    
    BuildResult() : success(false), total_size(0) {}
};

// 包构建器
class PackageBuilder {
private:
    PackageConfig config;
    BuildConfig build_config;
    std::string source_dir;
    std::string output_dir;
    
public:
    PackageBuilder(const std::string& source, const std::string& output);
    PackageBuilder(const std::string& source, const std::string& output, const BuildConfig& config);
    
    // 构建包
    BuildResult build();
    BuildResult build_for_distribution();
    BuildResult build_for_development();
    
    // 清理构建
    void clean();
    void clean_output();
    void clean_temp();
    
    // 运行脚本
    bool run_script(const std::string& script_name);
    bool run_script_with_args(const std::string& script_name, const std::vector<std::string>& args);
    
    // 测试包
    bool test();
    bool test_with_coverage();
    
    // 发布包
    bool publish(const std::string& api_key);
    bool publish_to_registry(const std::string& registry_url, const std::string& api_key);
    
    // 包验证
    bool validate_package();
    bool validate_dependencies();
    
    // 文档生成
    bool generate_documentation();
    bool generate_api_docs();
    
    // 获取构建信息
    BuildResult get_last_build_result() const;
    std::string get_build_summary() const;
    
    // 设置构建配置
    void set_build_config(const BuildConfig& config);
    void set_optimize(bool optimize);
    void set_minify(bool minify);
    void set_generate_docs(bool generate_docs);
    void set_run_tests(bool run_tests);
    
private:
    BuildResult last_build_result;
    
    // 内部构建方法
    bool compile_sources();
    bool compile_cardity_files();
    bool process_imports();
    bool resolve_dependencies();
    bool copy_assets();
    bool copy_static_files();
    bool generate_metadata();
    bool generate_package_json();
    bool create_archive();
    bool create_tarball();
    bool create_zip();
    bool run_tests_internal();
    bool run_linting();
    bool run_type_checking();
    bool optimize_output();
    bool minify_output();
    bool generate_docs_internal();
    bool validate_output();
    
    // 辅助方法
    std::vector<std::string> find_source_files() const;
    std::vector<std::string> find_asset_files() const;
    std::string get_file_hash(const std::string& file_path) const;
    std::string calculate_package_hash() const;
    bool is_file_excluded(const std::string& file_path) const;
    std::string get_relative_path(const std::string& file_path) const;
    void log_build_step(const std::string& step, bool success = true);
    void add_build_error(const std::string& error);
    void add_build_warning(const std::string& warning);
};

// 包发布器
class PackagePublisher {
private:
    PackageConfig config;
    std::string package_path;
    std::string registry_url;
    
public:
    PackagePublisher(const std::string& package_path, const std::string& registry_url = "https://registry.cardity.dev");
    
    // 发布包
    bool publish(const std::string& api_key);
    bool publish_version(const std::string& version, const std::string& api_key);
    bool unpublish_version(const std::string& version, const std::string& api_key);
    
    // 包验证
    bool validate_for_publish();
    bool check_version_exists(const std::string& version);
    
    // 获取发布信息
    std::string get_publish_url() const;
    std::string get_package_size() const;
    
private:
    bool upload_package(const std::string& api_key);
    bool update_registry_metadata(const std::string& api_key);
    std::string create_publish_manifest();
};

// 包测试器
class PackageTester {
private:
    PackageConfig config;
    std::string test_dir;
    std::string coverage_dir;
    
public:
    PackageTester(const std::string& test_dir = "tests");
    
    // 运行测试
    bool run_tests();
    bool run_tests_with_coverage();
    bool run_specific_test(const std::string& test_file);
    
    // 测试报告
    std::string generate_test_report();
    std::string generate_coverage_report();
    
    // 测试配置
    void set_test_timeout(int timeout_seconds);
    void set_test_parallel(bool parallel);
    
private:
    bool run_test_file(const std::string& test_file);
    bool collect_test_results();
    bool generate_coverage_data();
};

} // namespace cardity 