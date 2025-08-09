#!/bin/bash

# Cardity 完整发布脚本
# 包含构建、测试、打包和发布流程

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 版本信息
VERSION=$(node -p "require('./package.json').version")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo -e "${PURPLE}🚀 Cardity 完整发布脚本${NC}"
echo -e "${BLUE}版本: ${VERSION}${NC}"
echo -e "${BLUE}构建时间: ${BUILD_DATE}${NC}"
echo -e "${BLUE}Git 提交: ${GIT_COMMIT}${NC}"
echo ""

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "使用方法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --build-only     仅构建，不发布"
    echo "  --test-only      仅运行测试"
    echo "  --clean          清理构建文件"
    echo "  --help, -h       显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0               完整发布流程"
    echo "  $0 --build-only  仅构建"
    echo "  $0 --test-only   仅测试"
    exit 0
fi

# 清理函数
clean_build() {
    echo -e "${YELLOW}🧹 清理构建文件...${NC}"
    rm -rf build/
    rm -rf build-*/
    rm -rf releases/
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 测试函数
run_tests() {
    echo -e "${BLUE}🧪 运行测试...${NC}"
    
    # 检查示例编译
    echo -e "${YELLOW}📝 测试示例编译...${NC}"
    if [ -f "examples/test_examples.sh" ]; then
        ./examples/test_examples.sh
    else
        echo -e "${YELLOW}⚠️  示例测试脚本不存在，跳过${NC}"
    fi
    
    # 检查基本构建
    echo -e "${YELLOW}🔨 测试基本构建...${NC}"
    mkdir -p build-test
    cd build-test
    cmake .. -DCMAKE_BUILD_TYPE=Debug
    make -j$(nproc)
    cd ..
    rm -rf build-test
    
    echo -e "${GREEN}✅ 测试完成${NC}"
}

# 构建函数
build_releases() {
    echo -e "${BLUE}🔨 构建发布版本...${NC}"
    
    # 运行构建脚本
    ./scripts/build_releases.sh
    
    echo -e "${GREEN}✅ 构建完成${NC}"
}

# 生成下载页面
generate_download_page() {
    echo -e "${BLUE}🌐 生成下载页面...${NC}"
    
    # 运行下载页面生成脚本
    ./scripts/create_download_page.sh
    
    echo -e "${GREEN}✅ 下载页面生成完成${NC}"
}

# 验证发布文件
validate_releases() {
    echo -e "${BLUE}🔍 验证发布文件...${NC}"
    
    local release_dir="releases"
    local has_errors=false
    
    # 检查必要的文件
    local required_files=(
        "download.html"
        "index.html"
        "downloads.txt"
        "release-info.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$release_dir/$file" ]; then
            echo -e "${GREEN}✅ $file${NC}"
        else
            echo -e "${RED}❌ $file 缺失${NC}"
            has_errors=true
        fi
    done
    
    # 检查压缩包
    local expected_archives=(
        "cardity-${VERSION}-darwin-x64.tar.gz"
        "cardity-${VERSION}-darwin-arm64.tar.gz"
        "cardity-${VERSION}-linux-x64.tar.gz"
        "cardity-${VERSION}-linux-arm64.tar.gz"
        "cardity-${VERSION}-win32-x64.zip"
        "cardity-${VERSION}-win32-arm64.zip"
    )
    
    echo ""
    echo -e "${YELLOW}📦 检查压缩包...${NC}"
    for archive in "${expected_archives[@]}"; do
        if [ -f "$release_dir/$archive" ]; then
            local size=$(du -h "$release_dir/$archive" | cut -f1)
            echo -e "${GREEN}✅ $archive ($size)${NC}"
        else
            echo -e "${YELLOW}⚠️  $archive 缺失 (可能是交叉编译未配置)${NC}"
        fi
    done
    
    if [ "$has_errors" = true ]; then
        echo -e "${RED}❌ 验证失败${NC}"
        return 1
    else
        echo -e "${GREEN}✅ 验证完成${NC}"
    fi
}

# 创建发布说明
create_release_notes() {
    echo -e "${BLUE}📝 创建发布说明...${NC}"
    
    cat > releases/RELEASE_NOTES.md << EOF
# Cardity v${VERSION} 发布说明

## 📅 发布日期
${BUILD_DATE}

## 🔧 构建信息
- 版本: ${VERSION}
- Git 提交: ${GIT_COMMIT}
- 构建时间: ${BUILD_DATE}

## 🆕 新功能
- 跨平台支持 (macOS, Linux, Windows)
- 支持 Intel x64 和 ARM64 架构
- 完整的 DRC-20 代币标准支持
- 现代化的事件系统
- 类型安全的编程语言
- 智能 ABI 生成器

## 📦 支持的平台
- **macOS**: Intel (x64) 和 Apple Silicon (ARM64)
- **Linux**: x86_64 和 ARM64
- **Windows**: x64 和 ARM64

## 🚀 快速开始
1. 下载对应平台的压缩包
2. 解压到本地目录
3. 运行安装脚本:
   - macOS/Linux: \`./install.sh\`
   - Windows: \`install.bat\`
4. 验证安装: \`cardity --version\`
5. 创建第一个项目: \`cardity init my-project\`

## 📚 文档
- [语言规范](docs/language_spec.md)
- [开发指南](docs/development_guide.md)
- [DRC-20 指南](docs/drc20_guide.md)
- [示例项目](examples/)

## 🔗 相关链接
- [官网](https://cardity.dev)
- [文档](https://docs.cardity.dev)
- [GitHub](https://github.com/cardity-org/cardity-core)
- [npm 包](https://www.npmjs.com/package/cardity)

## 📄 许可证
MIT License - 详见 [LICENSE](LICENSE) 文件

---

**Cardity Team** - 让区块链协议开发更简单 🚀
EOF

    echo -e "${GREEN}✅ 发布说明创建完成${NC}"
}

# 创建校验和文件
create_checksums() {
    echo -e "${BLUE}🔐 创建校验和文件...${NC}"
    
    cd releases
    
    # 创建 SHA256 校验和
    find . -name "*.tar.gz" -o -name "*.zip" | while read file; do
        if [ -f "$file" ]; then
            sha256sum "$file" >> SHA256SUMS
        fi
    done
    
    # 创建 MD5 校验和
    find . -name "*.tar.gz" -o -name "*.zip" | while read file; do
        if [ -f "$file" ]; then
            md5sum "$file" >> MD5SUMS
        fi
    done
    
    cd ..
    
    echo -e "${GREEN}✅ 校验和文件创建完成${NC}"
}

# 显示发布摘要
show_release_summary() {
    echo ""
    echo -e "${PURPLE}🎉 发布完成！${NC}"
    echo -e "${BLUE}================================${NC}"
    echo -e "${YELLOW}📁 发布目录: releases/${NC}"
    echo -e "${YELLOW}🌐 下载页面: releases/download.html${NC}"
    echo -e "${YELLOW}📝 发布说明: releases/RELEASE_NOTES.md${NC}"
    echo ""
    
    echo -e "${BLUE}📋 发布文件列表:${NC}"
    ls -la releases/
    echo ""
    
    echo -e "${GREEN}🚀 下一步:${NC}"
    echo -e "${YELLOW}1. 上传 releases/ 目录到服务器${NC}"
    echo -e "${YELLOW}2. 创建 GitHub Release${NC}"
    echo -e "${YELLOW}3. 更新官网下载链接${NC}"
    echo -e "${YELLOW}4. 发布 npm 包: npm publish${NC}"
    echo ""
    
    echo -e "${BLUE}📊 发布统计:${NC}"
    local total_files=$(find releases -type f | wc -l)
    local total_size=$(du -sh releases | cut -f1)
    echo -e "${YELLOW}文件数量: $total_files${NC}"
    echo -e "${YELLOW}总大小: $total_size${NC}"
}

# 主函数
main() {
    local build_only=false
    local test_only=false
    local clean_only=false
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --build-only)
                build_only=true
                shift
                ;;
            --test-only)
                test_only=true
                shift
                ;;
            --clean)
                clean_only=true
                shift
                ;;
            *)
                echo -e "${RED}❌ 未知参数: $1${NC}"
                echo "使用 --help 查看帮助"
                exit 1
                ;;
        esac
    done
    
    # 执行相应操作
    if [ "$clean_only" = true ]; then
        clean_build
        exit 0
    fi
    
    if [ "$test_only" = true ]; then
        run_tests
        exit 0
    fi
    
    if [ "$build_only" = true ]; then
        build_releases
        generate_download_page
        validate_releases
        create_release_notes
        create_checksums
        show_release_summary
        exit 0
    fi
    
    # 完整发布流程
    echo -e "${PURPLE}🔄 开始完整发布流程...${NC}"
    
    # 1. 清理
    clean_build
    
    # 2. 测试
    run_tests
    
    # 3. 构建
    build_releases
    
    # 4. 生成下载页面
    generate_download_page
    
    # 5. 验证
    validate_releases
    
    # 6. 创建发布说明
    create_release_notes
    
    # 7. 创建校验和
    create_checksums
    
    # 8. 显示摘要
    show_release_summary
}

# 运行主函数
main "$@"
