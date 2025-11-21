class PerplexityAdapter extends BaseAdapter {
  constructor() {
    super();
    this.platformName = 'perplexity';
    this.containerSelector = 'main';
    // We look for the grid columns. User is usually 'col-span-8', Answer is 'col-span-12'
    // Also adding 'div[dir="auto"]' which is a common text wrapper
    this.messageSelector = '.group\\/query, .group\\/answer, div[dir="auto"]'; 
  }

  extractRole(node) {
    // User prompts usually are in the query group
    if (node.classList.contains('group/query') || node.querySelector('h1')) return 'user';
    return 'assistant';
  }

  extractPreview(node) {
    // Perplexity answers have a lot of UI noise (sources buttons). 
    // We try to grab the "prose" class which holds the actual text.
    const content = node.querySelector('.prose') || node;
    return content.textContent?.trim().substring(0, 120) || '';
  }

  extractAttachments(node) {
    return null;
  }
}