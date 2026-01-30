// 统一通过 Cloudflare Workers 代理，前端不再持有 API_KEY
const WORKER_URL = `https://silverera-api.lz-t.top` // 部署后请替换为真实的 Worker URL

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string | any[]
}

export const aiService = {
    // 文本生成 (通过 Worker 转发)
    async chat(messages: ChatMessage[]) {
        const response = await fetch(WORKER_URL + '/api/ai-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages })
        })
        const data = await response.json()
        if (data.error) throw new Error(data.error)
        return data.choices[0].message.content
    },
    // 图片生成 (通过 Worker 转发)
    async generateImage(params: {
        prompt: string,
        n?: number,
        size?: string,
        quality?: string,
        style?: string,
        response_format?: string,
        seed?: number,
        user?: string
    }) {
        const response = await fetch(WORKER_URL + '/api/ai-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        })
        const data = await response.json()
        if (data.error) throw new Error(data.error)
        let url = data.data[0].url
        if (typeof url === 'string') {
            // 清理可能存在的反引号和空格
            url = url.replace(/[`\s]/g, '')
        }
        return url
    }
}

