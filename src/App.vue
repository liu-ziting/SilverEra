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
        title: getTagContent('title') || '无名布衣',
        level: getTagContent('level') || '尚可',
        desc: getTagContent('desc') || content,
        suggest: getTagContent('suggest') || '平安即是福。'
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
                silverType.value = '今日纹银'
            }
        } else {
            throw new Error('API Error')
        }
    } catch (error) {
        console.warn('获取银价失败，使用模拟数据', error)
        silverPrice.value = 7200
        silverType.value = '纹银(时价估算)'
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
            content: `你是一位精通明清社会经济的史官或算命先生。请根据用户提供的月薪折合白银数量（两），分析其在古代对应的社会地位和职业。
请严格按照以下标签格式返回，使用古风、典雅且生动的辞令，不要有任何多余废话：
<title>这里写职业称号（如：翰林院编修、江南丝绸商、边关校尉等）</title>
<level>这里写生活水平描述（如：钟鸣鼎食、衣食无忧、清贫乐道等）</level>
<desc>这里写一段生动的穿越生活描述，字数在100字以内，语气要符合古代背景</desc>
<suggest>这里写一条给用户的古代生存锦囊</suggest>`
        },
        {
            role: 'user',
            content: `余月俸 ${salary.value} 文，折合今日纹银 ${taels.value} 两。`
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
        <!-- 顶部状态栏 -->
        <div class="top-nav">
            <div class="nav-left">
                <div class="status-indicator"><span class="dot"></span> 乾坤待定</div>
                <div class="path">~/ 银色春秋 <span class="cursor">|</span></div>
            </div>
            <div class="nav-right">
                <div class="nav-item">考功</div>
                <div class="nav-item">方志</div>
                <div class="nav-item login-btn">登入</div>
            </div>
        </div>

        <main class="main-content">
            <!-- 页面标题 -->
            <header class="page-header">
                <div class="file-name">卷一 · 薪俸考</div>
                <div class="comment-line">/* 凡月薪几何，换算纹银，以观前程 */</div>
                <div class="title-group">
                    <div class="seal-icon">银</div>
                    <div class="text-wrap">
                        <h1>银色春秋</h1>
                        <h2 class="sub-title">SilverEra</h2>
                    </div>
                </div>
                <div class="intro-line">昔者，银钱之动，牵乎国计民生。 今以算法拟古之物价，助尔窥见若置身盛世，当为何等身份。</div>
            </header>

            <!-- 核心卷轴容器 -->
            <div class="scroll-container">
                <div class="scroll-handle top"></div>
                <div class="scroll-paper">
                    <!-- 银价状态 -->
                    <div class="silver-info">
                        <span class="label">{{ silverType }}:</span>
                        <span class="value" :class="{ 'is-mock': isMock }">{{ silverPrice }}</span>
                        <span class="unit">两/千克</span>
                        <span v-if="loadingPrice" class="loading-indicator"> 测算中...</span>
                    </div>

                    <div class="input-section">
                        <div class="input-row">
                            <span>吾之月俸：</span>
                            <div class="input-box">
                                <input v-model="salary" type="number" placeholder="请输入月薪" @keyup.enter="askAI" />
                                <span class="unit">文</span>
                            </div>
                        </div>
                        <div class="action-row">
                            <button class="ancient-btn" :disabled="!salary || loadingAI" @click="askAI">
                                <span v-if="!loadingAI">开启时空</span>
                                <span v-else>演化中...</span>
                            </button>
                        </div>
                    </div>

                    <!-- 结果展示 -->
                    <transition name="scroll-unfold">
                        <div v-if="salary && silverPrice" class="result-display">
                            <div class="divider"></div>

                            <div class="tael-result">
                                <p class="label">—— 折合今日纹银 ——</p>
                                <div class="number-wrap">
                                    <span class="number">{{ taels }}</span>
                                    <span class="unit">两</span>
                                </div>
                            </div>

                            <!-- AI 分析 -->
                            <div v-if="aiAnalysis || loadingAI" class="ai-scroll-content">
                                <div v-if="loadingAI" class="ai-loading">
                                    <div class="loading-spinner"></div>
                                    <p>主簿正翻阅《大清会典》...</p>
                                </div>

                                <div v-else-if="aiAnalysis" class="analysis-paper">
                                    <div class="analysis-header">
                                        <h3>《前程简批》</h3>
                                    </div>
                                    <div class="analysis-body">
                                        <div class="info-grid">
                                            <div class="info-item">
                                                <span class="key">所获身份：</span>
                                                <span class="val highlight">{{ aiAnalysis.title }}</span>
                                            </div>
                                            <div class="info-item">
                                                <span class="key">生活水平：</span>
                                                <span class="val">{{ aiAnalysis.level }}</span>
                                            </div>
                                        </div>
                                        <div class="desc-box">
                                            <p>{{ aiAnalysis.desc }}</p>
                                        </div>
                                        <div class="suggest-box">
                                            <span class="key">【生存锦囊】</span>
                                            <p>{{ aiAnalysis.suggest }}</p>
                                        </div>
                                    </div>
                                    <div class="seal-bottom">准</div>
                                </div>
                            </div>
                        </div>
                    </transition>
                </div>
                <div class="scroll-handle bottom"></div>
            </div>
        </main>

        <footer class="page-footer">
            <div class="footer-logo">🥈 银色春秋 · 庚子年制</div>
            <div class="footer-info">基于 GLM-4-FLASH 灵感演化 · 纯属趣味模拟</div>
        </footer>
    </div>
</template>

<style scoped>
.app-wrapper {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px 40px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* 顶部状态栏 - 古风化 */
.top-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 0;
    font-size: 13px;
    color: #5d5d5d;
    margin-bottom: 40px;
    border-bottom: 1px double #ccc;
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
    padding: 4px 12px;
    border: 1px solid #dcdcdc;
    background: rgba(255, 255, 255, 0.5);
    color: #444;
    cursor: pointer;
    transition: all 0.3s;
}

.nav-item:hover {
    background: #eee;
    border-color: #999;
}

.login-btn {
    background: #9b2226; /* 朱砂红 */
    color: #f4f1de;
    border-color: #9b2226;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
}

.status-indicator .dot {
    width: 6px;
    height: 6px;
    background-color: #9b2226;
    border-radius: 50%;
    box-shadow: 0 0 5px rgba(155, 34, 38, 0.5);
}

.path .cursor {
    color: #9b2226;
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
    text-align: center;
}

.file-name {
    font-size: 14px;
    color: #888;
    margin-bottom: 8px;
    letter-spacing: 0.2em;
}

.comment-line {
    font-size: 14px;
    color: #aaa;
    margin-bottom: 30px;
    font-style: italic;
}

.title-group {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin-bottom: 24px;
}

.seal-icon {
    width: 50px;
    height: 50px;
    border: 3px solid #9b2226;
    color: #9b2226;
    font-size: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Ma Shan Zheng', serif;
    font-weight: bold;
    padding: 5px;
    transform: rotate(-5deg);
    box-shadow: 2px 2px 0 rgba(155, 34, 38, 0.2);
}

.text-wrap h1 {
    font-size: 42px;
    margin: 0;
    font-weight: bold;
    color: #1a1a1a;
    font-family: 'Ma Shan Zheng', serif;
}

.sub-title {
    font-size: 18px;
    margin: 0;
    color: #999;
    letter-spacing: 0.3em;
    text-transform: uppercase;
}

.intro-line {
    font-size: 16px;
    color: #555;
    line-height: 1.8;
    max-width: 500px;
    margin: 0 auto;
    font-family: 'Kaiti', serif;
}

/* 卷轴容器 */
.scroll-container {
    position: relative;
    margin-bottom: 60px;
}

.scroll-handle {
    height: 25px;
    background: linear-gradient(to right, #4a4a4a, #2a2a2a, #4a4a4a);
    border-radius: 12px;
    position: relative;
    z-index: 2;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.scroll-handle::before,
.scroll-handle::after {
    content: '';
    position: absolute;
    top: -5px;
    width: 35px;
    height: 35px;
    background: #8b5e34;
    border-radius: 50%;
    border: 3px solid #5d4037;
}

.scroll-handle::before {
    left: -10px;
}
.scroll-handle::after {
    right: -10px;
}

.scroll-paper {
    background: #fdfaf0;
    border-left: 2px solid #e2d1b3;
    border-right: 2px solid #e2d1b3;
    padding: 40px;
    min-height: 200px;
    position: relative;
    z-index: 1;
    box-shadow: inset 0 0 50px rgba(226, 209, 179, 0.3);
}

/* 银价信息 */
.silver-info {
    text-align: right;
    font-size: 14px;
    color: #777;
    margin-bottom: 40px;
    font-family: 'Kaiti', serif;
}

.silver-info .value {
    color: #1a1a1a;
    font-weight: bold;
    margin: 0 5px;
}

.silver-info .value.is-mock {
    color: #9b2226;
}

/* 输入区域 */
.input-section {
    margin-bottom: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 30px;
}

.input-row {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 20px;
    font-family: 'Kaiti', serif;
}

.input-box {
    border-bottom: 2px solid #9b2226;
    padding-bottom: 5px;
    display: flex;
    align-items: baseline;
    gap: 10px;
}

.input-box input {
    background: transparent;
    border: none;
    font-size: 24px;
    width: 180px;
    text-align: center;
    color: #1a1a1a;
    outline: none;
    font-family: "Kaiti", serif;
}

/* 隐藏数字输入框调节钮 */
.input-box input::-webkit-outer-spin-button,
.input-box input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.input-box input[type="number"] {
    -moz-appearance: textfield;
}

.input-box input::placeholder {
    color: #bbb;
    font-size: 18px;
}

.ancient-btn {
    padding: 12px 40px;
    background: #1a1a1a;
    color: #fdfaf0;
    font-size: 18px;
    font-family: "Ma Shan Zheng", serif;
    letter-spacing: 0.2em;
    border: none;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 4px 4px 0 #9b2226;
}

.ancient-btn:hover:not(:disabled) {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 #9b2226;
}

.ancient-btn:disabled {
    background: #d0d0d0;
    color: #888;
    box-shadow: 4px 4px 0 #bbb;
    cursor: not-allowed;
}

/* 结果展示 */
.result-display {
    margin-top: 40px;
}

.divider {
    height: 2px;
    background: linear-gradient(to right, transparent, #e2d1b3, transparent);
    margin: 30px 0;
}

.tael-result {
    text-align: center;
    margin-bottom: 40px;
}

.tael-result .label {
    color: #888;
    font-family: 'Kaiti', serif;
}

.number-wrap {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 10px;
}

.number-wrap .number {
    font-size: 72px;
    font-weight: bold;
    font-family: 'Ma Shan Zheng', serif;
    color: #1a1a1a;
}

.number-wrap .unit {
    font-size: 24px;
    color: #555;
    font-family: 'Kaiti', serif;
}

/* AI 结果纸张 */
.analysis-paper {
    background: #fff;
    padding: 30px;
    border: 1px solid #eee;
    box-shadow: 2px 2px 15px rgba(0, 0, 0, 0.05);
    position: relative;
    border-top: 5px solid #9b2226;
}

.analysis-header {
    text-align: center;
    margin-bottom: 25px;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 15px;
}

.analysis-header h3 {
    margin: 0;
    color: #1a1a1a;
    font-family: 'Ma Shan Zheng', serif;
}

.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 25px;
}

.info-item .key {
    color: #888;
    font-size: 14px;
}

.info-item .val {
    font-size: 18px;
    font-weight: bold;
}

.info-item .val.highlight {
    color: #9b2226;
}

.desc-box {
    line-height: 1.8;
    color: #444;
    margin-bottom: 25px;
    font-family: 'Kaiti', serif;
    padding: 15px;
    background: #fcfcfc;
    border-left: 3px solid #ddd;
}

.suggest-box .key {
    display: block;
    color: #9b2226;
    font-weight: bold;
    margin-bottom: 8px;
}

.seal-bottom {
    position: absolute;
    bottom: 20px;
    right: 30px;
    width: 40px;
    height: 40px;
    border: 2px solid #9b2226;
    color: #9b2226;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Ma Shan Zheng', serif;
    font-weight: bold;
    transform: rotate(15deg);
    opacity: 0.6;
}

.ai-loading {
    text-align: center;
    padding: 40px 0;
    color: #888;
}

.loading-spinner {
    width: 30px;
    height: 30px;
    border: 2px solid #eee;
    border-top-color: #9b2226;
    border-radius: 50%;
    margin: 0 auto 15px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* 页脚 */
.page-footer {
    margin-top: auto;
    padding: 60px 0;
    text-align: center;
    border-top: 1px double #ccc;
}

.footer-logo {
    font-size: 16px;
    font-weight: bold;
    font-family: 'Ma Shan Zheng', serif;
    margin-bottom: 10px;
}

.footer-info {
    font-size: 12px;
    color: #999;
    font-family: 'Kaiti', serif;
}

/* 卷轴展开动画 */
.scroll-unfold-enter-active {
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    max-height: 1000px;
    overflow: hidden;
}

.scroll-unfold-enter-from {
    max-height: 0;
    opacity: 0;
}

/* 响应式适配 */
@media (max-width: 600px) {
    .app-wrapper {
        padding: 20px;
    }
    .text-wrap h1 {
        font-size: 32px;
    }
    .number-wrap .number {
        font-size: 54px;
    }
    .scroll-paper {
        padding: 20px;
    }
    .info-grid {
        grid-template-columns: 1fr;
    }
}
</style>

