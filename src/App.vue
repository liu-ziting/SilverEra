<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { zhipuApi, ChatMessage } from './zhipu'

// 银价数据
const silverPrice = ref<number>(Number(localStorage.getItem('silverPrice')) || 25)
const silverType = ref('官定纹银')

// 用户输入
const salary = ref<number | null>(Number(localStorage.getItem('userSalary')) || 3500)

// 监听并缓存
watch(silverPrice, newVal => {
    if (newVal) localStorage.setItem('silverPrice', newVal.toString())
})

watch(salary, newVal => {
    if (newVal) localStorage.setItem('userSalary', newVal.toString())
})
const dynastyStandards: Record<string, number> = {
    汉: 15.6,
    唐: 41.3,
    宋: 40.0,
    明: 37.3,
    清: 37.3
}

// 基础换算：现代市两（50g）作为默认展示参考
const taels = computed(() => {
    if (!salary.value || !silverPrice.value) return '0.00'
    const pricePerTael = silverPrice.value * 50
    return (salary.value / pricePerTael).toFixed(2)
})

// 根据朝代计算具体的银两
const calculateDynastyTaels = (dynastyKey: string) => {
    if (!salary.value || !silverPrice.value) return '0.00'
    // 匹配朝代关键字
    const key = Object.keys(dynastyStandards).find(k => dynastyKey.includes(k)) || '清'
    const weight = dynastyStandards[key]
    const pricePerTael = silverPrice.value * weight
    return (salary.value / pricePerTael).toFixed(2)
}

// AI 结果结构化
interface AIAnalysis {
    dynasty: string
    title: string
    tags: string[] // 新增：细分标签
    level: string
    price_ref: string
    desc: string
    suggest: string
}

const aiResults = ref<AIAnalysis[]>([])
const loadingAI = ref(false)
const selectedDynasty = ref('清') // 默认选择清朝

// 解析 AI 返回的内容
const parseAIResponse = (content: string): AIAnalysis | null => {
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : content
        const data = JSON.parse(jsonStr)

        // 兼容单对象返回
        return {
            dynasty: data.dynasty || selectedDynasty.value,
            title: data.title || '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            level: data.level || '',
            price_ref: data.price_ref || '',
            desc: data.desc || '',
            suggest: data.suggest || ''
        }
    } catch (e) {
        console.error('JSON 解析失败:', e)
        return null
    }
}

// 咨询 AI
const askAI = async () => {
    if (!salary.value || !silverPrice.value || loadingAI.value) return

    loadingAI.value = true
    aiResults.value = []

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: `你是一位通晓古今社会经济的史官。请根据用户提供的月薪折合白银数量（两），分析其在指定朝代的社会地位。
请注意：不同朝代银两价值和度量衡标准差异极大。

【核心要求】
1. 目标朝代：${selectedDynasty.value}朝。
2. 职业细化：给出具体的、有该朝代特征的身份（不要笼统，如“手工业者”）。
3. 细分标签：为该身份提供3-4个细分标签（tags）。
4. 真实物价：结合该朝代真实的购买力给出职业和生活分析，并务必提供具体的【物价参考】。

请直接返回 JSON 格式数据，不要有任何开场白或解释。
JSON 结构如下：
{
  "dynasty": "${selectedDynasty.value}朝", 
  "title": "具体的职业身份", 
  "tags": ["标签1", "标签2", "标签3"],
  "level": "生活水平", 
  "price_ref": "具体物价参考(如一石米多少钱)", 
  "desc": "基于该职业的社会地位描述", 
  "suggest": "生存锦囊" 
}`
        },
        {
            role: 'user',
            content: `余月俸 ${salary.value} 文。
按${selectedDynasty.value}代度量衡折算约为：${calculateDynastyTaels(selectedDynasty.value)} 两。
请据此批阅。`
        }
    ]

    try {
        const content = await zhipuApi.chat(messages)
        const result = parseAIResponse(content)
        if (result) aiResults.value = [result]
    } catch (error) {
        console.error('AI 接口调用失败', error)
        aiResults.value = [
            {
                dynasty: '时空缝隙',
                title: '时空浪人',
                tags: ['网络错误', '维度漂移'],
                level: '身无分文',
                price_ref: '详见史料',
                desc: '由于时空波动（网络错误），你暂时流落在古代街头。',
                suggest: '建议原地等待，或者检查一下你的网络连接。'
            }
        ]
    } finally {
        loadingAI.value = false
    }
}

onMounted(() => {})
</script>

<template>
    <div class="app-container">
        <!-- 顶部导航栏 -->
        <header class="navbar">
            <div class="nav-left">
                <span class="nav-brand">银色春秋.AI</span>
            </div>
            <div class="nav-right">
                <button class="btn-primary">立即开始</button>
            </div>
        </header>

        <main class="main-content">
            <!-- 页面标题区域 -->
            <section class="hero-section">
                <div class="breadcrumb">
                    <span class="dot"></span>
                    <span>工资银两换算器 / 银色春秋</span>
                </div>
                <h1 class="hero-title"><span class="accent-arrow">→</span> 穿越千年的<span class="highlight">购买力</span>对标</h1>
                <p class="hero-desc">// 通过现代工资与历代银价权重，精准还原你在古代的社会阶层</p>
            </section>

            <!-- 输入区域容器 -->
            <div class="window-container input-window">
                <div class="window-header">
                    <div class="window-controls">
                        <span class="control close"></span>
                        <span class="control minimize"></span>
                        <span class="control maximize"></span>
                    </div>
                    <div class="window-title">参数输入 / 配置</div>
                </div>
                <div class="window-body">
                    <div class="input-grid">
                        <div class="input-group">
                            <label>月薪收入 (CNY)</label>
                            <div class="input-wrapper">
                                <input type="number" v-model="salary" placeholder="请输入您的月薪..." />
                                <span class="unit">¥</span>
                            </div>
                        </div>
                        <div class="input-group">
                            <label>今日银价 (CNY/克)</label>
                            <div class="input-wrapper">
                                <input type="number" v-model="silverPrice" placeholder="当前市场金价..." />
                                <span class="unit">¥/g</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 换算结果区域 -->
            <div class="window-container results-window">
                <div class="window-header">
                    <div class="window-controls">
                        <span class="control close"></span>
                        <span class="control minimize"></span>
                        <span class="control maximize"></span>
                    </div>
                    <div class="window-title">换算结果 / 结果</div>
                </div>
                <div class="window-body">
                    <div class="selection-hint">// 请点击选择一个朝代进行 AI 深度分析</div>
                    <div class="dynasty-grid">
                        <div
                            v-for="(weight, dynasty) in dynastyStandards"
                            :key="dynasty"
                            class="dynasty-card"
                            :class="{ active: selectedDynasty === dynasty }"
                            @click="selectedDynasty = dynasty"
                        >
                            <div class="card-header">
                                <span class="dynasty-tag">{{ dynasty }}朝</span>
                                <span class="weight-info">{{ weight }}g/两</span>
                            </div>
                            <div class="card-value">
                                <span class="amount">{{ calculateDynastyTaels(dynasty) }}</span>
                                <span class="currency">两</span>
                            </div>
                            <div class="card-footer">月俸对标</div>
                            <div class="select-indicator" v-if="selectedDynasty === dynasty">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="ai-action">
                        <button @click="askAI" :disabled="loadingAI || !salary" class="btn-ai">
                            <span v-if="loadingAI" class="loader"></span>
                            {{ loadingAI ? '分析中...' : `对标 ${selectedDynasty} 朝身份` }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- AI 分析展示区 -->
            <div v-if="aiResults.length > 0" class="window-container ai-window">
                <div class="window-header">
                    <div class="window-controls">
                        <span class="control close"></span>
                        <span class="control minimize"></span>
                        <span class="control maximize"></span>
                    </div>
                    <div class="window-title">AI 阶层透视 / 分析</div>
                </div>
                <div class="window-body ai-content">
                    <div v-for="(item, index) in aiResults" :key="index" class="ai-item">
                        <div class="ai-dynasty-header">
                            <span class="ai-tag-dynasty"># {{ item.dynasty }}</span>
                            <span class="ai-level">{{ item.level }}</span>
                        </div>
                        <h3 class="ai-title">{{ item.title }}</h3>
                        <!-- 细分职业标签 -->
                        <div class="ai-job-tags">
                            <span v-for="tag in item.tags" :key="tag" class="job-tag">{{ tag }}</span>
                        </div>
                        <p class="ai-desc">{{ item.desc }}</p>
                        <div class="ai-price-ref">
                            <span class="price-label">当年物价参考：</span>
                            {{ item.price_ref }}
                        </div>
                        <div class="ai-suggest">
                            <span class="suggest-label">建议：</span>
                            {{ item.suggest }}
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <footer class="app-footer">
            <p>© 2026 银色春秋项目. All rights reserved.</p>
        </footer>
    </div>
</template>

<style scoped>
/* 全局变量与背景 */
:global(body) {
    background-color: #0a0a0a;
    background-image: linear-gradient(rgba(255, 107, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 107, 0, 0.05) 1px, transparent 1px);
    background-size: 30px 30px;
    margin: 0;
    font-family:
        'Inter',
        -apple-system,
        BlinkMacSystemFont,
        'PingFang SC',
        'Microsoft YaHei',
        sans-serif;
    color: #e0e0e0;
}

.app-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 20px;
}

/* 导航栏 */
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-brand {
    font-size: 1.2rem;
    font-weight: 800;
    color: #ff6b00;
    margin-right: 40px;
}

.nav-links {
    display: inline-flex;
    gap: 24px;
}

.nav-link {
    color: #999;
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.3s;
}

.nav-link:hover,
.nav-link.active {
    color: #fff;
}

.btn-primary {
    background: #ff6b00;
    color: #fff;
    border: none;
    padding: 8px 20px;
    border-radius: 20px;
    font-weight: 600;
    cursor: pointer;
    transition:
        transform 0.2s,
        background 0.2s;
}

.btn-primary:hover {
    background: #ff8533;
    transform: translateY(-1px);
}

/* Hero 区域 */
.hero-section {
    padding: 60px 0 40px;
}

.breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: #ff6b00;
    margin-bottom: 16px;
}

.dot {
    width: 6px;
    height: 6px;
    background: #ff6b00;
    border-radius: 50%;
}

.hero-title {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 16px;
    color: #fff;
}

.accent-arrow {
    color: #ff6b00;
    margin-right: 8px;
}

.highlight {
    color: #ff6b00;
}

.hero-desc {
    color: #666;
    font-family: 'Fira Code', monospace;
    font-size: 0.95rem;
}

/* 窗口容器风格 */
.window-container {
    background: #141414;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 30px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.window-header {
    background: #1a1a1a;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.window-controls {
    display: flex;
    gap: 8px;
    margin-right: 16px;
}

.control {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.close {
    background: #ff5f56;
}
.minimize {
    background: #ffbd2e;
}
.maximize {
    background: #27c93f;
}

.window-title {
    font-size: 0.75rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.window-body {
    padding: 24px;
}

/* 输入区域网格 */
.input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
}

.input-group label {
    display: block;
    font-size: 0.85rem;
    color: #999;
    margin-bottom: 8px;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-wrapper input {
    width: 100%;
    background: #1f1f1f;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 12px 16px;
    color: #fff;
    font-size: 1rem;
    transition: border-color 0.3s;
}

.input-wrapper input:focus {
    outline: none;
    border-color: #ff6b00;
}

.unit {
    position: absolute;
    right: 16px;
    color: #666;
    font-size: 0.9rem;
}

/* 结果网格 */
.dynasty-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.dynasty-card {
    background: #1f1f1f;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
    position: relative;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dynasty-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 107, 0, 0.5);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
}

.dynasty-card.active {
    border-color: #ff6b00;
    background: rgba(255, 107, 0, 0.05);
    box-shadow: 0 0 20px rgba(255, 107, 0, 0.15);
}

.select-indicator {
    position: absolute;
    top: -1px;
    right: -1px;
    background: #ff6b00;
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 0 8px 0 8px;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-5px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.selection-hint {
    font-family: 'Fira Code', monospace;
    font-size: 0.8rem;
    color: #444;
    margin-bottom: 20px;
    padding-left: 4px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
}

.dynasty-tag {
    font-size: 0.75rem;
    color: #ff6b00;
    font-weight: 600;
}

.weight-info {
    font-size: 0.7rem;
    color: #666;
}

.card-value {
    margin-bottom: 8px;
}

.amount {
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
    margin-right: 4px;
}

.currency {
    font-size: 0.8rem;
    color: #999;
}

.card-footer {
    font-size: 0.75rem;
    color: #666;
}

/* AI 按钮 */
.ai-action {
    text-align: center;
}

.btn-ai {
    background: #ff6b00;
    color: #fff;
    border: none;
    padding: 14px 40px;
    border-radius: 30px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 10px 20px rgba(255, 107, 0, 0.2);
}

.btn-ai:hover:not(:disabled) {
    background: #ff8533;
    transform: scale(1.02);
    box-shadow: 0 12px 24px rgba(255, 107, 0, 0.3);
}

.btn-ai:disabled {
    background: #333;
    cursor: not-allowed;
    box-shadow: none;
}

/* AI 内容区域 */
.ai-content {
    display: grid;
    gap: 24px;
}

.ai-item {
    border-left: 2px solid #ff6b00;
    padding-left: 20px;
}

.ai-dynasty-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.ai-tag-dynasty {
    color: #ff6b00;
    font-weight: 700;
}

.ai-level {
    font-size: 0.8rem;
    background: rgba(255, 107, 0, 0.1);
    color: #ff6b00;
    padding: 2px 8px;
    border-radius: 4px;
}

.ai-title {
    margin: 0 0 12px;
    font-size: 1.2rem;
    color: #fff;
}

.ai-job-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.job-tag {
    font-size: 0.75rem;
    background: #1f1f1f;
    border: 1px solid #333;
    color: #aaa;
    padding: 2px 10px;
    border-radius: 4px;
    transition: all 0.2s;
}

.job-tag:hover {
    border-color: #ff6b00;
    color: #ff6b00;
}

.ai-desc {
    color: #999;
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 16px;
}

.ai-price-ref {
    font-size: 0.85rem;
    color: #888;
    background: rgba(255, 255, 255, 0.03);
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 16px;
    border-left: 2px solid #333;
}

.price-label {
    color: #ff6b00;
    font-weight: 600;
}

.ai-suggest {
    font-size: 0.9rem;
    color: #aaa;
    font-style: italic;
}

.suggest-label {
    color: #ff6b00;
    font-weight: 600;
    font-style: normal;
}

/* 页脚 */
.app-footer {
    text-align: center;
    padding: 40px 0;
    color: #444;
    font-size: 0.8rem;
}

/* 响应式适配 */
@media (max-width: 768px) {
    .hero-title {
        font-size: 1.8rem;
    }
    .input-grid {
        grid-template-columns: 1fr;
    }
    .nav-links {
        display: none;
    }
}

/* 加载动画 */
.loader {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
    margin-right: 10px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>

