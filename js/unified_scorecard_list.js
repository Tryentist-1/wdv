/**
 * Unified Scorecard List Component
 * 
 * Provides a consistent, compact 2-line grid layout for displaying scorecard lists
 * across all parts of the application. Replaces fragmented implementations in
 * results.html, archer_history.html, coach console, etc.
 * 
 * Usage:
 *   const listHTML = UnifiedScorecardList.render(data, options);
 *   const container = UnifiedScorecardList.create(data, options);
 */

const UnifiedScorecardList = (() => {

  /**
   * Render status text (no pill styling)
   */
  function renderStatusText(status) {
    if (status === 'VER' || status === 'VERIFIED') return 'VER';
    if (status === 'VOID') return 'VOID';
    if (status === 'LOCKED' || status === 'LOCK') return 'LOCK';
    if (status === 'PENDING' || status === 'PEND') return 'PEND';
    return 'COMP';
  }

  /**
   * Format event details line
   */
  function formatEventDetails(item) {
    const parts = [];
    
    // Date
    if (item.date || item.event_date || item.eventDate) {
      const date = new Date(item.date || item.event_date || item.eventDate);
      if (!isNaN(date.getTime())) {
        parts.push(date.toLocaleDateString('en-US', { 
          month: 'short', day: 'numeric', year: '2-digit' 
        }));
      }
    }
    
    // Round type
    if (item.round_type || item.roundType) {
      parts.push(item.round_type || item.roundType);
    } else {
      parts.push('R300');
    }
    
    // Division
    if (item.division) {
      const divisionNames = {
        'BVAR': 'Boys Varsity', 'GVAR': 'Girls Varsity', 
        'BJV': 'Boys JV', 'GJV': 'Girls JV'
      };
      parts.push(divisionNames[item.division] || item.division);
    }
    
    // Bale/Target
    if (item.bale_number || item.bale || item.baleNumber) {
      const bale = item.bale_number || item.bale || item.baleNumber;
      const target = item.target_assignment || item.target || item.targetAssignment || '';
      parts.push(`Bale ${bale}${target ? ' ' + target : ''}`);
    }
    
    return parts.join(' • ');
  }

  /**
   * Create the unified scorecard list container with header
   */
  function create(items = [], options = {}) {
    const {
      columns = ['Event', 'Status', 'Total', 'Avg', 'Xs', '10s'],
      showRank = false,
      onItemClick = null,
      className = 'scorecard-list-container'
    } = options;

    const container = document.createElement('div');
    // Use Tailwind classes with safe area insets for iPhone X series
    container.className = `${className} flex flex-col w-full overflow-x-auto`;
    // Add safe area insets inline (Tailwind doesn't have env() support in classes)
    container.style.paddingLeft = 'max(0.75rem, env(safe-area-inset-left))';
    container.style.paddingRight = 'max(0.75rem, env(safe-area-inset-right))';

    // Create header
    const header = document.createElement('div');
    // Tailwind classes: grid, sticky header, background, border, typography
    // Responsive: tighter spacing on mobile (gap-1.5, px-2.5, py-2, text-[11px]) then normal (gap-2, px-3, py-2.5, text-xs)
    header.className = 'grid gap-1.5 px-2.5 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide items-center sticky top-0 z-10 min-w-0 sm:gap-2 sm:px-3 sm:py-2.5 sm:text-xs';
    
    // Filter out empty column names and count actual columns
    const nonEmptyColumns = columns.filter(col => col && col.trim() !== '');
    const columnCount = showRank ? nonEmptyColumns.length + 1 : nonEmptyColumns.length;
    
    // Set grid template columns based on column count (inline style needed for dynamic columns)
    // Mobile: tighter minmax values, Desktop: normal values
    if (columnCount === 4) {
      header.style.gridTemplateColumns = 'minmax(0, 2fr) minmax(55px, 1fr) minmax(65px, 1fr) minmax(55px, 1fr)';
      // Override for larger screens
      header.style.setProperty('--grid-cols-4', 'minmax(0, 2fr) minmax(60px, 1fr) minmax(70px, 1fr) minmax(60px, 1fr)');
    } else if (columnCount === 6) {
      header.style.gridTemplateColumns = 'minmax(0, 2fr) minmax(55px, 1fr) minmax(65px, 1fr) minmax(55px, 1fr) minmax(35px, 0.5fr) minmax(35px, 0.5fr)';
      header.style.setProperty('--grid-cols-6', 'minmax(0, 2fr) minmax(60px, 1fr) minmax(70px, 1fr) minmax(60px, 1fr) minmax(40px, 0.5fr) minmax(40px, 0.5fr)');
    }
    // Add data attribute for responsive targeting
    header.setAttribute('data-columns', columnCount.toString());
    
    // Header cells use Tailwind classes for consistent styling
    if (showRank) {
      header.innerHTML = `<div class="text-center">Rank</div>` + columns.map(col => col && col.trim() !== '' ? `<div class="text-center">${col}</div>` : '<div></div>').join('');
    } else {
      header.innerHTML = columns.map(col => col && col.trim() !== '' ? `<div class="text-center">${col}</div>` : '<div></div>').join('');
    }
    
    container.appendChild(header);

    // Create items - pass columnCount to ensure items match header
    items.forEach((item, index) => {
      const listItem = createItem(item, index, { ...options, forceColumnCount: columnCount });
      container.appendChild(listItem);
    });

    return container;
  }

  /**
   * Create individual scorecard list item
   */
  function createItem(item, index, options = {}) {
    const {
      showRank = false,
      onItemClick = null,
      getEventName = (item) => item.event_name || item.eventName || item.name || 'Unknown Event',
      getTotal = (item) => item.final_score || item.totalScore || item.total || 0,
      getAvg = (item) => {
        const total = getTotal(item);
        const ends = item.ends_completed || item.endsCompleted || 10;
        return ends > 0 ? (total / (ends * 3)).toFixed(1) : '0.0';
      },
      getXs = (item) => item.total_xs || item.xs || 0,
      getTens = (item) => item.total_tens || item.tens || 0,
      getStatus = (item) => item.card_status || item.cardStatus || item.status || 'COMP'
    } = options;

    // Calculate values first (needed for column count determination)
    const eventName = getEventName(item);
    const eventDetails = formatEventDetails(item);
    const statusText = renderStatusText(getStatus(item));
    const total = getTotal(item);
    const avg = getAvg(item);
    const xs = getXs(item);
    const tens = getTens(item);
    
    const listItem = document.createElement('div');
    // Tailwind classes: grid, alignment, background, border, padding, cursor, transitions
    // Responsive: tighter spacing on mobile (gap-1.5, px-2.5, py-2, min-h-[2.75rem]) then normal
    listItem.className = 'grid gap-1.5 items-center bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 px-2.5 py-2 min-h-[2.75rem] min-w-0 transition-all duration-200 sm:gap-2 sm:px-3 sm:py-2.5 sm:min-h-[3rem]';
    
    // Use forced column count if provided, otherwise calculate dynamically
    const forceColumnCount = options.forceColumnCount;
    let columnCount;
    if (forceColumnCount) {
      // Use the forced column count from header
      columnCount = forceColumnCount;
    } else {
      // Count actual columns (event-info, status, total, avg, plus optional xs/tens)
      const hasXs = xs !== '' && xs !== null && xs !== undefined && xs !== 0;
      const hasTens = tens !== '' && tens !== null && tens !== undefined && tens !== 0;
      columnCount = 4 + (hasXs ? 1 : 0) + (hasTens ? 1 : 0);
    }
    
    // Set grid template columns to match header (inline style needed for dynamic columns)
    // Mobile: tighter minmax values, Desktop: normal values (will be overridden by media query if needed)
    if (columnCount === 4) {
      listItem.style.gridTemplateColumns = 'minmax(0, 2fr) minmax(55px, 1fr) minmax(65px, 1fr) minmax(55px, 1fr)';
    } else if (columnCount === 6) {
      listItem.style.gridTemplateColumns = 'minmax(0, 2fr) minmax(55px, 1fr) minmax(65px, 1fr) minmax(55px, 1fr) minmax(35px, 0.5fr) minmax(35px, 0.5fr)';
    }
    listItem.setAttribute('data-columns', columnCount.toString());
    
    if (onItemClick) {
      listItem.className += ' cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600';
      listItem.onclick = () => onItemClick(item, index);
    }

    let innerHTML = '';

    if (showRank) {
      const rank = index + 1;
      const rankColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-orange-600' : 'text-gray-600';
      const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      
      // Responsive font sizes for rank view
      innerHTML = `
        <div class="text-[13px] font-semibold text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-sm ${rankColor}">${rankIcon}</div>
        <div class="flex flex-col gap-0.5 min-w-0 overflow-hidden">
          <div class="text-[13px] font-semibold text-gray-900 dark:text-white overflow-hidden text-ellipsis whitespace-nowrap leading-tight sm:text-sm">${eventName}</div>
          <div class="text-[11px] text-gray-600 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap leading-tight sm:text-xs">${eventDetails}</div>
        </div>
        <div class="text-[13px] font-semibold text-gray-900 dark:text-white text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-sm">${statusText}</div>
        <div class="text-[15px] font-bold text-blue-600 dark:text-blue-400 text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-base">${total}</div>
        <div class="text-[13px] font-semibold text-gray-900 dark:text-white text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-sm">${avg}</div>
        <div class="text-[13px] font-semibold text-gray-900 dark:text-white text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-sm">${xs}</div>
        <div class="text-[13px] font-semibold text-gray-900 dark:text-white text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-sm">${tens}</div>
      `;
    } else {
      // Render columns based on columnCount - always show all columns when specified
      // If 6 columns are specified, always render xs and tens (even if 0)
      const shouldShowXs = columnCount >= 5;
      const shouldShowTens = columnCount >= 6;
      
      const xsDisplayHtml = shouldShowXs 
        ? `<div class="text-[13px] font-semibold text-gray-900 dark:text-white text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-sm">${xs || 0}</div>` 
        : '';
      const tensDisplayHtml = shouldShowTens 
        ? `<div class="text-[13px] font-semibold text-gray-900 dark:text-white text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-sm">${tens || 0}</div>` 
        : '';
      
      // Responsive font sizes: smaller on mobile, normal on desktop
      innerHTML = `
        <div class="flex flex-col gap-0.5 min-w-0 overflow-hidden">
          <div class="text-[13px] font-semibold text-gray-900 dark:text-white overflow-hidden text-ellipsis whitespace-nowrap leading-tight sm:text-sm">${eventName}</div>
          <div class="text-[11px] text-gray-600 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap leading-tight sm:text-xs">${eventDetails}</div>
        </div>
        <div class="text-[13px] font-semibold text-gray-900 dark:text-white text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-sm">${statusText}</div>
        <div class="text-[15px] font-bold text-blue-600 dark:text-blue-400 text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-base">${total}</div>
        <div class="text-[13px] font-semibold text-gray-900 dark:text-white text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-sm">${avg}</div>
        ${xsDisplayHtml}
        ${tensDisplayHtml}
      `;
    }

    listItem.innerHTML = innerHTML;
    return listItem;
  }

  /**
   * Render as HTML string (for cases where you need to set innerHTML)
   */
  function render(items = [], options = {}) {
    const container = create(items, options);
    return container.outerHTML;
  }

  /**
   * Update existing container with new data
   */
  function update(container, items = [], options = {}) {
    // Remove existing items (keep header)
    const header = container.querySelector('.scorecard-list-header');
    container.innerHTML = '';
    if (header) {
      container.appendChild(header);
    }

    // Add new items
    items.forEach((item, index) => {
      const listItem = createItem(item, index, options);
      container.appendChild(listItem);
    });
  }

  // Public API
  return {
    create,
    render,
    update,
    createItem,
    renderStatusText,
    formatEventDetails
  };
})();

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedScorecardList;
}
