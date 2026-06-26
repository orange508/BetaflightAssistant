![Betaflight](https://raw.githubusercontent.com/betaflight/.github/main/profile/images/bf_logo.svg#gh-light-mode-only)
![Betaflight](https://raw.githubusercontent.com/betaflight/.github/main/profile/images/bf_logo_dark.svg#gh-dark-mode-only)

# ✨BetaflightAssistant✨
# 持续更新中……(当前知识库并不完整，请理性分析，谨慎使用)
> 让穿越机调参像聊天一样简单
> 🚨 **安全警告**：AI 建议仅供参考，调参后务必低空悬停测试，确认安全再飞。放生风险自负。

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows-0078d4.svg)](https://github.com/orange508/BetaflightAssistant/releases)
[![AI](https://img.shields.io/badge/AI-DeepSeek-4a6cf7.svg)](https://deepseek.com)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen.svg)](https://github.com/orange508/BetaflightAssistant/releases)

---

## 这是什么？

**Betaflight Assistant** 是一个 AI 侧边栏工具，嵌入在 Betaflight Configurator 中。

你可以直接跟 AI 说人话，比如：

> *“帮我优化百达75Pro的花飞PID”*

AI 会：
- 自动读取飞控 17 项数据（PID、滤波器、电机等）
- 分析当前问题
- 生成 CLI 调参命令
- 你分析AI输出后，根据需求，点一下代码块按钮，自动写入飞控

**手调2小时 → AI 5秒**

---

## 重要提醒

> **AI 不是人类，它根本不懂你的手感。**
> 
> AI 给出的建议基于数据分析，但每个人的飞行风格、手感偏好、飞机状态都不一样。
> 
> **调完后请务必：**
> - 拔电池 → 上电 → 低空试悬停
> - 确认姿态正常再正常飞行
> - 根据自己的手感微调
> 
> **安全第一，理性使用。**

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 自动读参 | 飞控一连接，AI 自动读取全部参数 |
| 智能分析 | 基于当前配置给出优化建议 |
| 一键执行 | CLI 命令自动发送，不用复制粘贴 |
| 参数纠正 | 自动适配 Betaflight 4.5+ 参数名 |
| 实时状态 | PID、滤波器、电机数据实时显示 |

---

## 🤝 支持的 AI 服务商

| 服务商 | 说明 |
|--------|------|
| DeepSeek | 推荐，便宜，响应快 |
| OpenAI | GPT-4 / GPT-3.5 |
| 火山引擎 | 豆包大模型 |
| Ollama | 本地开源模型，需要GPU |

> 只要支持 OpenAI 格式 API，都能直接用。

---

## 实测效果

**机型**：百达75Pro 04版  
**电池**：1S 680mAh  
**风格**：花飞

| | 手调2小时 | AI 5秒 |
|--|----------|--------|
| 回弹 | 明显 | 消失 |
| 手感 | 粘滞 | 丝滑跟手 |
| 电机温度 | 烫手 | 正常 |

> *“AI 调完比我手调2年还丝滑”*

---

## 📦 下载

### 国内镜像（高速下载）
👉 https://btai.cpolar.top
 
### 我的博客
👉 https://ps.cpolar.top/

### GitHub Releases
👉 [https://github.com/orange508/BetaflightAssistant/releases](https://github.com/orange508/BetaflightAssistant/releases)

| 系统 | 包 |
|------|-----|
| Ubuntu/Debian | `.deb` |
| 通用 Linux | `.AppImage` |
| Fedora/RHEL | `.rpm` |
| Windows 11/10 | `.exe` 安装包 |

---

## 技术栈

- **前端**：Vue 3 + Vite
- **桌面打包**：Tauri (Rust)
- **飞控通信**：MSP 协议
- **AI**：OpenAI 格式 API

---

## 常见问题

**Q: 没有 API Key 能用吗？**  
> 可以，用 Ollama 跑本地模型，免费。

**Q: 支持小米大模型吗？**  
> 小米 MiMo 兼容 OpenAI 格式，填地址就能用。

**Q: AI 给的参数靠谱吗？**  
> AI 基于数据分析，但不保证100%适合你。调完后请自行低空测试，确认安全再飞。

**Q: 调坏了怎么办？**  
> 调前记得备份。

**Q: Windows 版怎么安装？**  
> 下载 `.exe` 安装包，双击运行，按提示安装即可。

---


     
---

<p align="center">
  <i>⭐ Star 支持一下~</i><br>
  <i>🤖 AI 不是人类，调完后请自行分析，安全第一</i>
</p>
