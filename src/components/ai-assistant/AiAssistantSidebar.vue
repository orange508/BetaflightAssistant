<template>
    <div class="ai-sidebar" :class="{ 'ai-sidebar--configured': isConfigured }">
        <!-- Header -->
        <div class="ai-sidebar__header">
            <span class="ai-sidebar__title">🤖 AI 调参助手</span>
            <div class="ai-sidebar__header-actions">
                <UTooltip text="配置 AI 服务" :delay-duration="300">
                    <UButton
                        icon="i-lucide-settings"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        square
                        @click="showSettings = !showSettings"
                    />
                </UTooltip>
                <UTooltip text="清空对话" :delay-duration="300">
                    <UButton
                        icon="i-lucide-trash-2"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        square
                        @click="clearChat"
                    />
                </UTooltip>
            </div>
        </div>

        <!-- Settings Panel -->
        <div v-if="showSettings" class="ai-sidebar__settings">
            <div class="ai-sidebar__settings-content">
                <UFormGroup label="AI 服务商" class="mb-3">
                    <USelect
                        v-model="configForm.provider"
                        :items="providerOptions"
                        placeholder="选择服务商..."
                        size="sm"
                    />
                </UFormGroup>

                <UFormGroup label="API Key" class="mb-3">
                    <UInput
                        v-model="configForm.apiKey"
                        type="password"
                        placeholder="输入 API Key..."
                        size="sm"
                    />
                </UFormGroup>

                <UFormGroup label="API 地址" class="mb-3">
                    <UInput
                        v-model="configForm.baseUrl"
                        placeholder="自定义 API 地址..."
                        size="sm"
                    />
                </UFormGroup>

                <UFormGroup label="模型" class="mb-3">
                    <UInput
                        v-model="configForm.model"
                        placeholder="模型名称..."
                        size="sm"
                    />
                </UFormGroup>

                <div class="ai-sidebar__settings-actions">
                    <UButton
                        label="保存"
                        color="primary"
                        size="sm"
                        @click="saveSettings"
                    />
                    <UButton
                        label="取消"
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        @click="showSettings = false"
                    />
                </div>
            </div>
        </div>

        <!-- Data source selector -->
        <div v-if="isConfigured" class="ai-sidebar__datasource">
            <span class="text-xs text-muted">数据来源：</span>
            <div class="ai-sidebar__datasource-tabs">
                <button
                    :class="{ active: dataSource === 'fc' }"
                    @click="setDataSource('fc')"
                    :title="connectionValid ? '读取飞控实时数据' : '请先连接飞控'"
                    :disabled="!connectionValid"
                >
                    📡 飞控
                </button>
                <button
                    :class="{ active: dataSource === 'manual' }"
                    @click="setDataSource('manual')"
                >
                    📋 CLI Dump
                </button>
                <button
                    :class="{ active: dataSource === 'blackbox' }"
                    @click="setDataSource('blackbox')"
                >
                    📁 日志
                </button>
            </div>
        </div>

        <!-- Manual CLI dump input -->
        <div v-if="isConfigured && dataSource === 'manual'" class="ai-sidebar__manual-input">
            <UTextarea
                v-model="cliDumpText"
                placeholder="粘贴 CLI dump 输出..."
                size="sm"
                :rows="6"
                class="mb-2"
            />
            <div class="flex justify-end gap-2">
                <UButton
                    label="清空"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="cliDumpText = ''"
                />
                <UButton
                    label="发送到 AI"
                    size="xs"
                    color="primary"
                    :disabled="!cliDumpText.trim()"
                    @click="sendCliDump"
                />
            </div>
        </div>

        <!-- Blackbox file upload -->
        <div v-if="isConfigured && dataSource === 'blackbox'" class="ai-sidebar__manual-input">
            <p class="text-xs text-muted mb-2">
                上传黑匣子日志文件（.BFL 或 .BBL）进行诊断分析。
            </p>
            <UInput
                type="file"
                accept=".bfl,.bbl,.csv,.txt,.log"
                size="sm"
                @change="handleFileUpload"
            />
        </div>

        <!-- Chat Messages -->
        <div class="ai-sidebar__messages" ref="messagesContainer">
            <!-- Welcome / config prompt -->
            <div v-if="!isConfigured" class="ai-sidebar__welcome">
                <div class="ai-sidebar__welcome-icon">🤖</div>
                <h3>AI 调参助手</h3>
                <p>
                    连接 AI 服务获取智能调参建议。支持 OpenAI、DeepSeek、火山引擎和本地 Ollama。
                </p>
                <UButton
                    label="⚙️ 配置 AI 服务"
                    color="primary"
                    size="sm"
                    block
                    @click="showSettings = true"
                />
                <p class="text-xs text-muted mt-3">
                    暂无 API Key？点击下方直接开始，使用<span class="text-primary">离线模拟模式</span>体验全部功能。
                </p>
                <UButton
                    label="🚀 直接开始（离线模式）"
                    variant="soft"
                    color="neutral"
                    size="sm"
                    block
                    @click="useOfflineMode"
                />
            </div>

            <!-- Configured but no messages yet -->
            <div v-else-if="messages.length === 0" class="ai-sidebar__welcome">
                <div class="ai-sidebar__welcome-icon">{{ isMockMode ? '🔄' : '✅' }}</div>
                <h3>{{ isMockMode ? '离线模拟模式' : 'AI 助手已就绪' }}</h3>
                <p v-if="isMockMode">
                    当前处于离线模拟模式，所有回复均为本地生成。
                    <a href="#" @click.prevent="showSettings = true">配置 AI 服务</a>获取智能回复。
                </p>
                <p v-else>
                    {{ configForm.provider ? providerLabel : '' }} 已连接。
                    请描述你的问题，AI 将分析飞控数据并给出建议。
                </p>
                <div class="ai-sidebar__quick-actions">
                    <span class="text-xs text-muted mb-1">快速操作：</span>
                    <div class="flex flex-wrap gap-1">
                        <UBadge
                            v-for="qa in quickActions"
                            :key="qa"
                            color="neutral"
                            variant="soft"
                            class="cursor-pointer"
                            @click="sendQuickAction(qa)"
                        >
                            {{ qa }}
                        </UBadge>
                    </div>
                </div>
            </div>

            <!-- Chat messages -->
            <div
                v-for="(msg, idx) in messages"
                :key="idx"
                class="ai-sidebar__message"
                :class="{ 'ai-sidebar__message--user': msg.role === 'user', 'ai-sidebar__message--assistant': msg.role === 'assistant' }"
            >
                <div class="ai-sidebar__message-avatar">
                    {{ msg.role === 'user' ? '👤' : '🤖' }}
                </div>
                <div class="ai-sidebar__message-content" v-html="renderMarkdown(msg.content)"></div>
            </div>

            <!-- Loading indicator -->
            <div v-if="isLoading" class="ai-sidebar__message ai-sidebar__message--assistant">
                <div class="ai-sidebar__message-avatar">🤖</div>
                <div class="ai-sidebar__message-content">
                    <div class="ai-sidebar__typing">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Input area -->
        <div class="ai-sidebar__input" v-if="isConfigured">
            <div class="ai-sidebar__input-row">
                <textarea
                    v-model="inputText"
                    class="ai-sidebar__input-field"
                    placeholder="描述你的问题..."
                    rows="2"
                    @keydown.enter.exact.prevent="sendMessage"
                    :disabled="isLoading"
                ></textarea>
                <UButton
                    icon="i-lucide-send"
                    color="primary"
                    size="sm"
                    square
                    :disabled="isLoading || !inputText.trim()"
                    @click="sendMessage"
                    title="发送"
                />
            </div>
            <div class="ai-sidebar__input-hint">
                <span v-if="isMockMode" class="text-warning">🔶 离线模拟模式</span>
                <span v-else-if="connectionValid" class="text-primary">📡 飞控已连接 - 将读取实时数据</span>
                <span v-else-if="dataSource === 'manual'">📋 CLI Dump 模式</span>
                <span v-else>🔌 飞控未连接</span>
            </div>
        </div>
    </div>
</template>

<script>
import { loadConfig, saveConfig, AI_PROVIDERS, loadChatHistory, saveChatHistory } from "../../js/ai_assistant_config";
import { sendMessage } from "../../js/ai_assistant_service";
import { useConnectionStore } from "../../stores/connection";
import FC from "../../js/fc";
import MSP from "../../js/msp";
import MSPCodes from "../../js/msp/MSPCodes";

let _applyCounter = 0;

/**
 * Simple markdown-like renderer with CLI Apply button injection.
 * CLI blocks (```cli) get an "▶ 执行" button attached.
 */
function renderMarkdown(text) {
    if (!text) return "";

    let html = text
        // Escape HTML
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">");

    // Code blocks — special handling for ```cli blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const trimmed = code.trim();
        if (lang === "cli") {
            const id = `ai-cli-${++_applyCounter}`;
            // Extract only set/save/feature commands, skip comments
            const commands = trimmed
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l && !l.startsWith("#"))
                .join("\n");
            return (
                `<div class="ai-cli-block" data-cli-id="${id}">` +
                `<pre class="ai-code-block ai-code-block--cli"><code>${trimmed}</code></pre>` +
                `<textarea class="ai-cli-cmds" data-cli-id="${id}" style="display:none;">${commands.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">")}</textarea>` +
                `<button class="ai-apply-btn" data-cli-id="${id}" onclick="window.__aiApplyCli('${id}')">▶ 执行</button>` +
                `</div>`
            );
        }
        return `<pre class="ai-code-block"><code>${trimmed}</code></pre>`;
    });

    // Inline code ``
    html = html.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

    // Bold **
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2 class="ai-h2">$1</h2>');

    // Tables (simple: pipe-separated)
    html = html.replace(/\|(.+)\|/g, (match) => {
        const cells = match.split("|").filter((c) => c.trim());
        if (cells.length >= 2) {
            const tag = match.includes("---") ? "th" : "td";
            return `<div class="ai-table-row">${cells.map((c) => `<${tag} class="ai-table-cell">${c.trim()}</${tag}>`).join("")}</div>`;
        }
        return match;
    });

    // Protect textarea content from \n→<br> replacement
    const NL_PLACEHOLDER = '\x00CLINL\x00';
    html = html.replace(/<textarea\b[^>]*>([\s\S]*?)<\/textarea>/g, (m) => m.replace(/\n/g, NL_PLACEHOLDER));

    // Line breaks
    html = html.replace(/\n\n/g, "</p><p>");
    html = html.replace(/\n/g, "<br>");

    // Restore textarea newlines
    html = html.replace(new RegExp(NL_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '\n');

    // Wrap in paragraph if not already
    if (!html.startsWith("<")) {
        html = `<p>${html}</p>`;
    }

    return html;
}

// Map obsolete Betaflight 4.5+ parameter names to current names.
// This acts as a last-line defense to correct CLI commands before they reach the FC.
const PARAM_NAME_MAP = {
    "dyn_lpf_gyro_min_hz": "gyro_lpf1_dyn_min_hz",
    "dyn_lpf_gyro_max_hz": "gyro_lpf1_dyn_max_hz",
    "gyro_lowpass_dyn_min_hz": "gyro_lpf1_dyn_min_hz",
    "gyro_lowpass_dyn_max_hz": "gyro_lpf1_dyn_max_hz",
    "gyro_lowpass_hz": "gyro_lpf1_static_hz",
    "gyro_lowpass2_hz": "gyro_lpf2_static_hz",
    "gyro_lowpass2_type": "gyro_lpf2_type",
    "dterm_lowpass_dyn_min_hz": "dterm_lpf1_dyn_min_hz",
    "dterm_lowpass_dyn_max_hz": "dterm_lpf1_dyn_max_hz",
    "dterm_lowpass_hz": "dterm_lpf1_static_hz",
    "dterm_lowpass2_hz": "dterm_lpf2_static_hz",
    "dterm_lowpass2_type": "dterm_lpf2_type",
    "gyro_notch_hz": "gyro_notch1_frequency",
    "gyro_notch_cutoff": "gyro_notch1_cutoff",
    "dterm_notch_hz": "dterm_notch1_frequency",
    "dterm_notch_cutoff": "dterm_notch1_cutoff",
};

/**
 * Auto-correct obsolete Betaflight CLI parameter names using PARAM_NAME_MAP.
 * Returns the corrected command string.
 */
function correctCommand(cmd) {
    let corrected = cmd;
    for (const [oldName, newName] of Object.entries(PARAM_NAME_MAP)) {
        // Use word-boundary regexp to avoid partial matches
        const regex = new RegExp("\\b" + oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
        if (regex.test(corrected)) {
            corrected = corrected.replace(regex, newName);
        }
    }
    return corrected;
}

export default {
    name: "AiAssistantSidebar",
    components: {},
    data() {
        const config = loadConfig();
        const history = loadChatHistory();
        return {
            showSettings: !config.provider && !config.apiKey, // Show settings if not configured
            configForm: { ...config },
            messages: history || [],
            inputText: "",
            isLoading: false,
            dataSource: "fc", // "fc" | "manual" | "blackbox"
            cliDumpText: "",
            isConfigured: config.provider !== "" && config.apiKey !== "",
            isMockMode: false,
            connectionStore: useConnectionStore(),
            quickActions: [
                "分析当前 PID 设置",
                "我的飞机有洗桨问题",
                "分析当前滤波器设置",
                "降低 Roll P 值",
                "生成默认滤波设置",
                "解释 D_Min 参数",
            ],
        };
    },
    computed: {
        connectionValid() {
            return this.connectionStore.connectionValid;
        },
        providerOptions() {
            return Object.entries(AI_PROVIDERS).map(([key, val]) => ({
                value: key,
                label: val.name,
            }));
        },
        providerLabel() {
            return AI_PROVIDERS[this.configForm.provider]?.name ?? this.configForm.provider;
        },
    },
    watch: {
        configForm: {
            deep: true,
            handler() {
                this.updateConfiguredState();
            },
        },
    },
    methods: {
        updateConfiguredState() {
            this.isConfigured =
                (this.configForm.provider !== "" && this.configForm.apiKey !== "") || this.isMockMode;
        },
        saveSettings() {
            const config = { ...this.configForm };
            // Fill defaults from provider preset
            if (config.provider) {
                const preset = AI_PROVIDERS[config.provider];
                if (preset) {
                    if (!config.baseUrl) config.baseUrl = preset.defaultBaseUrl;
                    if (!config.model) config.model = preset.defaultModel;
                }
            }
            saveConfig(config);
            this.configForm = { ...config };
            this.showSettings = false;
            this.isMockMode = false;
            this.updateConfiguredState();
        },
        useOfflineMode() {
            this.isMockMode = true;
            this.isConfigured = true;
            this.showSettings = false;
        },
        setDataSource(source) {
            this.dataSource = source;
        },
        sendQuickAction(text) {
            this.inputText = text;
            this.sendMessage();
        },
        sendCliDump() {
            if (!this.cliDumpText.trim()) return;
            this.messages.push({ role: "user", content: "这是一个 CLI dump 数据，请帮我分析配置并提供优化建议：\n\n```\n" + this.cliDumpText.trim() + "\n```" });
            this.cliDumpText = "";
            this.callAI(this.messages[this.messages.length - 1].content);
        },
        handleFileUpload(event) {
            const file = event.target?.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                this.messages.push({
                    role: "user",
                    content: `上传了黑匣子/日志文件 "${file.name}" (${(file.size / 1024).toFixed(1)} KB)，请帮我分析：\n\n\`\`\`\n${content.slice(0, 5000)}\n\`\`\``,
                });
                this.callAI(this.messages[this.messages.length - 1].content);
            };
            reader.readAsText(file);
        },
        async sendMessage() {
            const text = this.inputText.trim();
            if (!text || this.isLoading) return;

            this.messages.push({ role: "user", content: text });
            this.inputText = "";
            await this.callAI(text);
        },
        async callAI(userMessage) {
            this.isLoading = true;
            saveChatHistory(this.messages);
            this.$nextTick(() => this.scrollToBottom());

            try {
                // Actively fetch FC data for context (if connected and fc mode)
                let fcDataContext = "";
                if (this.connectionValid && this.dataSource === "fc") {
                    try {
                        const fcData = await this.fetchFlightControllerData();
                        fcDataContext = this.formatFCDataForAI(fcData);
                        console.log("[AI Sidebar] 已获取飞控数据:", fcData);
                    } catch (err) {
                        console.warn("[AI Sidebar] 读取飞控数据失败:", err);
                    }
                }

                // Build full message with FC data context
                let messageToSend = userMessage;
                if (fcDataContext) {
                    messageToSend = `当前飞控配置如下，请基于这些数据回答用户问题：\n\n${fcDataContext}\n\n用户问题：${userMessage}`;
                } else if (this.dataSource === "manual" && this.cliDumpText.trim()) {
                    messageToSend = "参考以下 CLI dump 数据回答用户问题：\n\n```\n" + this.cliDumpText.trim() + "\n```\n\n用户问题：" + userMessage;
                }

                // Build history excluding the last user message (already in call)
                const historyForApi = this.messages
                    .slice(0, -1)
                    .map((m) => ({ role: m.role, content: m.content }));

                // Legacy fcData object for backward compatibility with ai_assistant_service
                let fcData = null;
                if (this.connectionValid && this.dataSource === "fc") {
                    fcData = this.collectFcData();
                }

                const response = await sendMessage(messageToSend, historyForApi, fcData);

                this.messages.push({ role: "assistant", content: response });
                saveChatHistory(this.messages);
            } catch (error) {
                console.error("[AI Sidebar] Error:", error);
                this.messages.push({
                    role: "assistant",
                    content: "❌ 发生错误：" + (error.message || "未知错误"),
                });
            } finally {
                this.isLoading = false;
                this.$nextTick(() => this.scrollToBottom());
            }
        },
        /**
         * Fetch flight controller data via MSP commands.
         * Actively reads PID, filter, motor, and rate config from the FC.
         */
        async fetchFlightControllerData() {
            const msp = window.MSP || MSP;
            if (!msp) {
                throw new Error("MSP 模块不可用");
            }

            const data = {};

            // --- 基础信息（并行读取，不阻塞） ---
            try {
                await msp.promise(MSPCodes.MSP_FC_VARIANT);
                data.fcVariant = FC.FC_VARIANT;
            } catch (e) { console.warn("[AI Sidebar] MSP_FC_VARIANT:", e); }

            try {
                await msp.promise(MSPCodes.MSP_FC_VERSION);
                data.fcVersion = FC.FC_VERSION;
            } catch (e) { console.warn("[AI Sidebar] MSP_FC_VERSION:", e); }

            try {
                await msp.promise(MSPCodes.MSP_BUILD_INFO);
                data.buildInfo = FC.BUILD_INFO;
            } catch (e) { console.warn("[AI Sidebar] MSP_BUILD_INFO:", e); }

            try {
                await msp.promise(MSPCodes.MSP_BOARD_INFO);
                data.boardInfo = FC.BOARD_INFO;
            } catch (e) { console.warn("[AI Sidebar] MSP_BOARD_INFO:", e); }

            // --- 核心调参数据 ---
            try {
                await msp.promise(MSPCodes.MSP_PID);
                // PID data is stored in FC.PIDS (10 groups × 3 uint8 values P/I/D)
                // and FC.PID_NAMES (array of profile names)
                const pidNames = FC.PID_NAMES || [];
                const pidValues = FC.PIDS || [];
                console.log("[AI Sidebar] MSP_PID raw PIDS:", JSON.stringify(pidValues));
                console.log("[AI Sidebar] MSP_PID names:", JSON.stringify(pidNames));

                data.pidProfile = {
                    pid: pidValues,
                    pidNames: pidNames,
                };
            } catch (e) { console.warn("[AI Sidebar] MSP_PID:", e); }

            try {
                await msp.promise(MSPCodes.MSP_PID_ADVANCED);
                data.pidAdvanced = FC.PID_ADVANCED;
            } catch (e) { console.warn("[AI Sidebar] MSP_PID_ADVANCED:", e); }

            try {
                await msp.promise(MSPCodes.MSP_FILTER_CONFIG);
                if (FC.FILTER_CONFIG) {
                    const f = FC.FILTER_CONFIG;
                    data.filterConfig = {
                        gyroLowpass1DynamicMinCutoff: f.gyroLowpass1DynamicMinCutoff ?? f.gyro_lowpass_dyn_min_hz,
                        gyroLowpass1DynamicMaxCutoff: f.gyroLowpass1DynamicMaxCutoff ?? f.gyro_lowpass_dyn_max_hz,
                        gyroLowpass2StaticCutoff: f.gyroLowpass2StaticCutoff ?? f.gyro_lowpass2_static_hz,
                        dtermLowpass1DynamicMinCutoff: f.dtermLowpass1DynamicMinCutoff ?? f.dterm_lowpass_dyn_min_hz,
                        dtermLowpass1DynamicMaxCutoff: f.dtermLowpass1DynamicMaxCutoff ?? f.dterm_lowpass_dyn_max_hz,
                        dtermLowpass2StaticCutoff: f.dtermLowpass2StaticCutoff ?? f.dterm_lowpass2_static_hz,
                        gyroNotch1Frequency: f.gyroNotch1Frequency ?? f.gyro_notch1_hz,
                        gyroNotch1Cutoff: f.gyroNotch1Cutoff ?? f.gyro_notch1_cutoff,
                        gyroNotch2Frequency: f.gyroNotch2Frequency ?? f.gyro_notch2_hz,
                        gyroNotch2Cutoff: f.gyroNotch2Cutoff ?? f.gyro_notch2_cutoff,
                    };
                }
            } catch (e) { console.warn("[AI Sidebar] MSP_FILTER_CONFIG:", e); }

            try {
                await msp.promise(MSPCodes.MSP_MOTOR_CONFIG);
                data.motorConfig = {
                    idlePercent: FC.MOTOR_CONFIG?.idlePercent ?? FC.MOTOR_CONFIG?.motorIdle,
                };
                data.motorConfigFull = FC.MOTOR_CONFIG;
            } catch (e) { console.warn("[AI Sidebar] MSP_MOTOR_CONFIG:", e); }

            try {
                await msp.promise(MSPCodes.MSP_RC_TUNING);
                if (FC.RC_TUNING) {
                    data.rateProfile = {
                        rcRate: FC.RC_TUNING.rcRate ?? FC.RC_TUNING.rc_rate,
                        superRate: FC.RC_TUNING.superRate ?? FC.RC_TUNING.super_rate,
                        expo: FC.RC_TUNING.expo,
                    };
                }
            } catch (e) { console.warn("[AI Sidebar] MSP_RC_TUNING:", e); }

            // --- 功能/配置信息 ---
            try {
                await msp.promise(MSPCodes.MSP_FEATURE_CONFIG);
                data.featureConfig = FC.FEATURE_CONFIG;
            } catch (e) { console.warn("[AI Sidebar] MSP_FEATURE_CONFIG:", e); }

            try {
                await msp.promise(MSPCodes.MSP_MIXER_CONFIG);
                data.mixerConfig = FC.MIXER_CONFIG;
            } catch (e) { console.warn("[AI Sidebar] MSP_MIXER_CONFIG:", e); }

            try {
                await msp.promise(MSPCodes.MSP_STATUS);
                data.status = FC.STATUS;
            } catch (e) { console.warn("[AI Sidebar] MSP_STATUS:", e); }

            try {
                await msp.promise(MSPCodes.MSP_STATUS_EX);
                data.statusEx = FC.STATUS_EX;
            } catch (e) { console.warn("[AI Sidebar] MSP_STATUS_EX:", e); }

            try {
                await msp.promise(MSPCodes.MSP_BATTERY_CONFIG);
                data.batteryConfig = FC.BATTERY_CONFIG;
            } catch (e) { console.warn("[AI Sidebar] MSP_BATTERY_CONFIG:", e); }

            try {
                await msp.promise(MSPCodes.MSP_ARMING_CONFIG);
                data.armingConfig = FC.ARMING_CONFIG;
            } catch (e) { console.warn("[AI Sidebar] MSP_ARMING_CONFIG:", e); }

            try {
                await msp.promise(MSPCodes.MSP_ADVANCED_CONFIG);
                data.advancedConfig = FC.ADVANCED_CONFIG;
            } catch (e) { console.warn("[AI Sidebar] MSP_ADVANCED_CONFIG:", e); }

            console.log("[AI Sidebar] 飞控数据读取完成:", Object.keys(data));
            return data;
        },
        /**
         * Format FC data into AI-readable text context.
         */
        formatFCDataForAI(data) {
            if (!data) return "";

            let text = "";

            // --- 飞控基本信息 ---
            text += "## 飞控基本信息\n";
            if (data.fcVariant) text += `- 飞控型号: ${data.fcVariant}\n`;
            if (data.fcVersion) text += `- 固件版本: ${data.fcVersion}\n`;
            if (data.buildInfo) {
                const b = data.buildInfo;
                if (b.targetName || b.boardName) text += `- 目标板: ${b.targetName || b.boardName}\n`;
                if (b.boardRevision !== undefined) text += `- 板卡版本: ${b.boardRevision}\n`;
                if (b.buildDate) text += `- 构建日期: ${b.buildDate}\n`;
                if (b.commitHash) text += `- Git Commit: ${b.commitHash}\n`;
                // Features
                if (b.features) {
                    const enabled = [];
                    for (const [key, val] of Object.entries(b.features)) {
                        if (val) enabled.push(key);
                    }
                    if (enabled.length > 0) text += `- 已启用功能: ${enabled.join(", ")}\n`;
                }
            }
            if (data.boardInfo) {
                const b = data.boardInfo;
                if (b.manufacturerId || b.boardIdentifier) text += `- 板卡ID: ${b.manufacturerId || ""} ${b.boardIdentifier || ""}\n`;
                if (b.boardType !== undefined) text += `- 板卡类型: ${b.boardType}\n`;
                if (b.mcuTypeId !== undefined) text += `- MCU 类型: ${b.mcuTypeId}\n`;
                if (b.imuType) text += `- IMU: ${b.imuType}\n`;
                if (b.barometerType) text += `- 气压计: ${b.barometerType}\n`;
            }
            text += "\n";

            // --- PID 配置 ---
            if (data.pidProfile) {
                const p = data.pidProfile;
                text += "## PID 配置\n";
                if (p.pid) {
                    const axisNames = ["Roll (横滚)", "Pitch (俯仰)", "Yaw (偏航)"];
                    for (let i = 0; i < Math.min(p.pid.length, 3); i++) {
                        const entry = p.pid[i];
                        if (entry) {
                            text += `- ${axisNames[i]}: P=${entry[0] ?? entry.P ?? "?"}, I=${entry[1] ?? entry.I ?? "?"}, D=${entry[2] ?? entry.D ?? "?"}, F=${entry[3] ?? entry.F ?? "?"}\n`;
                        }
                    }
                }
                if (p.dMinPercentage !== undefined) text += `- D Min: ${p.dMinPercentage}%\n`;
                if (p.dMinGain !== undefined) text += `- D Min Gain: ${p.dMinGain}\n`;
                if (p.dMinAdvance !== undefined) text += `- D Min Advance: ${p.dMinAdvance}\n`;
                if (p.tpaBreakpoint !== undefined) text += `- TPA 起始油门: ${p.tpaBreakpoint}\n`;
                if (p.tpaRate !== undefined) text += `- TPA 衰减率: ${p.tpaRate}\n`;
                text += "\n";
            }

            // --- PID Advanced ---
            if (data.pidAdvanced) {
                const a = data.pidAdvanced;
                text += "## PID 高级配置\n";
                const entries = [
                    ["gyroSyncDenom", "Gyro Sync Denom"],
                    ["pidProcessDenom", "PID Process Denom"],
                    ["useUnsyncedPwm", "Unsynced PWM"],
                    ["motorPwmProtocol", "PWM 协议"],
                    ["motorPwmRate", "PWM 频率"],
                    ["digitalIdlePercent", "数字怠速(%)"],
                    ["gyroUse32kHz", "32kHz Gyro"],
                    ["motorPwmInversion", "PWM 反转"],
                    ["gyroToUse", "Gyro 选择"],
                    ["gyroHighFsr", "Gyro High FSR"],
                    ["gyroMovementCalibThreshold", "Gyro 移动校准阈值"],
                    ["gyroCalibDuration", "Gyro 校准时长(1/10s)"],
                    ["gyroOffsetYaw", "Gyro Yaw 偏移"],
                    ["gyroCheckOverflow", "Gyro 溢出检查"],
                    ["gyroFilterYaw", "Yaw 滤波"],
                    ["debugMode", "Debug 模式"],
                    ["levelRaceMode", "Level Race 模式"],
                ];
                for (const [key, label] of entries) {
                    if (a[key] !== undefined) text += `- ${label}: ${a[key]}\n`;
                }
                text += "\n";
            }

            // --- 滤波器 ---
            if (data.filterConfig) {
                const f = data.filterConfig;
                text += "## 滤波器配置\n";
                if (f.gyroLowpass1DynamicMinCutoff !== undefined) text += `- Gyro 动态 LPF 最小: ${f.gyroLowpass1DynamicMinCutoff} Hz\n`;
                if (f.gyroLowpass1DynamicMaxCutoff !== undefined) text += `- Gyro 动态 LPF 最大: ${f.gyroLowpass1DynamicMaxCutoff} Hz\n`;
                if (f.gyroLowpass2StaticCutoff !== undefined) text += `- Gyro LPF2: ${f.gyroLowpass2StaticCutoff} Hz\n`;
                if (f.dtermLowpass1DynamicMinCutoff !== undefined) text += `- D Term 动态 LPF 最小: ${f.dtermLowpass1DynamicMinCutoff} Hz\n`;
                if (f.dtermLowpass1DynamicMaxCutoff !== undefined) text += `- D Term 动态 LPF 最大: ${f.dtermLowpass1DynamicMaxCutoff} Hz\n`;
                if (f.dtermLowpass2StaticCutoff !== undefined) text += `- D Term LPF2: ${f.dtermLowpass2StaticCutoff} Hz\n`;
                if (f.gyroNotch1Frequency !== undefined) text += `- Gyro Notch 1: ${f.gyroNotch1Frequency} Hz (截止: ${f.gyroNotch1Cutoff ?? "?"})\n`;
                if (f.gyroNotch2Frequency !== undefined) text += `- Gyro Notch 2: ${f.gyroNotch2Frequency} Hz (截止: ${f.gyroNotch2Cutoff ?? "?"})\n`;
                text += "\n";
            }

            // --- 电机 ---
            if (data.motorConfig) {
                text += "## 电机配置\n";
                if (data.motorConfig.idlePercent !== undefined) text += `- 怠速: ${data.motorConfig.idlePercent}%\n`;
                if (data.motorConfigFull) {
                    const m = data.motorConfigFull;
                    if (m.minthrottle !== undefined) text += `- 最小油门: ${m.minthrottle}\n`;
                    if (m.maxthrottle !== undefined) text += `- 最大油门: ${m.maxthrottle}\n`;
                    if (m.mincommand !== undefined) text += `- 最小指令: ${m.mincommand}\n`;
                }
                text += "\n";
            }

            // --- Rate ---
            if (data.rateProfile) {
                const r = data.rateProfile;
                text += "## 速率配置\n";
                if (r.rcRate !== undefined) text += `- RC Rate: ${r.rcRate}\n`;
                if (r.superRate !== undefined) text += `- Super Rate: ${r.superRate}\n`;
                if (r.expo !== undefined) text += `- Expo: ${r.expo}\n`;
                text += "\n";
            }

            // --- 混控器 ---
            if (data.mixerConfig) {
                const m = data.mixerConfig;
                text += "## 混控器配置\n";
                if (m.mixer !== undefined) text += `- 混控器类型: ${m.mixer}\n`;
                if (m.reverseMotors !== undefined) text += `- 反向电机: ${m.reverseMotors ? "是" : "否"}\n`;
                if (m.yawMotorsReversed !== undefined) text += `- Yaw 反向: ${m.yawMotorsReversed ? "是" : "否"}\n`;
                text += "\n";
            }

            // --- 功能开关 ---
            if (data.featureConfig) {
                const f = data.featureConfig;
                text += "## 功能开关\n";
                const features = f.features || f;
                if (Array.isArray(features)) {
                    // features is an array of { name, enabled }
                    const enabled = features.filter((fe) => fe.enabled).map((fe) => fe.name);
                    if (enabled.length > 0) text += `- 已启用: ${enabled.join(", ")}\n`;
                } else if (typeof features === "object") {
                    const enabled = Object.entries(features)
                        .filter(([, v]) => v)
                        .map(([k]) => k);
                    if (enabled.length > 0) text += `- 已启用: ${enabled.join(", ")}\n`;
                }
                text += "\n";
            }

            // --- 状态 ---
            if (data.status) {
                const s = data.status;
                text += "## 飞控状态\n";
                if (s.cycleTime !== undefined) text += `- 循环时间: ${s.cycleTime} μs\n`;
                if (s.i2cError !== undefined) text += `- I2C 错误: ${s.i2cError}\n`;
                if (s.cpuLoad !== undefined) text += `- CPU 负载: ${s.cpuLoad}%\n`;
                if (s.voltage !== undefined) text += `- 电压: ${s.voltage}V\n`;
                if (s.rssi !== undefined) text += `- RSSI: ${s.rssi}\n`;
                if (s.numProfiles !== undefined) text += `- Profile 数量: ${s.numProfiles}\n`;
                if (s.rateProfile !== undefined) text += `- 当前 Rate Profile: ${s.rateProfile}\n`;
                text += "\n";
            }

            // --- 状态扩展 ---
            if (data.statusEx) {
                const s = data.statusEx;
                text += "## 扩展状态\n";
                if (s.coreTemp !== undefined) text += `- 核心温度: ${s.coreTemp}°C\n`;
                if (s.maxArmingDisabledFlags !== undefined) text += `- 解锁禁用标志数: ${s.maxArmingDisabledFlags}\n`;
                text += "\n";
            }

            // --- 电池 ---
            if (data.batteryConfig) {
                const b = data.batteryConfig;
                text += "## 电池配置\n";
                if (b.vbatmincellvoltage !== undefined) text += `- 最低单体电压: ${b.vbatmincellvoltage}V\n`;
                if (b.vbatmaxcellvoltage !== undefined) text += `- 最高单体电压: ${b.vbatmaxcellvoltage}V\n`;
                if (b.vbatwarningcellvoltage !== undefined) text += `- 警告单体电压: ${b.vbatwarningcellvoltage}V\n`;
                if (b.batterycapacity !== undefined) text += `- 电池容量: ${b.batterycapacity} mAh\n`;
                if (b.voltagemetersource !== undefined) text += `- 电压表源: ${b.voltagemetersource}\n`;
                if (b.currentmetersource !== undefined) text += `- 电流表源: ${b.currentmetersource}\n`;
                text += "\n";
            }

            // --- 解锁 ---
            if (data.armingConfig) {
                const a = data.armingConfig;
                text += "## 解锁配置\n";
                if (a.autoDisarmDelay !== undefined) text += `- 自动上锁延迟: ${a.autoDisarmDelay}s\n`;
                if (a.disarmKillSwitch !== undefined) text += `- 上锁切断开关: ${a.disarmKillSwitch ? "是" : "否"}\n`;
                if (a.smallAngle !== undefined) text += `- 小角度解锁: ${a.smallAngle}°\n`;
                if (a.maxArmAngle !== undefined) text += `- 最大解锁角度: ${a.maxArmAngle}°\n`;
                if (a.gyroCalOnFirstArm !== undefined) text += `- 首次解锁 Gyro 校准: ${a.gyroCalOnFirstArm ? "是" : "否"}\n`;
                text += "\n";
            }

            // --- 高级配置 ---
            if (data.advancedConfig) {
                const a = data.advancedConfig;
                text += "## 高级配置\n";
                if (a.gyroSyncDenom !== undefined) text += `- Gyro Sync Denom: ${a.gyroSyncDenom}\n`;
                if (a.pidProcessDenom !== undefined) text += `- PID Process Denom: ${a.pidProcessDenom}\n`;
                if (a.useUnsyncedPwm !== undefined) text += `- Unsynced PWM: ${a.useUnsyncedPwm ? "是" : "否"}\n`;
                if (a.motorPwmProtocol !== undefined) text += `- 电机 PWM 协议: ${a.motorPwmProtocol}\n`;
                if (a.digitalIdlePercent !== undefined) text += `- 数字怠速: ${a.digitalIdlePercent}%\n`;
                text += "\n";
            }

            return text;
        },
        /**
         * Legacy: collect FC data from in-memory FC object (for backward compatibility).
         */
        collectFcData() {
            const data = {};

            // PID Profile — read from FC.PIDS (10 groups × 3 uint8 values P/I/D)
            if (FC.PIDS) {
                data.pidProfile = {
                    pid: FC.PIDS,
                    pidNames: FC.PID_NAMES || [],
                };
            }

            // Filter config
            if (FC.FILTER_CONFIG) {
                const f = FC.FILTER_CONFIG;
                data.filterConfig = {
                    gyroLowpass1DynamicMinCutoff: f.gyroLowpass1DynamicMinCutoff ?? f.gyro_lowpass_dyn_min_hz,
                    gyroLowpass1DynamicMaxCutoff: f.gyroLowpass1DynamicMaxCutoff ?? f.gyro_lowpass_dyn_max_hz,
                    gyroLowpass2StaticCutoff: f.gyroLowpass2StaticCutoff ?? f.gyro_lowpass2_static_hz,
                    dtermLowpass1DynamicMinCutoff: f.dtermLowpass1DynamicMinCutoff ?? f.dterm_lowpass_dyn_min_hz,
                    dtermLowpass1DynamicMaxCutoff: f.dtermLowpass1DynamicMaxCutoff ?? f.dterm_lowpass_dyn_max_hz,
                    dtermLowpass2StaticCutoff: f.dtermLowpass2StaticCutoff ?? f.dterm_lowpass2_static_hz,
                    gyroNotch1Frequency: f.gyroNotch1Frequency ?? f.gyro_notch1_hz,
                    gyroNotch1Cutoff: f.gyroNotch1Cutoff ?? f.gyro_notch1_cutoff,
                    gyroNotch2Frequency: f.gyroNotch2Frequency ?? f.gyro_notch2_hz,
                    gyroNotch2Cutoff: f.gyroNotch2Cutoff ?? f.gyro_notch2_cutoff,
                };
            }

            // Motor config
            if (FC.MOTOR_CONFIG) {
                data.motorConfig = {
                    idlePercent: FC.MOTOR_CONFIG.idlePercent ?? FC.MOTOR_CONFIG.motorIdle,
                };
            }

            // Rates
            if (FC.RC_TUNING) {
                data.rateProfile = {
                    rcRate: FC.RC_TUNING.rcRate ?? FC.RC_TUNING.rc_rate,
                    superRate: FC.RC_TUNING.superRate ?? FC.RC_TUNING.super_rate,
                    expo: FC.RC_TUNING.expo,
                };
            }

            return data;
        },
        clearChat() {
            if (this.messages.length === 0) return;
            this.messages = [];
            saveChatHistory([]);
        },
        scrollToBottom() {
            const container = this.$refs.messagesContainer;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        },
        /**
         * Apply CLI commands to the flight controller.
         * Called when user clicks "▶ 执行" button on a CLI code block.
         * Sends each set command via MSP CLI, then calls "save".
         */
        async applyCliCommands(cliId) {
            if (!this.connectionValid) {
                this.messages.push({
                    role: "assistant",
                    content: "❌ **无法执行**：飞控未连接，请先连接飞控。",
                });
                this.$nextTick(() => this.scrollToBottom());
                return;
            }

            const textarea = this.$el.querySelector(`textarea.ai-cli-cmds[data-cli-id="${cliId}"]`);
            if (!textarea) {
                console.error("[AI Sidebar] Could not find CLI commands for id:", cliId);
                return;
            }

            const raw = textarea.value;
            if (!raw.trim()) return;

            // Parse commands (one per line, skip empty lines, filter <br> artifacts)
            let commands = raw
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter((l) => l && !l.startsWith("#"))
                .filter((l) => !l.includes("<br>"));

            // Auto-correct obsolete parameter names
            commands = commands.map((cmd) => {
                const corrected = correctCommand(cmd);
                if (corrected !== cmd) {
                    console.warn(`[AI Apply] Corrected: "${cmd}" → "${corrected}"`);
                }
                return corrected;
            });

            if (commands.length === 0) return;

            // Disable the button and show progress
            const btn = this.$el.querySelector(`button.ai-apply-btn[data-cli-id="${cliId}"]`);
            const originalText = btn ? btn.textContent : "▶ 执行";
            if (btn) {
                btn.disabled = true;
                btn.textContent = "⏳ 执行中...";
            }

            try {
                for (let i = 0; i < commands.length; i++) {
                    const cmd = commands[i];
                    if (btn) {
                        btn.textContent = `⏳ ${i + 1}/${commands.length}...`;
                    }

                    // Send each command via MSP CLI
                    await new Promise((resolve, reject) => {
                        MSP.send_cli_command(cmd, (response) => {
                            // Check if the command was acknowledged
                            const output = Array.isArray(response) ? response.join("\n") : String(response);
                            console.log(`[AI Apply] "${cmd}" →`, output.slice(0, 100));
                            resolve(output);
                        });
                    });
                }

                if (btn) {
                    btn.textContent = "✅ 完成";
                    btn.classList.add("ai-apply-btn--success");
                }

                // Add a confirmation message
                this.messages.push({
                    role: "assistant",
                    content: `✅ **已执行 ${commands.length} 条命令到飞控**\n\n\`\`\`\n${commands.join("\n")}\n\`\`\``,
                });
            } catch (error) {
                console.error("[AI Sidebar] CLI apply error:", error);
                if (btn) {
                    btn.textContent = "❌ 失败";
                    btn.classList.add("ai-apply-btn--error");
                }
                this.messages.push({
                    role: "assistant",
                    content: `❌ **执行失败**：${error.message || "未知错误"}\n\n请检查飞控连接状态。`,
                });
            } finally {
                // Restore button after 3 seconds
                if (btn) {
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.textContent = originalText;
                        btn.classList.remove("ai-apply-btn--success", "ai-apply-btn--error");
                    }, 3000);
                }
                saveChatHistory(this.messages);
                this.$nextTick(() => this.scrollToBottom());
            }
        },
        renderMarkdown,
    },
    mounted() {
        // Register global handler for Apply CLI buttons (since they use onclick in rendered HTML)
        window.__aiApplyCli = (cliId) => {
            this.applyCliCommands(cliId);
        };
    },
    beforeDestroy() {
        // Clean up global handler
        if (window.__aiApplyCli) {
            delete window.__aiApplyCli;
        }
    },
};
</script>

<style scoped>
/* === Sidebar Container === */
.ai-sidebar {
    display: flex;
    flex-direction: column;
    width: 360px;
    min-width: 360px;
    height: 100%;
    background: var(--surface-200);
    border-left: 1px solid var(--surface-300);
    font-size: 12px;
}

/* === Header === */
.ai-sidebar__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--surface-300);
    background: var(--surface-100);
    flex-shrink: 0;
}
.ai-sidebar__title {
    font-weight: 600;
    font-size: 13px;
    color: var(--text);
}
.ai-sidebar__header-actions {
    display: flex;
    gap: 0.25rem;
}

/* === Settings Panel === */
.ai-sidebar__settings {
    border-bottom: 1px solid var(--surface-300);
    background: var(--surface-100);
    flex-shrink: 0;
}
.ai-sidebar__settings-content {
    padding: 0.75rem;
}
.ai-sidebar__settings-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
}

/* === Data Source === */
.ai-sidebar__datasource {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--surface-300);
    background: var(--surface-100);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}
.ai-sidebar__datasource-tabs {
    display: flex;
    gap: 0.25rem;
}
.ai-sidebar__datasource-tabs button {
    padding: 0.15rem 0.5rem;
    border: 1px solid var(--surface-400);
    border-radius: 3px;
    background: transparent;
    color: var(--text);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
}
.ai-sidebar__datasource-tabs button:hover:not(:disabled) {
    background: var(--surface-300);
}
.ai-sidebar__datasource-tabs button.active {
    background: var(--primary-500);
    color: white;
    border-color: var(--primary-500);
}
.ai-sidebar__datasource-tabs button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* === Manual Input === */
.ai-sidebar__manual-input {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--surface-300);
    background: var(--surface-100);
    flex-shrink: 0;
}

/* === Messages === */
.ai-sidebar__messages {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* === Welcome === */
.ai-sidebar__welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 1.5rem 1rem;
    gap: 0.5rem;
}
.ai-sidebar__welcome-icon {
    font-size: 2.5rem;
    margin-bottom: 0.25rem;
}
.ai-sidebar__welcome h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin: 0;
}
.ai-sidebar__welcome p {
    color: var(--text-muted, var(--surface-600));
    margin: 0;
    line-height: 1.5;
    font-size: 11px;
}
.ai-sidebar__quick-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 0.5rem;
    gap: 0.25rem;
}

/* === Chat Messages === */
.ai-sidebar__message {
    display: flex;
    gap: 0.5rem;
}
.ai-sidebar__message--user {
    flex-direction: row-reverse;
}
.ai-sidebar__message-avatar {
    font-size: 1.2rem;
    flex-shrink: 0;
    width: 1.5rem;
    text-align: center;
}
.ai-sidebar__message-content {
    max-width: 85%;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    line-height: 1.5;
    word-break: break-word;
}
.ai-sidebar__message--user .ai-sidebar__message-content {
    background: var(--primary-500);
    color: white;
}
.ai-sidebar__message--assistant .ai-sidebar__message-content {
    background: var(--surface-300);
    color: var(--text);
}

/* Message content markdown styles */
.ai-sidebar__message-content :deep(p) {
    margin: 0 0 0.5rem 0;
}
.ai-sidebar__message-content :deep(p:last-child) {
    margin-bottom: 0;
}
.ai-sidebar__message-content :deep(strong) {
    font-weight: 600;
}
/* CLI Apply block */
.ai-sidebar__message-content :deep(.ai-cli-block) {
    margin: 0.25rem 0;
}
.ai-sidebar__message-content :deep(.ai-code-block--cli) {
    margin-bottom: 0;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
}
.ai-sidebar__message-content :deep(.ai-apply-btn) {
    display: block;
    width: 100%;
    padding: 0.35rem 0.5rem;
    border: none;
    border-radius: 0 0 4px 4px;
    background: var(--primary-500);
    color: white;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
}
.ai-sidebar__message-content :deep(.ai-apply-btn:hover:not(:disabled)) {
    background: var(--primary-600);
}
.ai-sidebar__message-content :deep(.ai-apply-btn:disabled) {
    opacity: 0.7;
    cursor: wait;
}
.ai-sidebar__message-content :deep(.ai-apply-btn--success) {
    background: var(--green-500, #22c55e);
}
.ai-sidebar__message-content :deep(.ai-apply-btn--error) {
    background: var(--red-500, #ef4444);
}
.ai-sidebar__message-content :deep(.ai-code-block) {
    background: var(--surface-400);
    color: var(--text);
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 11px;
    font-family: "Consolas", "Courier New", monospace;
    overflow-x: auto;
    margin: 0.25rem 0;
    white-space: pre-wrap;
}
.ai-sidebar__message-content :deep(.ai-inline-code) {
    background: var(--surface-400);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-family: "Consolas", "Courier New", monospace;
    font-size: 11px;
}
.ai-sidebar__message-content :deep(.ai-h2),
.ai-sidebar__message-content :deep(.ai-h3),
.ai-sidebar__message-content :deep(.ai-h4) {
    margin: 0.5rem 0 0.25rem 0;
    font-weight: 600;
}
.ai-sidebar__message-content :deep(.ai-h2) { font-size: 14px; }
.ai-sidebar__message-content :deep(.ai-h3) { font-size: 13px; }
.ai-sidebar__message-content :deep(.ai-h4) { font-size: 12px; }

.ai-sidebar__message-content :deep(.ai-table-row) {
    display: flex;
    gap: 0;
}
.ai-sidebar__message-content :deep(.ai-table-cell) {
    flex: 1;
    padding: 0.15rem 0.5rem;
    font-size: 11px;
    border-bottom: 1px solid var(--surface-400);
}

/* Typing indicator */
.ai-sidebar__typing {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem 0;
}
.ai-sidebar__typing span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--surface-500);
    animation: ai-typing 1.4s infinite ease-in-out;
}
.ai-sidebar__typing span:nth-child(2) { animation-delay: 0.2s; }
.ai-sidebar__typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes ai-typing {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-6px); opacity: 1; }
}

/* === Input === */
.ai-sidebar__input {
    border-top: 1px solid var(--surface-300);
    background: var(--surface-100);
    padding: 0.5rem 0.75rem;
    flex-shrink: 0;
}
.ai-sidebar__input-row {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
}
.ai-sidebar__input-field {
    flex: 1;
    resize: none;
    border: 1px solid var(--surface-400);
    border-radius: 4px;
    padding: 0.4rem 0.5rem;
    font-size: 12px;
    font-family: inherit;
    background: var(--surface-200);
    color: var(--text);
    line-height: 1.4;
    min-height: 2.5rem;
    max-height: 6rem;
}
.ai-sidebar__input-field:focus {
    outline: none;
    border-color: var(--primary-500);
}
.ai-sidebar__input-hint {
    font-size: 10px;
    color: var(--text-muted, var(--surface-600));
    margin-top: 0.25rem;
    text-align: right;
}

/* Utility text colors */
.text-xs { font-size: 11px; }
.text-muted { color: var(--text-muted, var(--surface-600)); }
.text-primary { color: var(--primary-500); }
.text-warning { color: var(--warning-500, #f59e0b); }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mt-3 { margin-top: 0.75rem; }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.justify-end { justify-content: flex-end; }
.cursor-pointer { cursor: pointer; }

/* Dark mode adjustments */
.dark .ai-sidebar__message--assistant .ai-sidebar__message-content {
    background: var(--surface-400);
}
.dark .ai-sidebar__datasource-tabs button {
    color: var(--text);
}
</style>

<style>
/* Non-scoped styles for layout integration */
#main-wrapper {
    display: flex;
    flex-direction: row;
    height: 100%;
    width: 100%;
}
#main-wrapper .app-wrapper {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
}
</style>