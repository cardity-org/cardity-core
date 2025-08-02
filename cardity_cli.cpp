#include <iostream>
#include <string>
#include <vector>
#include <cstring>
#include <fstream>
#include <filesystem>
#include "package_manager.h"

using namespace cardity;

void print_usage(const std::string& program_name) {
    std::cout << "Cardity Package Manager (cardity)" << std::endl;
    std::cout << "=================================" << std::endl;
    std::cout << "Usage: " << program_name << " <command> [options]" << std::endl;
    std::cout << std::endl;
    std::cout << "Commands:" << std::endl;
    std::cout << "  init                    - Initialize a new Cardity project" << std::endl;
    std::cout << "  install <package>       - Install a package" << std::endl;
    std::cout << "  uninstall <package>     - Uninstall a package" << std::endl;
    std::cout << "  list                    - List installed packages" << std::endl;
    std::cout << "  search <query>          - Search for packages" << std::endl;
    std::cout << "  build                   - Build the current project" << std::endl;
    std::cout << "  test                    - Run tests" << std::endl;
    std::cout << "  publish                 - Publish the current package" << std::endl;
    std::cout << "  run <script>            - Run a script from cardity.json" << std::endl;
    std::cout << "  update                  - Update all packages" << std::endl;
    std::cout << "  cache                   - Manage cache" << std::endl;
    std::cout << "  login                   - Login to registry" << std::endl;
    std::cout << "  logout                  - Logout from registry" << std::endl;
    std::cout << std::endl;
    std::cout << "Options:" << std::endl;
    std::cout << "  --version               - Show version" << std::endl;
    std::cout << "  --help                  - Show help" << std::endl;
    std::cout << "  --registry <url>        - Set registry URL" << std::endl;
    std::cout << "  --cache <path>          - Set cache directory" << std::endl;
    std::cout << std::endl;
    std::cout << "Examples:" << std::endl;
    std::cout << "  " << program_name << " init" << std::endl;
    std::cout << "  " << program_name << " install @cardity/standard" << std::endl;
    std::cout << "  " << program_name << " install github:user/repo" << std::endl;
    std::cout << "  " << program_name << " build" << std::endl;
    std::cout << "  " << program_name << " publish" << std::endl;
}

void print_version() {
    std::cout << "Cardity Package Manager v1.0.0" << std::endl;
    std::cout << "Cardinals Protocol Development Toolkit" << std::endl;
}

int cmd_init(int argc, char* argv[]) {
    std::cout << "🚀 Initializing new Cardity project..." << std::endl;
    
    std::string project_name = "my-cardity-project";
    std::string version = "1.0.0";
    std::string description = "A Cardity protocol project";
    std::string author = "";
    std::string license = "MIT";
    
    // 交互式输入
    std::cout << "Project name [" << project_name << "]: ";
    std::getline(std::cin, project_name);
    if (project_name.empty()) project_name = "my-cardity-project";
    
    std::cout << "Version [" << version << "]: ";
    std::getline(std::cin, version);
    if (version.empty()) version = "1.0.0";
    
    std::cout << "Description [" << description << "]: ";
    std::getline(std::cin, description);
    if (description.empty()) description = "A Cardity protocol project";
    
    std::cout << "Author [" << author << "]: ";
    std::getline(std::cin, author);
    if (author.empty()) author = "";
    
    std::cout << "License [" << license << "]: ";
    std::getline(std::cin, license);
    if (license.empty()) license = "MIT";
    
    // 创建项目结构
    fs::create_directories("src");
    fs::create_directories("tests");
    fs::create_directories("docs");
    
    // 创建配置文件
    PackageConfig config("cardity.json");
    config.set_name(project_name);
    config.set_version(version);
    config.set_description(description);
    config.set_author(author);
    config.set_license(license);
    config.set_repository("");
    
    // 添加默认脚本
    config.add_script("build", "cardity build");
    config.add_script("test", "cardity test");
    config.add_script("publish", "cardity publish");
    
    config.save();
    
    // 创建示例协议文件 (.car 编程语言格式)
    std::string protocol_filename = "src/" + project_name + ".car";
    if (project_name.empty() || project_name == "my-cardity-project") {
        protocol_filename = "src/main.car";
    }
    
    std::ofstream protocol_file(protocol_filename);
    protocol_file << "protocol " << project_name << " {\n";
    protocol_file << "  version: \"" << version << "\";\n";
    protocol_file << "  owner: \"doge1abc123def456\";\n\n";
    protocol_file << "  state {\n";
    protocol_file << "    message: string = \"Hello, Cardity!\";\n";
    protocol_file << "    count: int = 0;\n";
    protocol_file << "  }\n\n";
    protocol_file << "  event MessageUpdated {\n";
    protocol_file << "    new_message: string;\n";
    protocol_file << "  }\n\n";
    protocol_file << "  event CounterIncremented {\n";
    protocol_file << "    old_count: int;\n";
    protocol_file << "    new_count: int;\n";
    protocol_file << "  }\n\n";
    protocol_file << "  method set_message(new_message: string) {\n";
    protocol_file << "    state.message = new_message;\n";
    protocol_file << "    emit MessageUpdated(new_message);\n";
    protocol_file << "  }\n\n";
    protocol_file << "  method get_message() {\n";
    protocol_file << "    return state.message;\n";
    protocol_file << "  }\n\n";
    protocol_file << "  method increment() {\n";
    protocol_file << "    let old_count = state.count;\n";
    protocol_file << "    state.count = state.count + 1;\n";
    protocol_file << "    emit CounterIncremented(old_count, state.count);\n";
    protocol_file << "  }\n\n";
    protocol_file << "  method get_count() {\n";
    protocol_file << "    return state.count;\n";
    protocol_file << "  }\n\n";
    protocol_file << "  method set_count(value: int) {\n";
    protocol_file << "    state.count = value;\n";
    protocol_file << "  }\n";
    protocol_file << "}\n";
    protocol_file.close();
    
    // 创建 README
    std::ofstream readme_file("README.md");
    readme_file << "# " << project_name << "\n\n";
    readme_file << description << "\n\n";
    readme_file << "## 项目结构\n\n";
    readme_file << "```\n";
    readme_file << project_name << "/\n";
    readme_file << "├── src/\n";
    readme_file << "│   └── " << (project_name.empty() || project_name == "my-cardity-project" ? "main.car" : project_name + ".car") << "          # 主协议文件\n";
    readme_file << "├── tests/                # 测试文件\n";
    readme_file << "├── docs/                 # 文档\n";
    readme_file << "├── cardity.json          # 项目配置\n";
    readme_file << "└── README.md             # 项目说明\n";
    readme_file << "```\n\n";
    readme_file << "## 开发命令\n\n";
    std::string car_filename = (project_name.empty() || project_name == "my-cardity-project") ? "main.car" : project_name + ".car";
    readme_file << "### 验证协议格式\n";
    readme_file << "```bash\n";
    readme_file << "cardityc src/" << car_filename << " --validate\n";
    readme_file << "```\n\n";
    readme_file << "### 编译协议\n";
    readme_file << "```bash\n";
    readme_file << "cardityc src/" << car_filename << " -o dist/" << car_filename << "\n";
    readme_file << "```\n\n";
    readme_file << "### 生成 ABI 接口\n";
    readme_file << "```bash\n";
    readme_file << "cardity_abi src/" << car_filename << "\n";
    readme_file << "```\n\n";
    readme_file << "### 测试协议方法\n";
    readme_file << "```bash\n";
    readme_file << "cardity_runtime src/" << car_filename << " get_message\n";
    readme_file << "cardity_runtime src/" << car_filename << " increment\n";
    readme_file << "cardity_runtime src/" << car_filename << " get_count\n";
    readme_file << "```\n\n";
    readme_file << "## 协议说明\n\n";
    readme_file << "这是一个示例 Cardity 协议，包含：\n\n";
    readme_file << "- **状态变量**: message (字符串), count (整数)\n";
    readme_file << "- **事件**: MessageUpdated, CounterIncremented\n";
    readme_file << "- **方法**: set_message, get_message, increment, get_count\n\n";
    readme_file << "## 构建和发布\n\n";
    readme_file << "```bash\n";
    readme_file << "cardity build    # 构建项目\n";
    readme_file << "cardity test     # 运行测试\n";
    readme_file << "cardity publish  # 发布到注册表\n";
    readme_file << "```\n";
    readme_file.close();
    
    std::cout << "✅ Project initialized successfully!" << std::endl;
    std::cout << "📁 Project structure created:" << std::endl;
    std::cout << "   - cardity.json (package configuration)" << std::endl;
    std::cout << "   - src/main.cardity (example protocol)" << std::endl;
    std::cout << "   - README.md (project documentation)" << std::endl;
    std::cout << "   - tests/ (test files)" << std::endl;
    std::cout << "   - docs/ (documentation)" << std::endl;
    
    return 0;
}

int cmd_install(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "❌ Package name required" << std::endl;
        std::cout << "Usage: cardity install <package>" << std::endl;
        return 1;
    }
    
    std::string package_name = argv[2];
    std::string version = "latest";
    
    if (argc > 3) {
        version = argv[3];
    }
    
    PackageManager pm;
    
    if (package_name.find("github:") == 0) {
        // GitHub 包
        std::string url = "https://github.com/" + package_name.substr(7) + "/archive/main.tar.gz";
        return pm.install_package_from_url(url, version) ? 0 : 1;
    } else if (package_name.find("http") == 0) {
        // 直接 URL
        return pm.install_package_from_url(package_name, version) ? 0 : 1;
    } else {
        // 注册表包
        return pm.install_package(package_name, version) ? 0 : 1;
    }
}

int cmd_uninstall(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "❌ Package name required" << std::endl;
        std::cout << "Usage: cardity uninstall <package>" << std::endl;
        return 1;
    }
    
    std::string package_name = argv[2];
    PackageManager pm;
    
    return pm.uninstall_package(package_name) ? 0 : 1;
}

int cmd_list(int argc, char* argv[]) {
    PackageManager pm;
    auto packages = pm.list_installed_packages();
    
    if (packages.empty()) {
        std::cout << "📦 No packages installed" << std::endl;
        return 0;
    }
    
    std::cout << "📦 Installed packages:" << std::endl;
    std::cout << std::endl;
    
    for (const auto& pkg : packages) {
        std::cout << "  " << pkg.name << "@" << pkg.version << std::endl;
        if (!pkg.description.empty()) {
            std::cout << "    " << pkg.description << std::endl;
        }
        if (!pkg.author.empty()) {
            std::cout << "    Author: " << pkg.author << std::endl;
        }
        std::cout << std::endl;
    }
    
    return 0;
}

int cmd_search(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "❌ Search query required" << std::endl;
        std::cout << "Usage: cardity search <query>" << std::endl;
        return 1;
    }
    
    std::string query = argv[2];
    PackageManager pm;
    auto results = pm.search_packages(query);
    
    if (results.empty()) {
        std::cout << "🔍 No packages found for: " << query << std::endl;
        return 0;
    }
    
    std::cout << "🔍 Search results for: " << query << std::endl;
    std::cout << std::endl;
    
    for (const auto& pkg : results) {
        std::cout << "  " << pkg.name << "@" << pkg.version << std::endl;
        if (!pkg.description.empty()) {
            std::cout << "    " << pkg.description << std::endl;
        }
        std::cout << std::endl;
    }
    
    return 0;
}

int cmd_build(int argc, char* argv[]) {
    std::cout << "🔨 Building project..." << std::endl;
    
    if (!fs::exists("cardity.json")) {
        std::cerr << "❌ Not a Cardity project. Run 'cardity init' first." << std::endl;
        return 1;
    }
    
    PackageConfig config("cardity.json");
    config.load();
    
    PackageBuilder builder(".", "dist");
    
    if (!builder.build()) {
        std::cerr << "❌ Build failed" << std::endl;
        return 1;
    }
    
    std::cout << "✅ Build completed successfully!" << std::endl;
    std::cout << "📁 Output: dist/" << std::endl;
    
    return 0;
}

int cmd_test(int argc, char* argv[]) {
    std::cout << "🧪 Running tests..." << std::endl;
    
    if (!fs::exists("cardity.json")) {
        std::cerr << "❌ Not a Cardity project. Run 'cardity init' first." << std::endl;
        return 1;
    }
    
    PackageBuilder builder(".", "dist");
    
    if (!builder.test()) {
        std::cerr << "❌ Tests failed" << std::endl;
        return 1;
    }
    
    std::cout << "✅ All tests passed!" << std::endl;
    
    return 0;
}

int cmd_publish(int argc, char* argv[]) {
    std::cout << "📤 Publishing package..." << std::endl;
    
    if (!fs::exists("cardity.json")) {
        std::cerr << "❌ Not a Cardity project. Run 'cardity init' first." << std::endl;
        return 1;
    }
    
    PackageConfig config("cardity.json");
    config.load();
    
    std::string api_key = "";
    if (argc > 2) {
        api_key = argv[2];
    } else {
        std::cout << "Enter API key: ";
        std::getline(std::cin, api_key);
    }
    
    PackageBuilder builder(".", "dist");
    
    if (!builder.publish(api_key)) {
        std::cerr << "❌ Publish failed" << std::endl;
        return 1;
    }
    
    std::cout << "✅ Package published successfully!" << std::endl;
    
    return 0;
}

int cmd_run(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "❌ Script name required" << std::endl;
        std::cout << "Usage: cardity run <script>" << std::endl;
        return 1;
    }
    
    std::string script_name = argv[2];
    
    if (!fs::exists("cardity.json")) {
        std::cerr << "❌ Not a Cardity project. Run 'cardity init' first." << std::endl;
        return 1;
    }
    
    PackageConfig config("cardity.json");
    config.load();
    
    PackageBuilder builder(".", "dist");
    
    if (!builder.run_script(script_name)) {
        std::cerr << "❌ Script execution failed" << std::endl;
        return 1;
    }
    
    return 0;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        print_usage(argv[0]);
        return 1;
    }
    
    std::string command = argv[1];
    
    // 检查帮助选项
    if (command == "-h" || command == "--help") {
        print_usage(argv[0]);
        return 0;
    }
    
    // 检查版本选项
    if (command == "--version") {
        print_version();
        return 0;
    }
    
    try {
        if (command == "init") {
            return cmd_init(argc, argv);
        } else if (command == "install") {
            return cmd_install(argc, argv);
        } else if (command == "uninstall") {
            return cmd_uninstall(argc, argv);
        } else if (command == "list") {
            return cmd_list(argc, argv);
        } else if (command == "search") {
            return cmd_search(argc, argv);
        } else if (command == "build") {
            return cmd_build(argc, argv);
        } else if (command == "test") {
            return cmd_test(argc, argv);
        } else if (command == "publish") {
            return cmd_publish(argc, argv);
        } else if (command == "run") {
            return cmd_run(argc, argv);
        } else {
            std::cerr << "❌ Unknown command: " << command << std::endl;
            print_usage(argv[0]);
            return 1;
        }
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
} 