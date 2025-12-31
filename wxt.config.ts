import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Web Helper - 开发者工具箱',
    description: '开发者工具箱：JSON格式化、Base64转换、URL编解码、Cron表达式、JWT解码',
    version: '1.0.0',
    permissions: ['storage', 'clipboardWrite', 'clipboardRead'],
    action: {
      default_title: 'Web Helper',
    },
  },
});
