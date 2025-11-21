class DeepSeekAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'deepseek';
    this.containerSelector = 'body';
    // Target the message container
    this.messageSelector = 'div.flex.w-full.flex-col'; 
  }

  extractRole(node) {
    // 1. Heuristic: Alignment. User messages in DeepSeek use 'items-end' (right align)
    // We check the node's classes or its parent's classes
    if (node.className.includes('items-end')) return 'user';
    
    // 2. Heuristic: The "Edit" pencil icon only exists on User prompts
    // It's usually an SVG inside a button
    // We search for the specific "Edit" text if available, or generic button structure
    // DeepSeek user blocks are often distinct by having the avatar on the RIGHT
    
    // Let's check for the "ds-user-avatar" vs "ds-assistant-avatar" if available
    const html = node.innerHTML;
    if (html.includes('ds-user-avatar')) return 'user';
    
    // Fallback to previous logic which is usually correct for DeepSeek's current layout
    return 'assistant';
  }

  extractPreview(node) {
    let text = node.textContent?.trim() || '';
    return text.replace(/^(You|DeepSeek)\s*/i, '').substring(0, 120);
  }

  extractAttachments(node) {
    if (node.querySelector('div[class*="file"]')) return 'pdf';
    return null;
  }
}