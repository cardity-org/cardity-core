#!/bin/bash

echo "🚀 Cardity Runtime Demo"
echo "========================"

# 编译项目
echo "🔨 Building project..."
cd ..
mkdir -p build
cd build
cmake ..
make -j4

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# 运行测试
echo ""
echo "🧪 Running runtime tests..."
./runtime_test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed!"
    exit 1
fi

echo "✅ All tests passed!"

# 演示基本用法
echo ""
echo "🎮 Demo: Basic Usage"
echo "===================="

echo "1. Loading hello.car protocol..."
./cardity_runtime ../examples/hello.car

echo ""
echo "2. Setting message..."
./cardity_runtime ../examples/hello.car set_msg "Hello from Cardity!"

echo ""
echo "3. Getting message..."
./cardity_runtime ../examples/hello.car get_msg

echo ""
echo "🎮 Demo: Counter Protocol"
echo "========================="

echo "1. Loading counter.car protocol..."
./cardity_runtime ../examples/counter.car

echo ""
echo "2. Setting value to 42..."
./cardity_runtime ../examples/counter.car set_value "42"

echo ""
echo "3. Getting current value..."
./cardity_runtime ../examples/counter.car get_value

echo ""
echo "4. Setting max value to 1000..."
./cardity_runtime ../examples/counter.car set_max "1000"

echo ""
echo "5. Getting max value..."
./cardity_runtime ../examples/counter.car get_max

echo ""
echo "🎉 Demo completed successfully!"
echo ""
echo "💡 Try interactive mode:"
echo "   ./cardity_runtime ../examples/hello.car"
echo "   Then type: set_msg 'Your message'"
echo "   Then type: get_msg"
echo "   Then type: quit" 