import { defineConfig } from 'vite';

// base 用相对路径，构建产物可以直接放到任意静态托管（含 GitHub Pages 子路径）
export default defineConfig({ base: './' });
