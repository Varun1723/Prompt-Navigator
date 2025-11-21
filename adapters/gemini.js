class GeminiAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'gemini';
    this.containerSelector = 'body'; 
    // Select specific containers to avoid noise
    this.messageSelector = '.user-query-container, .model-response-container'; 
  }

  extractRole(node) {
    if (node.classList.contains('user-query-container')) return 'user';
    return 'assistant';
  }

  extractPreview(node) {
    return node.textContent?.trim().substring(0, 120) || '';
  }

  extractAttachments(node) {
    const hasImage = node.querySelector('img:not(.avatar)');
    const hasFile = node.querySelector('mat-chip') || node.textContent.includes('.pdf');
    if (hasImage) return 'image';
    if (hasFile) return 'pdf';
    return null;
  }
}