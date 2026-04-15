module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended', // 自动关闭与 Prettier 冲突的 ESLint 规则
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json', // 指向 TS 配置以支持类型检查
  },
  plugins: [
    '@typescript-eslint',
    'prettier'
  ],
  rules: {
    'prettier/prettier': 'error',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'import/prefer-default-export': 'off', // 插件化架构中经常使用命名导出，关闭此限制
    'class-methods-use-this': 'off',       // 插件生命周期 (如 deactivate) 中可能会出现空方法
    '@typescript-eslint/no-explicit-any': 'warn', // 允许微内核底层（如事件总线）有限度使用 any
  },
};
