<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { zhipuApi, ChatMessage } from './zhipu'

// 银价数据
const silverPrice = ref<number>(0)
const loadingPrice = ref(false)
const silverType = ref('Ag(T+D)')
const isMock = ref(false)

// 用户输入
const salary = ref<number | null>(null)
const taels = computed(() => {
    if (!salary.value || !silverPrice.value) return '0.00'
    const pricePerGram = silverPrice.value / 1000
    const pricePerTael = pricePerGram * 50
    return (salary.value / pricePerTael).toFixed(2)
})

// AI 结果结构化
interface AIAnalysis {
    title: string
    level: string
    desc: string
    suggest: string
}

const aiAnalysis = ref<AIAnalysis | null>(null)
const loadingAI = ref(false)

// 解析 AI 返回的内容
const parseAIResponse = (content: string): AIAnalysis => {
    const getTagContent = (tag: string) => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)
        const match = content.match(regex)
        return match ? match[1].trim() : ''
    }

    return {
        title: getTagContent('title') || '神秘路人',
        level: getTagContent('level') || '未知',
        desc: getTagContent('desc') || content,
        suggest: getTagContent('suggest') || '既然穿越了，就多看看风景吧。'
    }
}

// 获取银价
const fetchSilverPrice = async () => {
    loadingPrice.value = true
    isMock.value = false
    try {
        const APP_KEY = '6e8647796d10884d'
        const response = await axios.get(`https://api.jisuapi.com/silver/shgold?appkey=${APP_KEY}`)

        if (response.data && response.data.status === '0' && response.data.result) {
            const agtd = response.data.result.find((item: any) => item.type === 'Ag(T+D)')
            if (agtd) {
                silverPrice.value = parseFloat(agtd.price)
                silverType.value = agtd.typename
            }
        } else {
            throw new Error('API Error')
        }
    } catch (error) {
        console.warn('获取银价失败，使用模拟数据', error)
        silverPrice.value = 7200
        silverType.value = '实时白银(估算)'
        isMock.value = true
    } finally {
        loadingPrice.value = false
    }
}

// 咨询 AI
const askAI = async () => {
    if (!salary.value || loadingAI.value) return

    loadingAI.value = true
    aiAnalysis.value = null

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: `你是一个专业的历史社会地位分析AI。请根据用户提供的月薪折合白银数量，严格按照以下标签格式返回分析结果，不要有任何开场白或多余废话：
<title>这里写职业称号</title>
<level>这里写生活水平描述</level>
<desc>这里写一段生动的穿越生活描述，字数控制在100字以内</desc>
<suggest>这里写一条给用户的趣味古代生存建议</suggest>`
        },
        {
            role: 'user',
            content: `我的月薪是 ${salary.value} 元，折合今日白银约 ${taels.value} 两。`
        }
    ]

    try {
        const content = await zhipuApi.chat(messages)
        aiAnalysis.value = parseAIResponse(content)
    } catch (error) {
        console.error('AI 接口调用失败', error)
        aiAnalysis.value = {
            title: '时空浪人',
            level: '身无分文',
            desc: '由于时空波动（网络错误），你暂时流落在古代街头。',
            suggest: '建议原地等待，或者检查一下你的网络连接。'
        }
    } finally {
        loadingAI.value = false
    }
}

onMounted(() => {
    fetchSilverPrice()
})
</script>

<template>
    <div class="app-wrapper">
        <!-- 顶部状态栏样式 -->
        <div class="top-nav">
            <div class="nav-left">
                <div class="status-indicator"><span class="dot"></span> ready</div>
                <div class="path">~/ silverera <span class="cursor">|</span></div>
            </div>
            <div class="nav-right">
                <div class="nav-item">$ ai --analyze</div>
                <div class="nav-item">$ cd /history</div>
                <div class="nav-item login-btn">Sign In</div>
            </div>
        </div>

        <main class="main-content">
            <!-- 页面标题参考 LensAI 风格 -->
            <header class="page-header">
                <div class="file-name">● ● ● silverera.vision</div>
                <div class="comment-line">// main.ts</div>
                <div class="title-group">
                    <span class="arrow-icon"></span>
                    <div class="text-wrap">
                        <h1>薪资锐评</h1>
                        <h2 class="sub-title">SilverEra<span>|</span></h2>
                    </div>
                </div>
                <div class="intro-line">> 拒绝幻想，直击灵魂。基于银价波动与历史数据的“毒舌”月薪分析，解构每一两白银的含金量。</div>
            </header>

            <!-- 核心工作区卡片 (类似代码编辑器窗口) -->
            <div class="editor-window">
                <div class="window-header">
                    <div class="dots">
                        <span class="dot red"></span>
                        <span class="dot yellow"></span>
                        <span class="dot green"></span>
                    </div>
                    <div class="window-title">SALARY-ANALYZER.TSX</div>
                </div>

                <div class="window-body">
                    <!-- 银价状态栏 -->
                    <div class="silver-status-bar">
                        <span class="label">LIVE_PRICE:</span>
                        <span class="value" :class="{ 'is-mock': isMock }">{{ silverPrice }}</span>
                        <span class="unit">CNY/KG</span>
                        <span v-if="loadingPrice" class="loading-indicator">SYNCING...</span>
                    </div>

                    <div class="input-area">
                        <div class="code-line">
                            <span class="keyword">const</span> <span class="variable">monthlySalary</span> =
                            <input v-model="salary" type="number" placeholder="输入月薪..." @keyup.enter="askAI" />;
                        </div>
                        <div class="code-line action-line">
                            <span class="keyword">await</span> <span class="function">startTravel</span>(<span class="variable">monthlySalary</span>);
                            <button class="execute-btn" :disabled="!salary || loadingAI" @click="askAI">
                                {{ loadingAI ? 'RUNNING...' : 'EXECUTE' }}
                            </button>
                        </div>
                    </div>

                    <!-- 计算结果 -->
                    <transition name="fade">
                        <div v-if="salary && silverPrice" class="result-display">
                            <div class="calculation-result">
                                <span class="comment">/* 折合白银 */</span>
                                <div class="tael-box">
                                    <span class="number">{{ taels }}</span>
                                    <span class="unit">TAELS</span>
                                </div>
                            </div>

                            <!-- AI 分析区域 (类似注释块) -->
                            <div v-if="aiAnalysis || loadingAI" class="ai-block">
                                <div class="block-header">/** AI ANALYSIS */</div>

                                <div v-if="loadingAI" class="ai-loading"><span class="cursor">></span> 正在解析历史卷宗...</div>

                                <div v-else-if="aiAnalysis" class="ai-content">
                                    <div class="ai-item">
                                        <span class="ai-key">* @identity:</span>
                                        <span class="ai-val highlight">{{ aiAnalysis.title }}</span>
                                    </div>
                                    <div class="ai-item">
                                        <span class="ai-key">* @status:</span>
                                        <span class="ai-val">{{ aiAnalysis.level }}</span>
                                    </div>
                                    <div class="ai-desc">* @description: {{ aiAnalysis.desc }}</div>
                                    <div class="ai-suggest">* @survival_tip: {{ aiAnalysis.suggest }}</div>
                                    <div class="block-footer">*/</div>
                                </div>
                            </div>
                        </div>
                    </transition>
                </div>
            </div>
        </main>

        <footer class="page-footer">
            <div class="footer-logo">🥈 SILVERERA</div>
            <div class="footer-info">由 GLM-4-FLASH 灵感智能驱动 · 实验性历史模拟系统</div>
        </footer>
    </div>
</template>

<style scoped>
.app-wrapper {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px 40px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* 顶部状态栏 */
.top-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    font-size: 12px;
    color: #666;
    margin-bottom: 40px;
}

.nav-left {
    display: flex;
    gap: 20px;
    align-items: center;
}

.nav-right {
    display: flex;
    gap: 15px;
    align-items: center;
}

.nav-item {
    padding: 4px 10px;
    border-radius: 4px;
    background: #f5f5f5;
    color: #00c853;
    cursor: pointer;
    transition: all 0.2s;
}

.nav-item:hover {
    background: #e0e0e0;
}

.login-btn {
    background: #fff3e0;
    color: #ff6d00;
    font-weight: bold;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
}

.status-indicator .dot {
    width: 8px;
    height: 8px;
    background-color: #00c853;
    border-radius: 50%;
}

.path .cursor {
    color: #ff6d00;
    animation: blink 1s infinite;
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}

/* 页面标题区 */
.page-header {
    margin-bottom: 50px;
}

.file-name {
    font-size: 14px;
    color: #999;
    margin-bottom: 8px;
}

.comment-line {
    font-size: 14px;
    color: #ccc;
    margin-bottom: 20px;
    font-style: italic;
}

.title-group {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 24px;
}

.arrow-icon {
    margin-top: 10px;
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-left: 18px solid #ff6d00;
}

.text-wrap h1 {
    font-size: 48px;
    margin: 0;
    font-weight: 800;
    color: #1a1a1a;
}

.sub-title {
    font-size: 48px;
    margin: 0;
    font-weight: 800;
    color: #ccc;
}

.sub-title span {
    background: #ccc;
    width: 15px;
    display: inline-block;
    height: 40px;
    margin-left: 5px;
    vertical-align: middle;
}

.intro-line {
    font-size: 16px;
    color: #888;
    line-height: 1.6;
    max-width: 600px;
}

/* 编辑器窗口容器 */
.editor-window {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e0e0e0;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    margin-bottom: 60px;
}

.window-header {
    background: #f8f8f8;
    padding: 12px 20px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
}

.dots {
    display: flex;
    gap: 8px;
    margin-right: 20px;
}

.dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.red {
    background: #ff5f56;
}
.yellow {
    background: #ffbd2e;
}
.green {
    background: #27c93f;
}

.window-title {
    font-size: 12px;
    color: #999;
    letter-spacing: 0.1em;
}

.window-body {
    padding: 30px;
}

/* 银价状态栏 */
.silver-status-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    margin-bottom: 30px;
    color: #666;
}

.silver-status-bar .value {
    font-weight: bold;
    color: #1a1a1a;
}

.silver-status-bar .value.is-mock {
    color: #ff6d00;
}

.loading-indicator {
    font-size: 11px;
    color: #00c853;
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    50% {
        opacity: 0.5;
    }
}

/* 输入区域代码风 */
.input-area {
    margin-bottom: 40px;
}

.code-line {
    font-size: 18px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
}

.keyword {
    color: #d32f2f;
}
.variable {
    color: #1976d2;
}
.function {
    color: #7b1fa2;
}

input {
    border: none;
    background: #f5f5f5;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 18px;
    color: #1a1a1a;
    width: 150px;
    outline: none;
    border-bottom: 2px solid transparent;
    transition: all 0.3s;
}

input:focus {
    background: #eeeeee;
    border-bottom-color: #ff6d00;
}

.execute-btn {
    background: #ff6d00;
    color: white;
    padding: 6px 16px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: bold;
    margin-left: 20px;
    transition: all 0.3s;
}

.execute-btn:hover:not(:disabled) {
    background: #e65100;
    transform: translateY(-1px);
}

.execute-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
}

/* 结果展示 */
.result-display {
    border-top: 1px solid #f0f0f0;
    padding-top: 30px;
}

.calculation-result {
    text-align: center;
    margin-bottom: 30px;
}

.comment {
    display: block;
    font-size: 14px;
    color: #00c853;
    margin-bottom: 10px;
}

.tael-box {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 10px;
}

.tael-box .number {
    font-size: 64px;
    font-weight: 800;
    color: #1a1a1a;
}

.tael-box .unit {
    font-size: 20px;
    color: #999;
}

/* AI 分析块样式 */
.ai-block {
    background: #f9f9f9;
    border-radius: 8px;
    padding: 24px;
    color: #555;
    font-size: 15px;
    line-height: 1.8;
}

.block-header {
    color: #00c853;
    margin-bottom: 15px;
}

.ai-item {
    margin-bottom: 8px;
}

.ai-key {
    color: #00c853;
    margin-right: 10px;
}

.ai-val.highlight {
    font-weight: bold;
    color: #1a1a1a;
    text-decoration: underline;
}

.ai-desc,
.ai-suggest {
    color: #555;
    margin-top: 8px;
}

.block-footer {
    color: #00c853;
    margin-top: 15px;
}

.ai-loading {
    color: #999;
}

.ai-loading .cursor {
    color: #ff6d00;
}

/* 页脚 */
.page-footer {
    margin-top: auto;
    padding: 40px 0;
    text-align: center;
    border-top: 1px solid #f0f0f0;
}

.footer-logo {
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 0.2em;
    margin-bottom: 10px;
}

.footer-info {
    font-size: 11px;
    color: #999;
}

/* 响应式适配 */
@media (max-width: 600px) {
    .nav-right {
        display: none;
    }

    .app-wrapper {
        padding: 20px;
    }

    .text-wrap h1,
    .sub-title {
        font-size: 32px;
    }

    .tael-box .number {
        font-size: 48px;
    }

    .code-line {
        font-size: 14px;
    }

    input {
        width: 100px;
        font-size: 14px;
    }
}

.fade-enter-active,
.fade-leave-active {
    transition:
        opacity 0.5s ease,
        transform 0.5s ease;
}

.fade-enter-from {
    opacity: 0;
    transform: translateY(10px);
}
</style>

