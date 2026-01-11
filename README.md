# 🧭 Prompt Navigator v3.1.0

**A privacy-first Chrome extension for navigating AI conversations**

![Version](https://img.shields.io/badge/version-3.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🚀 Overview

Prompt Navigator is a **local-first** Chrome extension that dynamically indexes your prompts and AI responses across multiple AI platforms. Navigate your conversation history with ease using serial numbers, jump-to-message functionality, and intelligent attachment tracking.

### ✨ Supported Platforms

- ✅ **ChatGPT** (OpenAI)
- ✅ **Google Gemini**
- ✅ **Perplexity AI**

---

## 🎯 Key Features

### Core Features (Always Free)

- **🧭 Dynamic Indexing** - Real-time indexing of user prompts with serial numbers
- **🎯 Jump to Message** - Click any message to scroll directly to it in the chat
- **📎 Smart Attachments** - Automatic detection of images, PDFs, code files, and documents with visual icons
- **🔍 Search & Filter** - Powerful keyword search and filtering by platform
- **🌓 Light & Dark Mode** - Toggle between themes to match your preference
- **🔒 Privacy First** - 100% local-first architecture - no data leaves your device
- **⚡ Real-time Updates** - Messages indexed as they appear

### Premium Features (Optional)

- **📝 AI Summarization** - Generate concise titles and summaries for conversations (requires OpenAI /Gemini API key)

---

## 📦 Installation

### Method 1: Load Unpacked (Development)

1. **Download** this repository or clone it:
   ```bash
   git clone https://github.com/Varun1723/Prompt-Navigator.git
   ```

2. **Open Chrome Extensions Page**:
   - Navigate to `chrome://extensions/`
   - Enable **Developer Mode** (toggle in top-right corner)

3. **Load the Extension**:
   - Click **"Load unpacked"**
   - Select the `prompt-navigator` folder

4. **Verify Installation**:
   - You should see the Prompt Navigator extension icon (🧭) in your Chrome toolbar

---

## 🎮 Usage Guide

### Getting Started

1. **Navigate to a supported AI platform**:
   - ChatGPT: https://chatgpt.com
   - Gemini: https://gemini.google.com
   - Perplexity: https://www.perplexity.ai

2. **Start or open a conversation**

3. **Click the floating 🧭 button** (bottom-right corner) to open the sidebar

4. **Your prompts are automatically indexed** with serial numbers (#1, #2, #3...)

### Core Functionality

#### Viewing Messages
- **User prompts** are numbered (#1, #2, #3...) with a green left border
- **AI responses** have no numbers and show a blue left border
- **File attachments** display with color-coded icons (📷 images, 📄 PDFs, 💻 code, 📝 documents)

#### Jumping to Messages
- **Click any message** in the sidebar to instantly scroll to it in the chat
- The message will highlight briefly for easy visibility

#### Theme Switching
- **Click the 🌓 button** in the sidebar header to toggle between light and dark modes
- Your preference is saved automatically

#### Refreshing Index
- **Click the 🔄 button** to manually refresh the message index
- Useful if new messages don't appear automatically

### Premium Features

#### AI Summarization (Requires API Key)

1. **Get an OpenAI API Key**:
   - Visit https://platform.openai.com/api-keys
   - Create a new API key

2. **Configure in Extension**:
   - Right-click any message in sidebar → **"Generate Title"**
   - Enter your OpenAI API key when prompted
   - Key is stored locally and never sent to our servers

3. **Generate Summaries**:
   - Right-click any user prompt → **"Generate Title"**
   - AI will create a concise 5-8 word title for that conversation

---

## 🏗️ Project Structure

```
prompt-navigator/
├── manifest.json           # Extension manifest (Manifest V3)
├── background.js           # Service worker for background tasks
├── content.js              # Main content script
├── adapters/
│   ├── base.js            # Base adapter class
│   ├── chatgpt.js         # ChatGPT-specific adapter
│   ├── gemini.js          # Gemini-specific adapter
│   └── perplexity.js      # Perplexity-specific adapter
├── ui/
│   ├── popup.html         # Extension popup
│   ├── popup.js           # Popup logic
│   ├── popup.css          # Popup styling
│   └── sidebar.css        # Sidebar styling
├── icons/
│   ├── icon16.png         # 16x16 extension icon
│   ├── icon48.png         # 48x48 extension icon
│   └── icon128.png        # 128x128 extension icon
├── lib/
│   └── db.js              # IndexedDB operations (future use)
├── app/                   # Documentation website
│   ├── index.html         # Project documentation page
│   ├── app.js             # Documentation interactivity
│   └── style.css          # Documentation styling
└── README.md              # This file
```

---

## 🔧 Technical Details

### Architecture

**Local-First Design**:
- All message indexing happens in the browser
- No external servers or APIs required for core functionality
- Optional API usage (summarization) uses YOUR API key directly

**Platform Adapters**:
Each supported AI platform has a dedicated adapter that implements:
- `containerSelector` - Where to find message container
- `messageSelector` - How to identify individual messages
- `extractRole(node)` - Determine if message is user or AI
- `extractPreview(node)` - Extract text preview
- `extractAttachments(node)` - Detect attached files

**Dynamic Indexing**:
- Uses `MutationObserver` to watch for new messages
- Automatically updates sidebar when DOM changes
- Debounced for performance (750ms delay)

### Browser Compatibility

- **Chrome**: v88+ (Manifest V3 support)
- **Edge**: v88+ (Chromium-based)
- **Brave**: v1.20+ (Chromium-based)
- **Opera**: v74+ (Chromium-based)

### Permissions

The extension requires minimal permissions:

```json
{
  "permissions": ["storage"],
  "host_permissions": [
    "https://chat.openai.com/*",
    "https://chatgpt.com/*",
    "https://gemini.google.com/*",
    "https://www.perplexity.ai/*"
  ]
}
```

- **storage**: To save theme preferences locally
- **host_permissions**: Only for supported AI platforms (no access to other websites)

---

## 🛡️ Privacy & Security

### Our Commitments

✅ **100% Local-First**: All indexing happens in your browser  
✅ **Zero Data Collection**: We don't collect, store, or transmit your data  
✅ **No Analytics**: No tracking, no telemetry, no third-party scripts  
✅ **Your API Keys**: Premium features use YOUR OpenAI key directly  
✅ **Open Source**: All code is reviewable on GitHub  
✅ **Minimal Permissions**: Extension only accesses supported AI platforms  

### Data Storage

- **Theme preference**: Stored in `chrome.storage.local`
- **Message index**: Ephemeral (rebuilt on page load, not persisted)
- **API keys**: Stored locally using `chrome.storage.local` (never transmitted to us)

---

## 🐛 Troubleshooting

### Extension Not Appearing

**Issue**: Floating 🧭 button doesn't appear on AI platform

**Solutions**:
1. Verify you're on a supported platform (ChatGPT, Gemini, or Perplexity)
2. Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
3. Check if extension is enabled at `chrome://extensions/`
4. Reload the extension

### Messages Not Indexing

**Issue**: Sidebar shows "0 prompts • 0 replies"

**Solutions**:
1. Click the 🔄 refresh button in sidebar
2. Send a new message to trigger indexing
3. Hard refresh the page
4. Check browser console (F12) for errors

### Jump to Message Fails

**Issue**: Clicking a message doesn't scroll to it

**Solutions**:
1. The page structure may have changed - try refreshing
2. Check if the message is still visible in the chat
3. Try scrolling manually and then using jump again

### Dark Mode Not Working

**Issue**: 🌓 button doesn't toggle theme

**Solutions**:
1. Verify you're using the latest version (v3.1.0)
2. Check browser console for errors
3. Try closing and reopening the sidebar

### Premium Features Not Working

**Issue**: "Generate Title" produces errors

**Solutions**:
1. Verify your OpenAI API key is valid
2. Check your API key has sufficient credits
3. Ensure you have internet connection
4. Check browser console for detailed error messages

---

## 🚀 Roadmap

### v3.2.0 (Planned)
- [ ] Claude AI support
- [ ] Export conversations to Markdown/JSON
- [ ] Conversation statistics

### v3.3.0 (Planned)
- [ ] Multi-select messages
- [ ] Bulk operations (export, delete)
- [ ] Custom keyboard shortcuts

### v4.0.0 (Future)
- [ ] Cross-device sync (optional, encrypted)
- [ ] Advanced AI tagging
- [ ] Conversation templates

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: Open an issue with detailed reproduction steps
2. **Suggest Features**: Share your ideas in GitHub Discussions
3. **Submit PRs**: Fix bugs or implement features
4. **Improve Docs**: Help make our documentation clearer

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Varun1723/Prompt-Navigator.git
cd prompt-navigator

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select the prompt-navigator folder

# Make your changes
# Test thoroughly on all three platforms
# Submit a pull request
```

---

## 📄 License

MIT License

Copyright (c) 2025 Prompt Navigator

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

> **⚠️ Disclaimer**
> 
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## 💬 Support

- **GitHub Issues**: https://github.com/Varun1723/Prompt-Navigator/issues
- **Discussions**: https://github.com/Varun1723/Prompt-Navigator/discussions

---

## 🙏 Acknowledgments

Built with ❤️ for the AI power user community.

Special thanks to:
- The Chrome Extensions team for Manifest V3
- OpenAI, Google, and Perplexity for their amazing AI platforms
- All contributors and users who provided feedback

---

**⭐ If you find Prompt Navigator useful, please star the repository!**

[GitHub Repository](https://github.com/Varun1723/Prompt-Navigator) | [Documentation](https://promptnavigator.dev) | [Issues](https://github.com/yourusername/prompt-navigator/issues)
