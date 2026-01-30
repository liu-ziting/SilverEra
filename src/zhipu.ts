import axios from 'axios'

const API_KEY = 'a835b9f6866d48ec956d341418df8a50.NuhlKYn58EkCb5iP' // 从 api.md 获取的 Key

const client = axios.create({
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    }
})

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string | any[]
}

export const zhipuApi = {
    // 文本生成 (GLM-4-flash)
    async chat(messages: ChatMessage[]) {
        const response = await client.post('/chat/completions', {
            model: 'glm-4-flash',
            messages
        })
        return response.data.choices[0].message.content
    },

    // 识图 (GLM-4.1V-Thinking-Flash)
    async vision(base64Data: string, prompt: string, systemPrompt: string = '你是一个图像分析专家') {
        const response = await client.post('/chat/completions', {
            model: 'glm-4.1V-Thinking-Flash',
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: base64Data } }
                    ]
                }
            ]
        })
        return response.data.choices[0].message.content
    },

    // 生图 (cogview-3-flash)
    async generateImage(prompt: string, size: string = '1024x1024') {
        const response = await client.post('/images/generations', {
            model: 'cogview-3-flash',
            prompt,
            size
        })
        return response.data.data[0].url
    }
}
