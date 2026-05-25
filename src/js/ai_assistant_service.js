import { loadConfig, AI_PROVIDERS } from "./ai_assistant_config";

// System prompt for Betaflight AI assistant
const SYSTEM_PROMPT = `You are a Betaflight drone tuning expert assistant. Your job is to help users with:
1. Analyzing PID data, filter settings and providing tuning recommendations
2. Generating MSP/CLI commands from natural language requests
3. Explaining Betaflight configuration parameters
4. Diagnosing flight issues from blackbox logs or CLI dumps

Rules:
- Always be specific and practical. Give concrete numbers for PID adjustments when possible.
- When generating CLI commands, format them as code blocks using \`\`\`cli ... \`\`\`.
- Each CLI command block MUST contain only complete, ready-to-execute Betaflight CLI set commands.
- Always include the "save" command at the end of the CLI block.
- For PID tuning: explain what each change addresses (e.g., oscillations, bounce-back, propwash).
- Ask clarifying questions if the user's description is too vague.
- When the user provides CLI dump data, analyze the relevant sections and suggest improvements.
- Keep responses concise but complete.
- Use Betaflight terminology correctly (P, I, D, FF, D_Min, TPA, RPM filtering, etc.).
- If you cannot determine the answer, be honest and suggest the user test empirically.`;

/**
 * Builds a system prompt enriched with current FC state data
 */
function buildSystemPromptWithData(fcData) {
    let dataText = "";
    if (fcData) {
        dataText += "\n\nCurrent Flight Controller State:\n";

        if (fcData.pidProfile) {
            dataText += "PID Profile:\n";
            const p = fcData.pidProfile;
            const axes = ["ROLL", "PITCH", "YAW"];
            for (let i = 0; i < axes.length; i++) {
                const pidEntry = p.pid?.[i];
                if (pidEntry) {
                    // pidEntry may be an array [P, I, D] (from FC.PIDS) or object {P, I, D, F}
                    const isArray = Array.isArray(pidEntry);
                    const pVal = isArray ? pidEntry[0] : (pidEntry.P ?? pidEntry.p ?? "?");
                    const iVal = isArray ? pidEntry[1] : (pidEntry.I ?? pidEntry.i ?? "?");
                    const dVal = isArray ? pidEntry[2] : (pidEntry.D ?? pidEntry.d ?? "?");
                    const fVal = isArray ? (pidEntry[3] ?? "?") : (pidEntry.F ?? pidEntry.f ?? "?");
                    dataText += `  ${axes[i]}: P=${pVal}, I=${iVal}, D=${dVal}, F=${fVal}\n`;
                }
            }
            if (p.dMinPercentage !== undefined) dataText += `  D_Min: ${p.dMinPercentage}%\n`;
            if (p.dMinGain !== undefined) dataText += `  D_Min_Gain: ${p.dMinGain}\n`;
            if (p.dMinAdvance !== undefined) dataText += `  D_Min_Advance: ${p.dMinAdvance}\n`;
            if (p.tpaBreakpoint !== undefined) dataText += `  TPA Breakpoint: ${p.tpaBreakpoint}\n`;
            if (p.tpaRate !== undefined) dataText += `  TPA Rate: ${p.tpaRate}%\n`;
        }

        if (fcData.filterConfig) {
            dataText += "Filters:\n";
            const f = fcData.filterConfig;
            if (f.gyroLowpass1DynamicMinCutoff !== undefined) {
                dataText += `  Gyro LPF1 Dynamic: ${f.gyroLowpass1DynamicMinCutoff}-${f.gyroLowpass1DynamicMaxCutoff}Hz\n`;
            }
            if (f.gyroLowpass2StaticCutoff !== undefined) {
                dataText += `  Gyro LPF2 Static: ${f.gyroLowpass2StaticCutoff}Hz\n`;
            }
            if (f.dtermLowpass1DynamicMinCutoff !== undefined) {
                dataText += `  DTerm LPF1 Dynamic: ${f.dtermLowpass1DynamicMinCutoff}-${f.dtermLowpass1DynamicMaxCutoff}Hz\n`;
            }
            if (f.dtermLowpass2StaticCutoff !== undefined) {
                dataText += `  DTerm LPF2 Static: ${f.dtermLowpass2StaticCutoff}Hz\n`;
            }
            if (f.gyroNotch1Frequency !== undefined) {
                dataText += `  Gyro Notch1: ${f.gyroNotch1Frequency}Hz (${f.gyroNotch1Cutoff}Hz)\n`;
            }
            if (f.gyroNotch2Frequency !== undefined) {
                dataText += `  Gyro Notch2: ${f.gyroNotch2Frequency}Hz (${f.gyroNotch2Cutoff}Hz)\n`;
            }
        }

        if (fcData.motorConfig) {
            dataText += "Motors:\n";
            dataText += `  Idle: ${fcData.motorConfig.idlePercent ?? "N/A"}%\n`;
        }

        if (fcData.rateProfile) {
            dataText += "Rates:\n";
            dataText += `  RC Rate: ${fcData.rateProfile.rcRate ?? "N/A"}\n`;
            dataText += `  Super Rate: ${fcData.rateProfile.superRate ?? "N/A"}\n`;
            dataText += `  Expo: ${fcData.rateProfile.expo ?? "N/A"}\n`;
        }
    }

    return SYSTEM_PROMPT + dataText;
}

/**
 * Generate a mock/local response when no API key is configured.
 */
function generateMockResponse(userMessage, fcData) {
    const msg = userMessage.toLowerCase();

    // PID related queries
    if (
        msg.includes("pid") ||
        msg.includes("p值") ||
        msg.includes("调参") ||
        msg.includes("tuning") ||
        msg.includes("振荡") ||
        msg.includes("oscillation") ||
        msg.includes("propwash") ||
        msg.includes("洗桨") ||
        msg.includes("bounce")
    ) {
        let response = "## 📊 PID 调参分析\n\n";
        response += "根据你的描述，以下是常见的调参建议：\n\n";

        if (msg.includes("振荡") || msg.includes("oscillation") || msg.includes("抖")) {
            response += "### 🔧 针对振荡问题\n";
            response += "- **降低 P 值**：每次降低 5-10 个单位 → `set p_pitch = <当前值 - 5>`\n";
            response += "- **提高 D 值**：每次增加 2-5 个单位 → `set d_pitch = <当前值 + 3>`\n";
            response += "- **降低 D_Min**：尝试 `set d_min_pitch = <当前值 - 2>`\n";
            response += "- **检查滤波**：尝试降低 Gyro LPF1 截止频率\n\n";
        }

        if (msg.includes("洗桨") || msg.includes("propwash") || msg.includes("回弹") || msg.includes("bounce")) {
            response += "### 🔧 针对洗桨/回弹问题\n";
            response += "- **提高 D 值**：`set d_pitch = <当前值 + 5>` 和 `set d_roll = <当前值 + 5>`\n";
            response += "- **提高 D_Min**：`set d_min_pitch = <当前值 + 3>`\n";
            response += "- **提高 P 值**：如果回弹伴随漂移，增加 I 值\n";
            response += "- **降低 I 值**：如果 I 值过高也会造成回弹\n\n";
        }

        response += "### 📝 建议的 CLI 命令\n";
        response += "```cli\n";
        if (fcData?.pidProfile) {
            const p = fcData.pidProfile;
            const pid0 = p.pid?.[0];
            const pid1 = p.pid?.[1];
            const pid2 = p.pid?.[2];
            // pidEntry may be array [P, I, D] or object {P, I, D}
            const isArr = Array.isArray(pid0);
            const rollP = isArr ? pid0[0] : (pid0?.P ?? pid0?.p ?? 50);
            const rollI = isArr ? pid0[1] : (pid0?.I ?? pid0?.i ?? 60);
            const rollD = isArr ? pid0[2] : (pid0?.D ?? pid0?.d ?? 30);
            const pitchP = isArr ? pid1[0] : (pid1?.P ?? pid1?.p ?? 55);
            const pitchI = isArr ? pid1[1] : (pid1?.I ?? pid1?.i ?? 65);
            const pitchD = isArr ? pid1[2] : (pid1?.D ?? pid1?.d ?? 35);
            const yawP = isArr ? pid2[0] : (pid2?.P ?? pid2?.p ?? 55);
            const yawI = isArr ? pid2[1] : (pid2?.I ?? pid2?.i ?? 55);
            const yawD = isArr ? pid2[2] : (pid2?.D ?? pid2?.d ?? 0);
            response += `set p_roll = ${rollP}\n`;
            response += `set i_roll = ${rollI}\n`;
            response += `set d_roll = ${rollD}\n`;
            response += `set p_pitch = ${pitchP}\n`;
            response += `set i_pitch = ${pitchI}\n`;
            response += `set d_pitch = ${pitchD}\n`;
            response += `set p_yaw = ${yawP}\n`;
            response += `set i_yaw = ${yawI}\n`;
            response += `set d_yaw = ${yawD}\n`;
            response += "# 以上是当前值，请根据实际情况调整\n";
        } else {
            response += "set p_roll = 50\nset d_roll = 30\nset p_pitch = 55\nset d_pitch = 35\n";
        }
        response += "save\n";
        response += "```\n";
        response += "\n> ⚠️ **注意**：这是模拟回复（离线模式）。请连接 AI 服务获取更精准的分析。";
        return response;
    }

    // Filter queries
    if (msg.includes("滤波") || msg.includes("filter") || msg.includes("notch") || msg.includes("rpm")) {
        let response = "## 🎛️ 滤波器分析\n\n";
        response += "| 滤波器 | 推荐范围 | 说明 |\n";
        response += "|--------|----------|------|\n";
        response += "| Gyro LPF1 Dynamic | 200-500Hz | 主陀螺仪低通滤波，越低越平滑但延迟大 |\n";
        response += "| Gyro LPF2 Static | 250-500Hz | 第二级静态低通 |\n";
        response += "| DTerm LPF1 Dynamic | 100-250Hz | D 项滤波，过低会导致电机过热 |\n";
        response += "| DTerm LPF2 Static | 150-300Hz | D 项第二级滤波 |\n";
        response += "| Gyro Notch 1 & 2 | 自动或手动 | 消除电机共振频率 |\n";
        response += "| RPM Filter | 建议启用 | 动态追踪电机转速消除噪声 |\n\n";

        response += "### 📝 当前滤波设置及建议\n";
        response += "```cli\n";
        if (fcData?.filterConfig) {
            const f = fcData.filterConfig;
            const gyroDynMin = f.gyroLowpass1DynamicMinCutoff ?? 200;
            const gyroDynMax = f.gyroLowpass1DynamicMaxCutoff ?? 500;
            const dtermDynMin = f.dtermLowpass1DynamicMinCutoff ?? 120;
            const dtermDynMax = f.dtermLowpass1DynamicMaxCutoff ?? 250;
            response += `set gyro_lpf1_dyn_min_hz = ${gyroDynMin}\n`;
            response += `set gyro_lpf1_dyn_max_hz = ${gyroDynMax}\n`;
            response += `set dterm_lpf1_dyn_min_hz = ${dtermDynMin}\n`;
            response += `set dterm_lpf1_dyn_max_hz = ${dtermDynMax}\n`;
            if (f.gyroLowpass2StaticCutoff !== undefined) {
                response += `set gyro_lowpass2_static_hz = ${f.gyroLowpass2StaticCutoff}\n`;
            }
            if (f.dtermLowpass2StaticCutoff !== undefined) {
                response += `set dterm_lowpass2_static_hz = ${f.dtermLowpass2StaticCutoff}\n`;
            }
        } else {
            response += "set gyro_lpf1_dyn_min_hz = 200\nset gyro_lpf1_dyn_max_hz = 500\nset dterm_lpf1_dyn_min_hz = 120\nset dterm_lpf1_dyn_max_hz = 250\n";
        }
        response += "save\n";
        response += "```\n";
        response += "\n> ⚠️ **注意**：这是模拟回复（离线模式）。";
        return response;
    }

    // General / CLI generation
    if (msg.includes("cli") || msg.includes("命令") || msg.includes("command") || msg.includes("msp")) {
        return `## 💻 CLI 命令生成\n\n请告诉我你想执行什么操作，我会生成对应的 CLI 命令。\n\n例如：\n- \"降低 Roll P 到 45\"\n- \"启用 RPM 滤波\"\n- \"设置电机怠速为 5.5%\"\n- \"配置 OSD 显示电池电压\"\n\n点击命令块中的 **▶ 执行** 按钮即可自动写入飞控。\n\n> ⚠️ 这是模拟回复（离线模式），请连接 AI 服务获取完整功能。`;
    }

    // Help / explanation
    if (msg.includes("什么是") || msg.includes("是什么") || msg.includes("explain") || msg.includes("what is") || msg.includes("d_min") || msg.includes("tpa") || msg.includes("ff") || msg.includes("feedforward")) {
        return `## 📖 参数说明\n\n### 常用 PID 参数：\n- **P (Proportional)**：比例增益。控制飞控对角度误差的即时响应力度。P 越高，响应越快，但过高会导致振荡。\n- **I (Integral)**：积分增益。消除稳态误差，让飞机保持姿态。I 过高会导致慢速振荡和回弹。\n- **D (Derivative)**：微分增益。抑制振荡，提供阻尼效果。D 过高会导致电机过热。\n- **FF (FeedForward)**：前馈。直接传递摇杆输入到电机，提高响应速度。\n- **D_Min**：D 的最小值。在快速操作时保持 D 项最小值，防止洗桨。\n- **TPA (Throttle PID Attenuation)**：油门 PID 衰减。高油门时降低 P/D 值防止振荡。\n\n> ⚠️ 这是模拟回复（离线模式）。`;
    }

    // Default response for unknown queries
    return `你好！我是 Betaflight AI 调参助手（当前处于**离线模式**）。\n\n我可以帮助你：\n1. 📊 **分析 PID 数据**并提供调参建议\n2. 💻 **生成 MSP/CLI 命令**（用自然语言描述需求）— 点击 **▶ 执行** 按钮一键写入飞控\n3. 📖 **解释配置参数**的含义\n4. 🔍 **诊断飞行问题**\n\n请描述你的问题，或点击"配置 AI 服务"连接 OpenAI/DeepSeek/火山引擎/Ollama 获取智能回复。`;
}

/**
 * Send message to AI API
 * @param {string} userMessage - User's message
 * @param {Array} history - Previous messages [{role, content}]
 * @param {Object} fcData - Current FC state data for context
 * @returns {Promise<string>} - AI response text
 */
export async function sendMessage(userMessage, history = [], fcData = null) {
    const config = loadConfig();

    // If no API key configured, use mock mode
    if (!config.apiKey || !config.provider || config.provider === "") {
        // Simulate some delay for realistic feel
        await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 600));
        return generateMockResponse(userMessage, fcData);
    }

    const provider = AI_PROVIDERS[config.provider];
    if (!provider) {
        return "❌ 未配置有效的 AI 服务商。请在设置中选择 OpenAI、DeepSeek、火山引擎或 Ollama。";
    }

    const baseUrl = config.baseUrl || provider.defaultBaseUrl;
    const model = config.model || provider.defaultModel;

    const systemPrompt = buildSystemPromptWithData(fcData);

    const messages = [{ role: "system", content: systemPrompt }];

    // Add last 20 history messages (10 turns)
    const recentHistory = history.slice(-20);
    messages.push(...recentHistory.map((m) => ({ role: m.role, content: m.content })));

    messages.push({ role: "user", content: userMessage });

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.7,
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("[AI Assistant] API error:", response.status, errorBody);

            if (response.status === 401) {
                return "❌ API Key 无效或已过期。请检查你的 API Key 设置。";
            }
            if (response.status === 429) {
                return "❌ API 请求频率过高，请稍后再试。";
            }
            return `❌ API 错误 (${response.status})：${errorBody.slice(0, 200)}`;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return "❌ API 返回了空响应，请重试。";
        }

        return content;
    } catch (error) {
        console.error("[AI Assistant] Network error:", error);
        return `❌ 网络请求失败：${error.message}\n请检查你的网络连接和 API 地址配置。`;
    }
}