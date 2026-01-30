import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        host: '0.0.0.0', // 允许通过 IP 访问
        port: 5173 // 你可以根据需要修改端口
    }
})

