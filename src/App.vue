<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { aiService, ChatMessage } from './services/ai'

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
const calculateDynastyTaels = (dynastyKey: string, isAnnual: boolean = false) => {
    if (!salary.value || !silverPrice.value) return '0.00'
    // 匹配朝代关键字
    const key = Object.keys(dynastyStandards).find(k => dynastyKey.includes(k)) || '清'
    const weight = dynastyStandards[key]
    const pricePerTael = silverPrice.value * weight
    const monthlySalary = salary.value
    const amount = isAnnual ? monthlySalary * 12 : monthlySalary
    return (amount / pricePerTael).toFixed(2)
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

    const monthlyTaels = calculateDynastyTaels(selectedDynasty.value)
    const annualTaels = calculateDynastyTaels(selectedDynasty.value, true)

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: `你是一位通晓古今社会经济的史官。请根据用户提供的月薪折合白银数量（两）以及年薪总计（两），结合目标朝代的度量衡和经济背景，分析其在该朝代的社会地位。

重要注意事项：
1. 严禁混淆【月俸】与【年俸】：历史文献（如《大清会典》、《宋史·职官志》）中的官吏俸禄通常以“年”为单位。如果用户月入10两，年入则为120两。请务必将用户的年薪与历史上的年俸数据进行比对，而非直接用月薪比对年俸。
2. 目标朝代：${selectedDynasty.value}朝。请严格以此朝代为基础进行分析。
3. 职业多样化匹配：根据收入水平，从“士农工商”及其他社会阶层（如军户、匠籍等）中匹配最贴切的身份。
4. 真实物价分析：结合该朝代真实的购买力，提供职业和生活分析。务必提供具体的【物价参考】，如一石米、一匹布的价格（以白银两为单位）。

你的响应必须直接返回JSON格式数据，不要有任何开场白、解释或额外文本。
JSON 结构必须如下：
{
  "dynasty": "${selectedDynasty.value}朝",
  "title": "具体的职业身份（需有朝代特征）",
  "tags": ["标签1", "标签2", "标签3"],
  "level": "生活水平描述（如'赤贫'、'温饱'、'小康'、'富裕'、'豪奢'）",
  "price_ref": "具体物价参考（例如'一石米约值白银0.5两，据《梦溪笔谈》记载'）",
  "desc": "基于该职业的社会地位、月俸、年俸和物价的分析描述（请明确提到年收入在当时的水平）",
  "suggest": "生存锦囊"
}`
        },
        {
            role: 'user',
            content: `余月俸 ${salary.value} 元（现代货币）。
按${selectedDynasty.value}代度量衡折算：
- 月入约：${monthlyTaels} 两
- 年入约：${annualTaels} 两
请据此批阅。`
        }
    ]

    try {
        const content = await aiService.chat(messages)
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
                <div class="logo-wrapper">
                    <span class="logo-emoji">💰</span>
                </div>
                <span class="nav-brand">银色春秋.AI</span>
            </div>
            <div class="nav-right">
                <div class="model-credit">
                    <span class="pulse-dot"></span>
                    由大模型 <span class="model-name">MiMo-V2-Flash</span> 驱动
                </div>
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
            <p class="footer-author">
                <a href="https://github.com/liu-ziting/SilverEra" target="_blank" rel="noopener noreferrer" class="github-link">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="github-icon">
                        <path
                            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                        />
                    </svg>
                    by:liuziting
                </a>
            </p>
        </footer>
    </div>
</template>

<style scoped>
/* 全局变量与背景 */
:global(body) {
    background-color: #f8f9fa;
    background-image: linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
    background-size: 20px 20px;
    margin: 0;
    font-family:
        'Inter',
        -apple-system,
        BlinkMacSystemFont,
        'PingFang SC',
        'Microsoft YaHei',
        sans-serif;
    color: #2c3e50;
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
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.nav-brand {
    font-size: 1.2rem;
    font-weight: 800;
    color: #e67e22;
}

.logo-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(230, 126, 34, 0.1);
    border-radius: 10px;
}

.logo-emoji {
    font-size: 1.4rem;
    line-height: 1;
}

.nav-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.model-credit {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: #7f8c8d;
    background: #fff;
    padding: 6px 16px;
    border-radius: 20px;
    border: 1px solid #eee;
}

.model-name {
    color: #2c3e50;
    font-weight: 700;
    font-family: 'Fira Code', monospace;
}

.pulse-dot {
    width: 6px;
    height: 6px;
    background: #27c93f;
    border-radius: 50%;
    box-shadow: 0 0 0 rgba(39, 201, 63, 0.4);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(39, 201, 63, 0.7);
    }
    70% {
        transform: scale(1);
        box-shadow: 0 0 0 10px rgba(39, 201, 63, 0);
    }
    100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(39, 201, 63, 0);
    }
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
    background: #e67e22;
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
    background: #d35400;
    transform: translateY(-1px);
}

/* Hero 区域 */
.hero-section {
    padding: 30px 0 40px;
}

.breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: #e67e22;
    margin-bottom: 16px;
}

.dot {
    width: 6px;
    height: 6px;
    background: #e67e22;
    border-radius: 50%;
}

.hero-title {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 16px;
    color: #2c3e50;
}

.accent-arrow {
    color: #e67e22;
    margin-right: 8px;
}

.highlight {
    color: #e67e22;
}

.hero-desc {
    color: #7f8c8d;
    font-family: 'Fira Code', monospace;
    font-size: 0.95rem;
}

/* 窗口容器风格 */
.window-container {
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 30px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.window-header {
    background: #fcfcfc;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
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
    color: #95a5a6;
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
    color: #7f8c8d;
    margin-bottom: 8px;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-wrapper input {
    width: 100%;
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 12px 16px;
    color: #2c3e50;
    font-size: 1rem;
    transition: all 0.3s;
}

.input-wrapper input:focus {
    outline: none;
    border-color: #e67e22;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(230, 126, 34, 0.1);
}

/* 移除数字输入框控制按钮 */
.input-wrapper input::-webkit-outer-spin-button,
.input-wrapper input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.input-wrapper input[type='number'] {
    -moz-appearance: textfield;
}

.unit {
    position: absolute;
    right: 16px;
    color: #95a5a6;
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
    background: #ffffff;
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 16px;
    position: relative;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dynasty-card:hover {
    transform: translateY(-4px);
    border-color: rgba(230, 126, 34, 0.3);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
}

.dynasty-card.active {
    border-color: #e67e22;
    background: rgba(230, 126, 34, 0.02);
    box-shadow: 0 4px 15px rgba(230, 126, 34, 0.08);
}

.select-indicator {
    position: absolute;
    top: -1px;
    right: -1px;
    background: #e67e22;
    color: #fff;
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
    color: #bdc3c7;
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
    color: #e67e22;
    font-weight: 600;
}

.weight-info {
    font-size: 0.7rem;
    color: #95a5a6;
}

.card-value {
    margin-bottom: 8px;
}

.amount {
    font-size: 1.5rem;
    font-weight: 700;
    color: #2c3e50;
    margin-right: 4px;
}

.currency {
    font-size: 0.8rem;
    color: #95a5a6;
}

.card-footer {
    font-size: 0.75rem;
    color: #bdc3c7;
}

/* AI 按钮 */
.ai-action {
    text-align: center;
}

.btn-ai {
    background: #e67e22;
    color: #fff;
    border: none;
    padding: 14px 40px;
    border-radius: 30px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 8px 20px rgba(230, 126, 34, 0.15);
}

.btn-ai:hover:not(:disabled) {
    background: #d35400;
    transform: scale(1.02);
    box-shadow: 0 10px 25px rgba(230, 126, 34, 0.25);
}

.btn-ai:disabled {
    background: #ecf0f1;
    color: #bdc3c7;
    cursor: not-allowed;
    box-shadow: none;
}

/* AI 内容区域 */
.ai-content {
    display: grid;
    gap: 24px;
}

.ai-item {
    border-left: 2px solid #e67e22;
    padding-left: 20px;
}

.ai-dynasty-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.ai-tag-dynasty {
    color: #e67e22;
    font-weight: 700;
}

.ai-level {
    font-size: 0.8rem;
    background: rgba(230, 126, 34, 0.1);
    color: #e67e22;
    padding: 2px 8px;
    border-radius: 4px;
}

.ai-title {
    margin: 0 0 12px;
    font-size: 1.2rem;
    color: #2c3e50;
}

.ai-job-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.job-tag {
    font-size: 0.75rem;
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    color: #7f8c8d;
    padding: 2px 10px;
    border-radius: 4px;
    transition: all 0.2s;
}

.job-tag:hover {
    border-color: #e67e22;
    color: #e67e22;
    background: #fff;
}

.ai-desc {
    color: #34495e;
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 16px;
}

.ai-price-ref {
    font-size: 0.85rem;
    color: #7f8c8d;
    background: #fcfcfc;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 16px;
    border-left: 2px solid #eee;
}

.price-label {
    color: #e67e22;
    font-weight: 600;
}

.ai-suggest {
    font-size: 0.9rem;
    color: #7f8c8d;
    font-style: italic;
}

.suggest-label {
    color: #e67e22;
    font-weight: 600;
    font-style: normal;
}

/* 页脚 */
.app-footer {
    text-align: center;
    padding: 40px 0;
    color: #bdc3c7;
    font-size: 0.8rem;
}

.footer-author {
    margin-top: 8px;
}

.github-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #95a5a6;
    text-decoration: none;
    transition: color 0.3s;
}

.github-link:hover {
    color: #e67e22;
}

.github-icon {
    opacity: 0.8;
}

/* 响应式适配 */
@media (max-width: 768px) {
    .navbar {
        padding: 16px 0;
        gap: 12px;
    }

    .nav-brand {
        font-size: 1.1rem;
        white-space: nowrap;
    }

    .model-credit {
        padding: 4px 10px;
        font-size: 0.75rem;
        flex-shrink: 1;
        min-width: 0;
    }

    .model-credit span:not(.model-name):not(.pulse-dot) {
        display: none; /* 在极小屏幕隐藏“由大模型...驱动”字样 */
    }

    .hero-section {
        padding: 30px 0 20px;
    }

    .hero-title {
        font-size: 1.6rem;
        line-height: 1.3;
    }

    .input-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 480px) {
    .navbar {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
    }

    .nav-right {
        width: 100%;
    }

    .model-credit {
        width: 100%;
        justify-content: center;
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
