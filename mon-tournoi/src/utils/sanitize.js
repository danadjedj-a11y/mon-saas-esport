/**
 * Simple HTML sanitizer to prevent XSS attacks
 * For production, consider using DOMPurify library
 */

/**
 * Sanitize HTML content by removing dangerous tags and attributes
 * @param {string} html - The HTML string to sanitize
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHTML(html) {
  if (!html) return '';
  
  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Allowed tags (whitelist)
  const allowedTags = [
    'p', 'br', 'strong', 'em', 'u', 's', 'b', 'i',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'span', 'div'
  ];
  
  // Allowed attributes by tag
  const allowedAttributes = {
    'a': ['href', 'title', 'target'],
    'span': ['style'],
    'div': ['style']
  };
  
  // Recursively clean nodes
  function cleanNode(node) {
    // Remove if not allowed tag
    if (node.nodeType === 1) { // Element node
      const tagName = node.tagName.toLowerCase();
      
      if (!allowedTags.includes(tagName)) {
        // Replace with text content
        const text = document.createTextNode(node.textContent);
        node.parentNode?.replaceChild(text, node);
        return;
      }
      
      // Remove disallowed attributes
      const allowedAttrs = allowedAttributes[tagName] || [];
      const attrs = Array.from(node.attributes);
      
      attrs.forEach(attr => {
        if (!allowedAttrs.includes(attr.name.toLowerCase())) {
          node.removeAttribute(attr.name);
        } else if (attr.name === 'href') {
          // Sanitize href to prevent javascript: and data: URLs
          const href = attr.value.toLowerCase().trim();
          if (href.startsWith('javascript:') || href.startsWith('data:')) {
            node.removeAttribute('href');
          }
        }
      });
      
      // Recursively clean children
      Array.from(node.childNodes).forEach(child => cleanNode(child));
    }
  }
  
  // Clean all nodes
  Array.from(temp.childNodes).forEach(child => cleanNode(child));
  
  return temp.innerHTML;
}

/**
 * Strip all HTML tags from a string
 * @param {string} html - The HTML string
 * @returns {string} - Plain text
 */
export function stripHTML(html) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}
