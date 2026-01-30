<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { zhipuApi, ChatMessage } from './zhipu'

// 银价数据
const silverPrice = ref<number>(Number(localStorage.getItem('silverPrice')) || 25)
const silverType = ref('官定纹银')

// 用户输入
const salary = ref<number | null>(Number(localStorage.getItem('userSalary')) || null)

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
    level: string
    price_ref: string // 新增：当年物价参考
    desc: string
    suggest: string
}

const aiResults = ref<AIAnalysis[]>([])
const loadingAI = ref(false)

// 解析 AI 返回的内容 (支持多个朝代 JSON 格式)
const parseAIResponse = (content: string): AIAnalysis[] => {
    try {
        // 提取 JSON 字符串（处理可能存在的 markdown 代码块）
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : content
        const data = JSON.parse(jsonStr)

        // 兼容不同的返回格式（数组或对象）
        if (Array.isArray(data)) return data
        if (data.results) return data.results
        if (data.data) return data.data

        // 如果是按朝代作为 key 的对象
        const dynasties = ['汉', '唐', '宋', '明', '清']
        const results: AIAnalysis[] = []
        dynasties.forEach(d => {
            const key = Object.keys(data).find(k => k.includes(d))
            if (key && data[key]) {
                results.push({
                    dynasty: data[key].dynasty || `${d}朝`,
                    title: data[key].title || '',
                    level: data[key].level || '',
                    price_ref: data[key].price_ref || '',
                    desc: data[key].desc || '',
                    suggest: data[key].suggest || ''
                })
            }
        })
        return results.length > 0 ? results : []
    } catch (e) {
        console.error('JSON 解析失败:', e)
        return []
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
            content: `你是一位通晓古今社会经济的史官。请根据用户提供的月薪折合白银数量（两），同时分析其在 汉、唐、宋、明、清 五个朝代对应的社会地位。
请注意：不同朝代银两价值和度量衡标准差异极大。
请结合各朝代真实的购买力给出职业和生活分析，并务必提供该朝代的【物价参考】。

请直接返回 JSON 格式数据，不要有任何开场白或解释。
JSON 结构如下：
{
  "汉": { "dynasty": "大汉西汉年间", "title": "职业", "level": "生活水平", "price_ref": "物价参考", "desc": "描述", "suggest": "锦囊" },
  "唐": { "dynasty": "大唐贞观年间", "title": "职业", "level": "生活水平", "price_ref": "物价参考", "desc": "描述", "suggest": "锦囊" },
  "宋": { "dynasty": "大宋开宝年间", "title": "职业", "level": "生活水平", "price_ref": "物价参考", "desc": "描述", "suggest": "锦囊" },
  "明": { "dynasty": "大明万历年间", "title": "职业", "level": "生活水平", "price_ref": "物价参考", "desc": "描述", "suggest": "锦囊" },
  "清": { "dynasty": "大清康熙年间", "title": "职业", "level": "生活水平", "price_ref": "物价参考", "desc": "描述", "suggest": "锦囊" }
}`
        },
        {
            role: 'user',
            content: `余月俸 ${salary.value} 文。
按历代度量衡折算：
- 汉代：${calculateDynastyTaels('汉')} 两
- 唐代：${calculateDynastyTaels('唐')} 两
- 宋代：${calculateDynastyTaels('宋')} 两
- 明清：${calculateDynastyTaels('明')} 两
请据此批阅。`
        }
    ]

    try {
        const content = await zhipuApi.chat(messages)
        aiResults.value = parseAIResponse(content)
    } catch (error) {
        console.error('AI 接口调用失败', error)
        aiResults.value = [
            {
                dynasty: '时空缝隙',
                title: '时空浪人',
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
                        <span class="label">当前银价:</span>
                        <div class="manual-input-box">
                            <input v-model="silverPrice" type="number" placeholder="请输入今日银价" class="manual-silver-input" />
                        </div>
                        <span class="unit">元/克</span>
                    </div>

                    <div class="input-section">
                        <div class="input-row">
                            <span>吾之月俸：</span>
                            <div class="input-box">
                                <input v-model="salary" type="number" placeholder="请输入月薪" @keyup.enter="askAI" />
                                <span class="unit">元</span>
                            </div>
                        </div>
                        <div class="action-row">
                            <button class="ancient-btn" :disabled="!salary || !silverPrice || loadingAI" @click="askAI">
                                <span v-if="!loadingAI">咨询主簿</span>
                                <span v-else>主簿批阅中...</span>
                            </button>
                        </div>
                    </div>

                    <!-- 结果展示 -->
                    <transition name="scroll-unfold">
                        <div v-if="salary && silverPrice" class="result-display">
                            <div class="divider"></div>

                            <div class="tael-result">
                                <p class="label">—— 历代俸银换算 ——</p>
                                <div class="dynasty-taels-list">
                                    <div v-for="(weight, dynasty) in dynastyStandards" :key="dynasty" class="dynasty-tael-item">
                                        <span class="dynasty-name">{{ dynasty }}代：</span>
                                        <span class="dynasty-value">{{ calculateDynastyTaels(dynasty) }}</span>
                                        <span class="dynasty-unit">两</span>
                                    </div>
                                    <div class="dynasty-tael-item modern">
                                        <span class="dynasty-name">现代(50g)：</span>
                                        <span class="dynasty-value">{{ taels }}</span>
                                        <span class="dynasty-unit">两</span>
                                    </div>
                                </div>
                            </div>

                            <!-- AI 分析 -->
                            <div v-if="aiResults.length > 0 || loadingAI" class="ai-scroll-content">
                                <div v-if="loadingAI" class="ai-loading">
                                    <div class="loading-spinner"></div>
                                    <p>主簿正翻阅《历代职官志》...</p>
                                </div>

                                <div v-else class="results-grid">
                                    <div v-for="(item, index) in aiResults" :key="index" class="analysis-paper">
                                        <div class="analysis-header">
                                            <h3>《{{ item.dynasty }} · 前程简批》</h3>
                                        </div>
                                        <div class="analysis-body">
                                            <div class="info-grid">
                                                <div class="info-item">
                                                    <span class="key">折合银两：</span>
                                                    <span class="val highlight">{{ calculateDynastyTaels(item.dynasty) }} 两</span>
                                                </div>
                                                <div class="info-item">
                                                    <span class="key">所获身份：</span>
                                                    <span class="val">{{ item.title }}</span>
                                                </div>
                                                <div class="info-item">
                                                    <span class="key">生活水平：</span>
                                                    <span class="val">{{ item.level }}</span>
                                                </div>
                                                <div class="info-item full-width">
                                                    <span class="key">当年物价：</span>
                                                    <span class="val price-text">{{ item.price_ref }}</span>
                                                </div>
                                            </div>
                                            <div class="desc-box">
                                                <p>{{ item.desc }}</p>
                                            </div>
                                            <div class="suggest-box">
                                                <span class="key">【生存锦囊】</span>
                                                <p>{{ item.suggest }}</p>
                                            </div>
                                        </div>
                                        <div class="seal-bottom">准</div>
                                    </div>
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
    max-width: 1200px;
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
    padding: 40px 20px; /* 减少左右内边距，给网格更多空间 */
    min-height: 200px;
    position: relative;
    z-index: 1;
    box-shadow: inset 0 0 50px rgba(226, 209, 179, 0.3);
}

/* 银价信息 */
.silver-info {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    font-size: 14px;
    color: #777;
    margin-bottom: 40px;
    font-family: 'Kaiti', serif;
    gap: 10px;
}

.manual-input-box {
    border-bottom: 1px solid #9b2226;
}

.manual-silver-input {
    background: transparent;
    border: none;
    width: 100px;
    text-align: center;
    font-size: 16px;
    color: #9b2226;
    outline: none;
    font-family: 'Kaiti', serif;
}

.manual-silver-input::-webkit-outer-spin-button,
.manual-silver-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.silver-info .value {
    color: #1a1a1a;
    font-weight: bold;
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
    font-family: 'Kaiti', serif;
}

/* 隐藏数字输入框调节钮 */
.input-box input::-webkit-outer-spin-button,
.input-box input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.input-box input[type='number'] {
    -moz-appearance: textfield;
}

.input-box input::placeholder {
    color: #bbb;
    font-size: 18px;
}

.ancient-btn {
    padding: 15px 50px;
    background: #9b2226; /* 改为朱砂红，更显眼 */
    color: #fdfaf0;
    font-size: 20px;
    font-family: 'Ma Shan Zheng', 'Kaiti', serif;
    letter-spacing: 0.3em;
    border: none;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 4px 4px 0 #1a1a1a;
    border-radius: 4px;
}

.ancient-btn:hover:not(:disabled) {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 #1a1a1a;
    background: #b91d1d;
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

.results-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* 默认两列 */
    gap: 30px;
    margin-top: 20px;
}

@media (max-width: 900px) {
    .results-grid {
        grid-template-columns: 1fr; /* 移动端单列 */
    }
}

@media (max-width: 600px) {
    .app-wrapper {
        padding: 10px;
    }
    .scroll-paper {
        padding: 30px 15px;
    }
}

.divider {
    height: 2px;
    background: linear-gradient(to right, transparent, #e2d1b3, transparent);
    margin: 30px 0;
}

.tael-result {
    text-align: center;
    margin-bottom: 40px;
    padding: 20px;
    background: rgba(155, 34, 38, 0.03);
    border-radius: 8px;
}

.tael-result .label {
    color: #888;
    font-family: 'Kaiti', serif;
    margin-bottom: 15px;
}

.dynasty-taels-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px;
}

.dynasty-tael-item {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 10px 20px;
    background: #fff;
    border: 1px solid #e2d1b3;
    border-radius: 4px;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.03);
}

.dynasty-tael-item.modern {
    border-color: #9b2226;
    background: #fdf2f2;
}

.dynasty-name {
    font-size: 15px;
    color: #666;
    font-family: 'Kaiti', serif;
}

.dynasty-value {
    font-size: 28px;
    font-weight: bold;
    color: #1a1a1a;
    font-family: 'Ma Shan Zheng', serif;
}

.dynasty-unit {
    font-size: 16px;
    color: #888;
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
    display: flex;
    flex-direction: column; /* 改为垂直排列，避免文字拥挤 */
    gap: 15px;
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

.info-item.full-width {
    grid-column: span 2;
    border-top: 1px dashed #eee;
    padding-top: 10px;
    margin-top: 5px;
}

.price-text {
    font-size: 15px !important;
    color: #666;
    font-style: italic;
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

