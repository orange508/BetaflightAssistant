// AI Assistant configuration management - stored in localStorage
const STORAGE_KEY = "bf_ai_assistant_config";

const defaultConfig = {
    provider: "", // "openai" | "deepseek" | "volcano" | "ollama"
    apiKey: "",
    baseUrl: "",
    model: "",
};

// Provider presets
export const AI_PROVIDERS = {
    openai: {
        name: "OpenAI",
        defaultBaseUrl: "https://api.openai.com/v1",
        defaultModel: "gpt-4o",
        models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
    },
    deepseek: {
        name: "DeepSeek",
        defaultBaseUrl: "https://api.deepseek.com/v1",
        defaultModel: "deepseek-chat",
        models: ["deepseek-chat", "deepseek-reasoner"],
    },
    volcano: {
        name: "火山引擎",
        defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
        defaultModel: "deepseek-r1-250120",
        models: ["deepseek-r1-250120", "deepseek-v3-241226", "doubao-pro-32k", "doubao-lite-32k"],
    },
    ollama: {
        name: "Ollama (本地)",
        defaultBaseUrl: "http://localhost:11434/v1",
        defaultModel: "qwen2.5:7b",
        models: [], // user fills in manually
    },
};

export function loadConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...defaultConfig, ...parsed };
        }
    } catch (e) {
        console.warn("[AI Assistant] Failed to load config:", e);
    }
    return { ...defaultConfig };
}

export function saveConfig(config) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.warn("[AI Assistant] Failed to save config:", e);
    }
}

// Conversation history stored per session
const CHAT_STORAGE_KEY = "bf_ai_assistant_chat";

export function loadChatHistory() {
    try {
        const raw = localStorage.getItem(CHAT_STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn("[AI Assistant] Failed to load chat history:", e);
    }
    return [];
}

export function saveChatHistory(messages) {
    try {
        // Only persist last 100 messages to keep size reasonable
        const toSave = messages.slice(-100);
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
        console.warn("[AI Assistant] Failed to save chat history:", e);
    }
}