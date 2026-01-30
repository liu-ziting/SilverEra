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
    }
}

