# 银色春秋.AI (SilverEra)

[![Vue](https://img.shields.io/badge/Vue-3.4-4fc08d?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646cff?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![AI-Model](https://img.shields.io/badge/AI-MiMo--V2--Flash-red)](https://github.com/your-ai-link)

**银色春秋.AI** 是一款融合了历史经济学与人工智能技术的“工资-购买力”换算工具。它不仅能将你的现代月薪折算为中国历代（汉、唐、宋、明、清）的白银两数，更能通过 **MiMo-V2-Flash** 大模型，深度解析你在特定朝代的社会地位、职业匹配及生活水平。

---

## ✨ 核心特性

- **📈 精准换算**：基于历代真实度量衡（如唐代 1两 ≈ 41.3g，清代 1两 ≈ 37.3g）与动态银价，还原真实的购买力。
- **🤖 AI 深度解析**：由 MiMo-V2-Flash 驱动，提供极具历史代入感的身份设定，覆盖“士农工商”全阶层，拒绝千篇一律的官吏模板。
- **🖼️ AI 丹青描绘**：自动根据职业身份生成写实古风职业照，支持点击查看大图，极具电影质感。
- **💥 跨时空扎心点评**：AI 犀利点评古今生活差异，从房价到物价自由度，直戳痛点。
- **📊 消费力预警**：可视化展示购买力“升级/降级”趋势，直观感受阶层流动的真相。
- **📜 史料支撑**：分析结果参考《中国货币史》、《梦溪笔谈》等史料，提供具体的米价、绢价等物价参考。
- **🎨 极简科技风**：采用现代极简主义设计，结合米白色（Rice White）基调与朱砂红（Cinnabar Red）点缀，完美适配桌面与移动端。
- **🛡️ 隐私安全**：核心计算逻辑位于前端，AI 接口通过 Cloudflare Workers 安全转发。

## 🛠️ 技术栈

- **框架**: [Vue 3](https://vuejs.org/) (Composition API)
- **构建**: [Vite 5](https://vitejs.dev/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **后端**: [Cloudflare Workers](https://workers.cloudflare.com/) (API 代理服务)
- **AI 模型**: MiMo-V2-Flash (文本解析) & CogView-3-Flash (图像生成)

## 🚀 快速开始

### 1. 环境准备

确保你的环境中已安装 [Node.js](https://nodejs.org/) (建议 v18+)。

### 2. 安装依赖

```bash
git clone https://github.com/your-username/SilverEra.git
cd SilverEra
npm install
```

### 3. 本地开发

```bash
npm run dev
```

### 4. 构建生产版本

```bash
npm run build
```

## 📁 项目结构

```text
SilverEra/
├── src/
│   ├── services/      # 外部服务集成 (AI 服务等)
│   │   └── ai.ts      # AI 接口逻辑
│   ├── App.vue        # 核心逻辑与 UI 布局
│   ├── main.ts        # 应用入口
│   └── style.css      # 全局基础样式
├── public/            # 静态资源
└── package.json       # 项目配置与依赖
```

## 🧮 换算逻辑说明

项目内置了历代银两重量标准（g/两）：

- **汉朝**: 15.6g
- **唐朝**: 41.3g
- **宋朝**: 40.0g
- **明朝**: 37.3g
- **清朝**: 37.3g

**计算公式**:
`古代银两 = 现代月薪 / (当前银价(g) * 该朝代每两克重)`

## 📜 许可证

本项目采用 [MIT License](LICENSE) 许可协议。

---

**银色春秋.AI** - _看你的月薪在古代值几两银子？重现历史的烟火气息。_

