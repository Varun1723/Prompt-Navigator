# Privacy Policy - Prompt Navigator

**Last Updated:** 2026-01-16

## 1. Introduction
Prompt Navigator ("the Extension") is committed to protecting user privacy. This Privacy Policy explains our **local-first** philosophy. Unlike many extensions, Prompt Navigator is designed so that your sensitive AI conversations and configuration data **never leave your local machine** unless you explicitly direct the extension to send a specific prompt to your chosen AI provider.

## 2. Data Collection
We do **not** collect, store, or transmit any personal data to the developer or any third-party servers managed by the developer.

- **Chat Content.** The extension reads the active chat messages on supported platforms (ChatGPT, Gemini, Perplexity) solely to build a navigation index. This data is processed in your browser's temporary memory (RAM) and is wiped when the tab is closed.
- **Personal Information.** We do not collect names, email addresses, IP addresses, or browsing history.

## 3. Data Storage
All persistent data is stored locally using `chrome.storage.local`, a secure storage area within your browser that is not accessible to other websites or extensions.

- **API Keys.** User-provided API keys (OpenAI or Google Gemini) are stored locally on your device.
- **User Preferences.** Settings such as Dark Mode, sidebar visibility, and adapter settings are stored locally to ensure a consistent experience across sessions.
- **No Cloud Sync by Default.** By default, your data is not synced to Google’s servers; it remains on the device where the extension is installed unless you enable browser-level sync explicitly.

## 4. Third-Party Services (AI Providers)
The Extension offers an optional **"Generate Title"** feature that utilizes third-party AI models.

- **API Transmission.** If you provide an API key and request a "Title Generation," the Extension sends **only the text of that specific prompt** directly to the provider you selected (OpenAI or Google Gemini).
- **Provider Policies.** These requests are governed by the privacy policies of the selected provider:
  - OpenAI Privacy Policy: https://openai.com/policies/privacy  
  - Google Privacy Policy: https://policies.google.com/privacy
- **No Interception.** Prompt Navigator acts as a direct browser-based client. We do **not** log, intercept, or view the data sent to or received from these APIs.

## 5. Justification of Permissions
To provide the functionality described, the Extension requires the following permissions:

- **`storage`**: Required to save API keys and theme/preferences locally.
- **Host permissions** (for supported AI pages, e.g., `https://chat.openai.com/*`, `https://gemini.google.com/*`, `https://perplexity.ai/*`): Required so content scripts can read message structure and detect file attachments to build the local navigation index.

> The extension does **not** request broad `"<all_urls>"` host permissions. It only requests access to the specific AI chat domains it supports.

## 6. Security
We follow industry-standard best practices for Chrome extension development to help ensure local data security. Because we do not maintain a central database of user chat data, there is no risk of a centralized data breach affecting your indexed content held by the extension.

## 7. User Controls & Data Deletion
- You may disable features or clear stored data at any time via the extension UI.
- Uninstalling the extension will remove all locally stored data created by the extension from `chrome.storage.local` on that device.

## 8. Changes to This Policy
We may update this Privacy Policy occasionally to reflect functional changes or legal/regulatory requirements. Any changes will be indicated by an updated **Last Updated** date at the top of this document. We encourage users to check this page periodically.

## 9. Contact
If you have questions or concerns about this Privacy Policy, please open an issue on the project’s GitHub repository: [Github Issues](https://github.com/Varun1723/Prompt-Navigator/issues)


