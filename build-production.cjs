#!/usr/bin/env node

/**
 * ZeroTouch 生产环境构建脚本
 * 自动化构建、优化和部署准备流程
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏗️  开始ZeroTouch生产环境构建...');

// 构建步骤
const buildSteps = {
  '清理构建目录': cleanBuildDir,
  '运行系统测试': runTests,
  '检查项目依赖': installDependencies,
  '执行生产构建': buildProduction,
  '优化构建产物': optimizeBuild,
  '生成部署报告': generateReport
};

// 执行构建流程
async function runBuild() {
  let success = 0;
  let failed = 0;
  const startTime = Date.now();
  
  for (const [stepName, stepFn] of Object.entries(buildSteps)) {
    try {
      console.log(`\n🔄 ${stepName}...`);
      await stepFn();
      console.log(`✅ ${stepName} - 完成`);
      success++;
    } catch (error) {
      console.log(`❌ ${stepName} - 失败: ${error.message}`);
      failed++;
      // 构建失败时停止后续步骤
      break;
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`\n📊 构建结果:`);
  console.log(`✅ 成功步骤: ${success}`);
  console.log(`❌ 失败步骤: ${failed}`);
  console.log(`⏱️  构建时间: ${duration}秒`);
  
  if (failed === 0) {
    console.log('\n🎉 生产构建完成！准备部署。');
    console.log('📁 构建产物位于: ./dist/');
    console.log('📋 部署指南: ./deploy.md');
  } else {
    console.log('\n💥 构建失败，请检查错误信息。');
    process.exit(1);
  }
}

// 清理构建目录
function cleanBuildDir() {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  console.log('   清理了旧的构建文件');
}

// 运行系统测试
function runTests() {
  try {
    execSync('node test-system.cjs', { stdio: 'pipe' });
    console.log('   所有系统测试通过');
  } catch (error) {
    throw new Error('系统测试失败，请先修复问题');
  }
}

// 检查依赖完整性
function installDependencies() {
  try {
    // 检查关键依赖是否存在
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const nodeModulesExists = fs.existsSync('node_modules');
    
    if (!nodeModulesExists) {
      execSync('npm install', { stdio: 'pipe' });
      console.log('   依赖安装完成');
    } else {
      console.log('   依赖检查通过');
    }
  } catch (error) {
    throw new Error('依赖检查失败');
  }
}

// 执行生产构建
function buildProduction() {
  try {
    execSync('npm run build', { stdio: 'pipe' });
    console.log('   Vite生产构建完成');
  } catch (error) {
    throw new Error('生产构建失败');
  }
}

// 优化构建产物
function optimizeBuild() {
  const distPath = './dist';
  
  if (!fs.existsSync(distPath)) {
    throw new Error('构建目录不存在');
  }
  
  // 检查关键文件
  const requiredFiles = ['index.html'];
  requiredFiles.forEach(file => {
    if (!fs.existsSync(path.join(distPath, file))) {
      throw new Error(`缺少关键文件: ${file}`);
    }
  });
  
  // 计算构建产物大小
  const stats = getDirectorySize(distPath);
  console.log(`   构建产物大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   文件数量: ${stats.files}`);
  
  // 检查大文件
  const largeFiles = findLargeFiles(distPath, 1024 * 1024); // 1MB
  if (largeFiles.length > 0) {
    console.log('   ⚠️  发现大文件:');
    largeFiles.forEach(file => {
      console.log(`      ${file.path}: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    });
  }
}

// 生成部署报告
function generateReport() {
  const report = {
    buildTime: new Date().toISOString(),
    version: getPackageVersion(),
    buildSize: getDirectorySize('./dist'),
    environment: 'production',
    nodeVersion: process.version,
    platform: process.platform
  };
  
  fs.writeFileSync('./dist/build-report.json', JSON.stringify(report, null, 2));
  console.log('   生成了构建报告: ./dist/build-report.json');
}

// 辅助函数
function getDirectorySize(dirPath) {
  let totalSize = 0;
  let fileCount = 0;
  
  function calculateSize(currentPath) {
    const stats = fs.statSync(currentPath);
    
    if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      files.forEach(file => {
        calculateSize(path.join(currentPath, file));
      });
    } else {
      totalSize += stats.size;
      fileCount++;
    }
  }
  
  calculateSize(dirPath);
  return { size: totalSize, files: fileCount };
}

function findLargeFiles(dirPath, sizeLimit) {
  const largeFiles = [];
  
  function checkFiles(currentPath) {
    const files = fs.readdirSync(currentPath);
    
    files.forEach(file => {
      const filePath = path.join(currentPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        checkFiles(filePath);
      } else if (stats.size > sizeLimit) {
        largeFiles.push({
          path: path.relative(dirPath, filePath),
          size: stats.size
        });
      }
    });
  }
  
  checkFiles(dirPath);
  return largeFiles;
}

function getPackageVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

// 运行构建
runBuild().catch(console.error);