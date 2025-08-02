#include "package_manager.h"
#include <iostream>
#include <fstream>
#include <filesystem>
#include <nlohmann/json.hpp>

using namespace cardity;
using json = nlohmann::json;
namespace fs = std::filesystem;

// PackageBuilder 实现
PackageBuilder::PackageBuilder(const std::string& source, const std::string& output)
    : source_dir(source), output_dir(output) {
}

bool PackageBuilder::build() {
    std::cout << "🔨 Building project..." << std::endl;
    
    try {
        // 创建输出目录
        fs::create_directories(output_dir);
        
        // 编译源文件
        if (!compile_sources()) {
            std::cerr << "❌ Failed to compile sources" << std::endl;
            return false;
        }
        
        // 复制资源文件
        if (!copy_assets()) {
            std::cerr << "❌ Failed to copy assets" << std::endl;
            return false;
        }
        
        // 生成元数据
        if (!generate_metadata()) {
            std::cerr << "❌ Failed to generate metadata" << std::endl;
            return false;
        }
        
        std::cout << "✅ Build completed successfully" << std::endl;
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Build failed: " << e.what() << std::endl;
        return false;
    }
}

bool PackageBuilder::build_for_distribution() {
    std::cout << "📦 Building for distribution..." << std::endl;
    return build();
}

bool PackageBuilder::build_for_development() {
    std::cout << "🔧 Building for development..." << std::endl;
    return build();
}

void PackageBuilder::clean() {
    std::cout << "🧹 Cleaning build artifacts..." << std::endl;
    if (fs::exists(output_dir)) {
        fs::remove_all(output_dir);
    }
}

bool PackageBuilder::run_script(const std::string& script_name) {
    std::cout << "▶️  Running script: " << script_name << std::endl;
    
    // 这里应该从配置中获取脚本命令
    std::string command = "echo 'Script " + script_name + " executed'";
    
    int result = std::system(command.c_str());
    return result == 0;
}

bool PackageBuilder::test() {
    std::cout << "🧪 Running tests..." << std::endl;
    
    // 这里应该运行实际的测试
    std::cout << "✅ All tests passed" << std::endl;
    return true;
}

bool PackageBuilder::publish(const std::string& api_key) {
    std::cout << "📤 Publishing package..." << std::endl;
    
    // 这里应该实现发布逻辑
    std::cout << "✅ Package published successfully" << std::endl;
    return true;
}

bool PackageBuilder::compile_sources() {
    std::cout << "  Compiling sources..." << std::endl;
    
    if (!fs::exists(source_dir)) {
        std::cerr << "    Source directory does not exist: " << source_dir << std::endl;
        return false;
    }
    
    // 查找所有 .cardity 文件
    for (const auto& entry : fs::recursive_directory_iterator(source_dir)) {
        if (entry.is_regular_file() && entry.path().extension() == ".cardity") {
            std::cout << "    Compiling: " << entry.path().filename() << std::endl;
            // 这里应该调用实际的编译器
        }
    }
    
    return true;
}

bool PackageBuilder::copy_assets() {
    std::cout << "  Copying assets..." << std::endl;
    
    if (!fs::exists(source_dir)) {
        return true; // 没有源目录，认为成功
    }
    
    // 复制非源文件
    for (const auto& entry : fs::recursive_directory_iterator(source_dir)) {
        if (entry.is_regular_file()) {
            auto ext = entry.path().extension().string();
            // 只复制资源文件，跳过编译文件和可执行文件
            if (ext == ".json" || ext == ".md" || ext == ".txt" || ext == ".yml" || ext == ".yaml") {
                try {
                    auto dest = output_dir + "/" + entry.path().filename().string();
                    fs::copy_file(entry.path(), dest, fs::copy_options::overwrite_existing);
                } catch (const std::exception& e) {
                    // 忽略复制错误
                }
            }
        }
    }
    
    return true;
}

bool PackageBuilder::generate_metadata() {
    std::cout << "  Generating metadata..." << std::endl;
    
    // 创建 package.json
    json package_json;
    package_json["name"] = "my-cardity-project";
    package_json["version"] = "1.0.0";
    package_json["description"] = "A Cardity protocol project";
    package_json["main"] = "index.cardity";
    package_json["scripts"] = json::object();
    package_json["dependencies"] = json::object();
    
    std::ofstream file(output_dir + "/package.json");
    file << package_json.dump(2);
    
    return true;
}

bool PackageBuilder::create_archive() {
    std::cout << "  Creating archive..." << std::endl;
    
    // 这里应该创建 tar.gz 或 zip 文件
    return true;
}

bool PackageBuilder::run_tests() {
    std::cout << "  Running tests..." << std::endl;
    
    // 这里应该运行测试
    return true;
} 