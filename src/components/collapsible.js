/**
 * Collapsible field functionality
 * Makes optional fields collapsible with toggle UI
 */

/**
 * Make a single optional field collapsible
 */
export function makeOptionalCollapsible(field, label) {
  field.classList.add('optional-collapsible');
  
  // Create toggle header
  const toggle = document.createElement('div');
  toggle.className = 'optional-toggle';
  toggle.innerHTML = `
    <span class="toggle-icon">▶</span>
    <span class="toggle-label">${label}</span>
    <span class="optional-badge">Optional</span>
  `;
  toggle.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 12px;
    background: #f8f9fa;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 0;
    transition: all 0.2s;
    user-select: none;
  `;
  
  toggle.addEventListener('mouseenter', () => {
    if (field.classList.contains('collapsed')) {
      toggle.style.background = '#e9ecef';
    }
  });
  
  toggle.addEventListener('mouseleave', () => {
    if (field.classList.contains('collapsed')) {
      toggle.style.background = '#f8f9fa';
    }
  });
  
  // Style the optional badge
  const badge = toggle.querySelector('.optional-badge');
  badge.style.cssText = `
    background: #e7f3ff;
    color: #0066cc;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.75em;
    font-weight: 600;
    margin-left: auto;
  `;
  
  // Style the icon
  const icon = toggle.querySelector('.toggle-icon');
  icon.style.cssText = `
    transition: transform 0.2s;
    font-size: 0.8em;
    color: #666;
    min-width: 12px;
  `;
  
  // Style the label
  const toggleLabel = toggle.querySelector('.toggle-label');
  toggleLabel.style.cssText = `
    font-weight: 500;
    color: #495057;
    flex: 1;
  `;
  
  // Wrap existing content
  const content = document.createElement('div');
  content.className = 'optional-content';
  content.style.cssText = `
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    padding: 0;
  `;
  
  // Move all children to content
  const children = Array.from(field.children);
  children.forEach(child => content.appendChild(child));
  
  // Add toggle and content to field
  field.appendChild(toggle);
  field.appendChild(content);
  
  // Start collapsed
  field.classList.add('collapsed');
  
  // Toggle functionality
  toggle.addEventListener('click', () => {
    const isCollapsed = field.classList.contains('collapsed');
    field.classList.toggle('collapsed');
    
    if (isCollapsed) {
      // Expand - calculate actual height needed
      icon.style.transform = 'rotate(90deg)';
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.padding = '15px 0 0 0';
      toggle.style.background = '#e7f3ff';
      toggle.style.borderColor = '#0066cc';
      badge.style.background = '#d1ecf1';
      
      // After animation, set to auto to allow for dynamic content
      setTimeout(() => {
        if (!field.classList.contains('collapsed')) {
          content.style.maxHeight = 'none';
          content.style.overflow = 'visible';
        }
      }, 300);
    } else {
      // Collapse - set height first for animation
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.overflow = 'hidden';
      
      // Force reflow
      content.offsetHeight;
      
      // Then collapse
      setTimeout(() => {
        icon.style.transform = 'rotate(0deg)';
        content.style.maxHeight = '0';
        content.style.padding = '0';
        toggle.style.background = '#f8f9fa';
        toggle.style.borderColor = '#dee2e6';
        badge.style.background = '#e7f3ff';
      }, 10);
    }
  });
  
  // Auto-expand when typing
  content.addEventListener('input', () => {
    if (field.classList.contains('collapsed')) {
      toggle.click();
    }
  }, true);
}

/**
 * Make a group of optional fields collapsible together
 */
export function makeOptionalGroupCollapsible(groupElement, groupLabel) {
  groupElement.classList.add('optional-collapsible', 'collapsed');
  
  // Create toggle header
  const toggle = document.createElement('div');
  toggle.className = 'optional-toggle';
  toggle.innerHTML = `
    <span class="toggle-icon">▶</span>
    <span class="toggle-label">${groupLabel}</span>
    <span class="optional-badge">Optional</span>
  `;
  toggle.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 12px;
    background: #f8f9fa;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 0;
    transition: all 0.2s;
    user-select: none;
  `;
  
  const badge = toggle.querySelector('.optional-badge');
  badge.style.cssText = `
    background: #e7f3ff;
    color: #0066cc;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.75em;
    font-weight: 600;
    margin-left: auto;
  `;
  
  const icon = toggle.querySelector('.toggle-icon');
  icon.style.cssText = `
    transition: transform 0.2s;
    font-size: 0.8em;
    color: #666;
    min-width: 12px;
  `;
  
  const toggleLabel = toggle.querySelector('.toggle-label');
  toggleLabel.style.cssText = `
    font-weight: 500;
    color: #495057;
    flex: 1;
  `;
  
  // Wrap existing fields in content container
  const content = document.createElement('div');
  content.className = 'optional-content';
  content.style.cssText = `
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    padding: 0;
  `;
  
  // Move all existing children to content
  const children = Array.from(groupElement.children);
  children.forEach(child => content.appendChild(child));
  
  // Add toggle and content
  groupElement.appendChild(toggle);
  groupElement.appendChild(content);
  
  // Hover effects
  toggle.addEventListener('mouseenter', () => {
    if (groupElement.classList.contains('collapsed')) {
      toggle.style.background = '#e9ecef';
    }
  });
  
  toggle.addEventListener('mouseleave', () => {
    if (groupElement.classList.contains('collapsed')) {
      toggle.style.background = '#f8f9fa';
    }
  });
  
  // Toggle functionality with proper height calculation
  toggle.addEventListener('click', () => {
    const isCollapsed = groupElement.classList.contains('collapsed');
    groupElement.classList.toggle('collapsed');
    
    if (isCollapsed) {
      // Expand - calculate actual height needed
      icon.style.transform = 'rotate(90deg)';
      
      // Get actual scrollHeight
      const actualHeight = content.scrollHeight;
      content.style.maxHeight = actualHeight + 'px';
      content.style.padding = '15px 0 0 0';
      toggle.style.background = '#e7f3ff';
      toggle.style.borderColor = '#0066cc';
      badge.style.background = '#d1ecf1';
      
      // After animation completes, set to auto for dynamic content
      setTimeout(() => {
        if (!groupElement.classList.contains('collapsed')) {
          content.style.maxHeight = 'none';
          content.style.overflow = 'visible';
        }
      }, 300);
    } else {
      // Collapse - set explicit height first for smooth animation
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.overflow = 'hidden';
      
      // Force reflow
      content.offsetHeight;
      
      // Then animate to 0
      setTimeout(() => {
        icon.style.transform = 'rotate(0deg)';
        content.style.maxHeight = '0';
        content.style.padding = '0';
        toggle.style.background = '#f8f9fa';
        toggle.style.borderColor = '#dee2e6';
        badge.style.background = '#e7f3ff';
      }, 10);
    }
  });
  
  // Auto-expand when typing in any field inside
  content.addEventListener('input', () => {
    if (groupElement.classList.contains('collapsed')) {
      toggle.click();
    }
  }, true);
  
  // Auto-expand when field receives focus
  content.addEventListener('focus', () => {
    if (groupElement.classList.contains('collapsed')) {
      toggle.click();
    }
  }, true);
}
