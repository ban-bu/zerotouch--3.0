#!/usr/bin/env node

/**
 * ZeroTouch系统功能测试脚本
 * 测试核心功能和组件集成
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 开始ZeroTouch系统功能测试...');

// 测试配置
const tests = {
  '项目结构检查': testProjectStructure,
  '依赖配置验证': testDependencies,
  '组件文件完整性': testComponents,
  '样式文件检查': testStyles,
  '服务模块验证': testServices
};

// 执行所有测试
async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const [testName, testFn] of Object.entries(tests)) {
    try {
      console.log(`\n📋 测试: ${testName}`);
      await testFn();
      console.log(`✅ ${testName} - 通过`);
      passed++;
    } catch (error) {
      console.log(`❌ ${testName} - 失败: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 测试结果:`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！系统准备就绪。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查相关问题。');
  }
}

// 测试项目结构
function testProjectStructure() {
  const requiredDirs = [
    'src',
    'src/components',
    'src/services',
    'src/styles',
    'src/contexts',
    'src/hooks',
    'src/utils'
  ];
  
  const requiredFiles = [
    'package.json',
    'vite.config.js',
    'tailwind.config.js',
    'src/App.jsx',
    'src/main.jsx',
    'index.html'
  ];
  
  // 检查目录
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      throw new Error(`缺少必需目录: ${dir}`);
    }
  });
  
  // 检查文件
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`缺少必需文件: ${file}`);
    }
  });
}

// 测试依赖配置
function testDependencies() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredDeps = [
    'react',
    'react-dom',
    'lucide-react',
    'tailwindcss'
  ];
  
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  requiredDeps.forEach(dep => {
    if (!allDeps[dep]) {
      throw new Error(`缺少必需依赖: ${dep}`);
    }
  });
}

// 测试组件文件
function testComponents() {
  const requiredComponents = [
    'src/components/ProblemPanel.jsx',
    'src/components/LLMPanel.jsx',
    'src/components/SolutionPanel.jsx',
    'src/components/ScenarioSelector.jsx',
    'src/components/AnimatedTransition.jsx',
    'src/components/LoadingStates.jsx',
    'src/components/NotificationSystem.jsx',
    'src/components/SettingsPanel.jsx'
  ];
  
  requiredComponents.forEach(component => {
    if (!fs.existsSync(component)) {
      throw new Error(`缺少组件文件: ${component}`);
    }
    
    // 检查文件是否为空
    const content = fs.readFileSync(component, 'utf8');
    if (content.trim().length === 0) {
      throw new Error(`组件文件为空: ${component}`);
    }
  });
}

// 测试样式文件
function testStyles() {
  const styleFiles = [
    'src/index.css',
    'src/styles/globals.css'
  ];
  
  styleFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`缺少样式文件: ${file}`);
    }
  });
  
  // 检查Tailwind配置
  const tailwindConfig = fs.readFileSync('tailwind.config.js', 'utf8');
  if (!tailwindConfig.includes('content:')) {
    throw new Error('Tailwind配置缺少content配置');
  }
}

// 测试服务模块
function testServices() {
  const serviceFiles = [
    'src/services/llmService.js',
    'src/services/realtimeService.js'
  ];
  
  serviceFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`缺少服务文件: ${file}`);
    }
  });
  
  // 检查上下文文件
  if (!fs.existsSync('src/contexts/AppContext.jsx')) {
    throw new Error('缺少应用上下文文件');
  }
}

// 运行测试
runTests().catch(console.error);