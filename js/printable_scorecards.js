/**
 * Printable Scorecards Module
 * 
 * Generates printable PDF scorecards for ranking rounds.
 * Each scorecard is 5x8 inches, 2 per landscape page.
 * 
 * @param {string} API_BASE - Base URL for API calls
 */

const PrintableScorecards = (() => {
  /**
   * Generate printable PDF scorecards for a ranking round
   * 
   * @param {string} roundId - Round ID
   * @param {string} eventId - Event ID
   * @param {Object} roundData - Round data (division, roundType, event info)
   * @param {string} API_BASE - Base URL for API calls
   * @returns {Promise<void>}
   */
  async function generateScorecardsPDF(roundId, eventId, roundData, API_BASE) {
    // Check for jsPDF library (UMD build exposes as window.jspdf)
    const jsPDFClass = (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) || null;
    if (!jsPDFClass) {
      alert('PDF library not loaded. Please refresh the page.');
      return;
    }

    try {
      // Fetch archers for this round
      const archers = await fetchArchersForRound(roundId, eventId, API_BASE);
      
      if (archers.length === 0) {
        alert('No archers found for this round.');
        return;
      }

      // Create PDF document (landscape, 11x8.5 inches = 792x612 points at 72 DPI)
      const pdf = new jsPDFClass({
        orientation: 'landscape',
        unit: 'in',
        format: [11, 8.5]
      });

      // Card dimensions: 5x8 inches
      const cardWidth = 5;
      const cardHeight = 8;
      const gap = 0.25; // Gap between cards
      
      // Calculate centered positions for 2 cards per page (11 inch wide page)
      const totalWidth = cardWidth * 2 + gap; // Total width of both cards + gap
      const leftMargin = (11 - totalWidth) / 2; // Center the cards
      const cardY = 0.5; // Top margin

      // Calculate positions for 2 cards per page
      const leftCardX = leftMargin;
      const rightCardX = leftMargin + cardWidth + gap;

      let archerIndex = 0;
      let pageNumber = 0;

      while (archerIndex < archers.length) {
        if (pageNumber > 0) {
          pdf.addPage([11, 8.5], 'landscape');
        }

        // Left card
        if (archerIndex < archers.length) {
          await drawScorecard(pdf, archers[archerIndex], roundData, leftCardX, cardY, cardWidth, cardHeight);
          archerIndex++;
        }

        // Right card
        if (archerIndex < archers.length) {
          await drawScorecard(pdf, archers[archerIndex], roundData, rightCardX, cardY, cardWidth, cardHeight);
          archerIndex++;
        }

        pageNumber++;
      }

      // Generate filename
      const eventName = roundData.eventName || 'Event';
      const division = roundData.division || 'DIV';
      const date = roundData.date || new Date().toISOString().slice(0, 10);
      const filename = `scorecards_${eventName.replace(/\s+/g, '_')}_${division}_${date}.pdf`;

      // Save PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error.message);
    }
  }

  /**
   * Fetch archers for a round
   * 
   * @param {string} roundId - Round ID
   * @param {string} eventId - Event ID
   * @param {string} API_BASE - Base URL for API calls
   * @returns {Promise<Array>} Array of archer objects
   */
  async function fetchArchersForRound(roundId, eventId, API_BASE) {
    try {
      // Get event snapshot which includes archers for all rounds
      const response = await fetch(`${API_BASE}/events/${eventId}/snapshot`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Find archers in this round from snapshot
      // API returns { event: {...}, divisions: { "OPEN": { roundId: "...", archers: [...] }, ... } }
      const archers = [];
      if (data.divisions) {
        for (const division of Object.values(data.divisions)) {
          if (division.roundId === roundId && division.archers) {
            // Get archer IDs to fetch photoUrls
            const archerIds = division.archers
              .map(a => a.archerId || a.archer_id)
              .filter(Boolean);
            
            // Fetch photoUrls from master archer list
            let photoUrlMap = {};
            if (archerIds.length > 0) {
              try {
                const archersResponse = await fetch(`${API_BASE}/archers`);
                if (archersResponse.ok) {
                  const archersData = await archersResponse.json();
                  photoUrlMap = {};
                  (archersData.archers || []).forEach(archer => {
                    if (archer.id) {
                      photoUrlMap[archer.id] = archer.photoUrl || null;
                    }
                  });
                }
              } catch (e) {
                console.warn('Could not fetch photoUrls:', e);
              }
            }
            
            for (const archer of division.archers) {
              const archerId = archer.archerId || archer.archer_id;
              archers.push({
                id: archer.roundArcherId || archer.id,
                archerId: archerId,
                firstName: archer.firstName || archer.first_name || '',
                lastName: archer.lastName || archer.last_name || '',
                photoUrl: photoUrlMap[archerId] || null,
                school: archer.school || '',
                level: archer.level || '',
                gender: archer.gender || '',
                bale: archer.bale || archer.baleNumber || archer.bale_number || '',
                target: archer.target || archer.targetAssignment || archer.target_assignment || ''
              });
            }
            break; // Found the division for this round
          }
        }
      }

      // Sort by bale number, then target assignment
      archers.sort((a, b) => {
        const baleA = Number(a.bale) || 999;
        const baleB = Number(b.bale) || 999;
        if (baleA !== baleB) return baleA - baleB;
        return (a.target || '').localeCompare(b.target || '');
      });

      return archers;
    } catch (error) {
      console.error('Error fetching archers:', error);
      throw error;
    }
  }

  /**
   * Draw a single scorecard on the PDF
   * 
   * @param {jsPDF} pdf - jsPDF instance
   * @param {Object} archer - Archer data
   * @param {Object} roundData - Round data
   * @param {number} x - X position in inches
   * @param {number} y - Y position in inches
   * @param {number} width - Card width in inches
   * @param {number} height - Card height in inches
   */
  async function drawScorecard(pdf, archer, roundData, x, y, width, height) {
    const fontSize = 8; // Base font size in points
    const lineHeight = fontSize * 1.2 / 72; // Convert to inches
    const margin = 0.15; // Internal margin
    
    // Header section (top 1.5 inches for avatar and name)
    const headerHeight = 1.5;
    
    // Avatar size: 1.5 inches
    const avatarSize = 1.5;
    const avatarX = x + margin;
    const avatarY = y + margin;
    
    // Draw avatar or initials
    await drawAvatar(pdf, archer, avatarX, avatarY, avatarSize);
    
    // Name (to the right of avatar)
    const nameX = avatarX + avatarSize + 0.1;
    const nameY = y + margin + 0.2;
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.text(`${archer.firstName} ${archer.lastName}`, nameX, nameY, { maxWidth: width - avatarSize - margin * 2 - 0.2 });
    
    // Event info (below name)
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'bold');
    pdf.text(roundData.eventName || 'Event', nameX, nameY + 0.2, { maxWidth: width - avatarSize - margin * 2 - 0.2 });
    
    pdf.setFont(undefined, 'normal');
    const infoLine1 = `${roundData.division || 'DIV'} • Bale ${archer.bale || '?'} • ${formatDate(roundData.date)}`;
    pdf.text(infoLine1, nameX, nameY + 0.4, { maxWidth: width - avatarSize - margin * 2 - 0.2 });
    
    const infoLine2 = `Target ${archer.target || '?'}`;
    pdf.text(infoLine2, nameX, nameY + 0.55, { maxWidth: width - avatarSize - margin * 2 - 0.2 });
    
    // Scorecard grid (below header)
    const gridY = y + headerHeight + 0.1;
    const gridHeight = height - headerHeight - margin - 0.1;
    drawScorecardGrid(pdf, x, gridY, width, gridHeight, margin);
    
    // Draw border around entire card
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.01);
    pdf.rect(x, y, width, height);
  }

  /**
   * Draw avatar or initials
   * 
   * @param {jsPDF} pdf - jsPDF instance
   * @param {Object} archer - Archer data
   * @param {number} x - X position in inches
   * @param {number} y - Y position in inches
   * @param {number} size - Size in inches
   */
  async function drawAvatar(pdf, archer, x, y, size) {
    const initials = `${(archer.firstName || '').charAt(0)}${(archer.lastName || '').charAt(0)}`.toUpperCase() || '??';
    
    if (archer.photoUrl) {
      try {
        // Try to add image (may fail if CORS or image not available)
        const imgData = await loadImageData(archer.photoUrl);
        if (imgData) {
          pdf.addImage(imgData, 'JPEG', x, y, size, size);
          return;
        }
      } catch (error) {
        console.warn('Could not load avatar image:', error);
      }
    }
    
    // Fallback: draw circle with initials
    pdf.setFillColor(200, 200, 200);
    pdf.circle(x + size/2, y + size/2, size/2, 'F');
    pdf.setFillColor(0, 0, 0);
    pdf.setFontSize(size * 0.4);
    pdf.setFont(undefined, 'bold');
    const textWidth = pdf.getTextWidth(initials);
    pdf.text(initials, x + size/2 - textWidth/2, y + size/2 + size * 0.15);
  }

  /**
   * Load image data as base64 (with CORS handling)
   * 
   * @param {string} url - Image URL
   * @returns {Promise<string|null>} Base64 image data or null
   */
  function loadImageData(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch (error) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  /**
   * Draw scorecard grid (10 ends with totals)
   * 
   * @param {jsPDF} pdf - jsPDF instance
   * @param {number} x - X position in inches
   * @param {number} y - Y position in inches
   * @param {number} width - Grid width in inches
   * @param {number} height - Grid height in inches
   * @param {number} margin - Internal margin in inches
   */
  function drawScorecardGrid(pdf, x, y, width, height, margin) {
    const gridX = x + margin;
    const gridY = y;
    const gridWidth = width - margin * 2;
    const gridHeight = height;
    
    // Column widths (proportions) - 8 columns: End, A1, A2, A3, Xs, 10x, Total, Run Total
    const colEnd = 0.3;
    const colA1 = 0.35;
    const colA2 = 0.35;
    const colA3 = 0.35;
    const colXs = 0.3;
    const colTens = 0.3;
    const colTotal = 0.4;
    const colRunTotal = 0.45;
    const totalCols = colEnd + colA1 + colA2 + colA3 + colXs + colTens + colTotal + colRunTotal;
    
    // Calculate actual column widths
    const colWidths = {
      end: (colEnd / totalCols) * gridWidth,
      a1: (colA1 / totalCols) * gridWidth,
      a2: (colA2 / totalCols) * gridWidth,
      a3: (colA3 / totalCols) * gridWidth,
      xs: (colXs / totalCols) * gridWidth,
      tens: (colTens / totalCols) * gridWidth,
      total: (colTotal / totalCols) * gridWidth,
      runTotal: (colRunTotal / totalCols) * gridWidth
    };
    
    // Header row height
    const headerHeight = 0.2;
    // Row height for data rows
    const rowHeight = (gridHeight - headerHeight) / 11; // 10 ends + 1 totals row
    
    // Draw column headers (black background, bold white text)
    pdf.setFontSize(6);
    pdf.setFont(undefined, 'bold');
    
    let currentX = gridX;
    
    // Helper function to draw header cell
    const drawHeaderCell = (text, width) => {
      pdf.setFillColor(0, 0, 0); // Black fill
      pdf.rect(currentX, gridY, width, headerHeight, 'F');
      pdf.setTextColor(255, 255, 255); // White text
      pdf.text(text, currentX + width/2, gridY + headerHeight/2 + 0.02, { align: 'center' });
      currentX += width;
    };
    
    drawHeaderCell('End', colWidths.end);
    drawHeaderCell('A1', colWidths.a1);
    drawHeaderCell('A2', colWidths.a2);
    drawHeaderCell('A3', colWidths.a3);
    drawHeaderCell('Xs', colWidths.xs);
    drawHeaderCell('10x', colWidths.tens);
    drawHeaderCell('Total', colWidths.total);
    drawHeaderCell('Run Total', colWidths.runTotal);
    
    // Draw 10 data rows
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.005);
    
    for (let i = 1; i <= 10; i++) {
      const rowY = gridY + headerHeight + (i - 1) * rowHeight;
      currentX = gridX;
      
      // End number (light grey background, bold black text)
      pdf.setFillColor(220, 220, 220); // Light grey
      pdf.rect(currentX, rowY, colWidths.end, rowHeight, 'F');
      pdf.setFillColor(255, 255, 255); // Reset fill
      pdf.rect(currentX, rowY, colWidths.end, rowHeight, 'S');
      pdf.setFontSize(6);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(String(i), currentX + colWidths.end/2, rowY + rowHeight/2 + 0.01, { align: 'center' });
      currentX += colWidths.end;
      
      // Arrow cells (empty)
      pdf.rect(currentX, rowY, colWidths.a1, rowHeight, 'S');
      currentX += colWidths.a1;
      pdf.rect(currentX, rowY, colWidths.a2, rowHeight, 'S');
      currentX += colWidths.a2;
      pdf.rect(currentX, rowY, colWidths.a3, rowHeight, 'S');
      currentX += colWidths.a3;
      
      // Xs column (empty, no shading)
      pdf.rect(currentX, rowY, colWidths.xs, rowHeight, 'S');
      currentX += colWidths.xs;
      
      // 10x column (empty, no shading)
      pdf.rect(currentX, rowY, colWidths.tens, rowHeight, 'S');
      currentX += colWidths.tens;
      
      // Total column (empty, no shading)
      pdf.rect(currentX, rowY, colWidths.total, rowHeight, 'S');
      currentX += colWidths.total;
      
      // Running total (empty, no shading)
      pdf.rect(currentX, rowY, colWidths.runTotal, rowHeight, 'S');
    }
    
    // Draw totals row (no shading)
    const totalsY = gridY + headerHeight + 10 * rowHeight;
    pdf.setFontSize(6);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    currentX = gridX;
    
    // End number (empty)
    pdf.rect(currentX, totalsY, colWidths.end, rowHeight, 'S');
    currentX += colWidths.end;
    
    // Arrow cells (empty)
    pdf.rect(currentX, totalsY, colWidths.a1, rowHeight, 'S');
    currentX += colWidths.a1;
    pdf.rect(currentX, totalsY, colWidths.a2, rowHeight, 'S');
    currentX += colWidths.a2;
    pdf.rect(currentX, totalsY, colWidths.a3, rowHeight, 'S');
    currentX += colWidths.a3;
    
    // Xs column (empty)
    pdf.rect(currentX, totalsY, colWidths.xs, rowHeight, 'S');
    currentX += colWidths.xs;
    
    // 10x column (empty)
    pdf.rect(currentX, totalsY, colWidths.tens, rowHeight, 'S');
    currentX += colWidths.tens;
    
    // Total label (bold black text)
    pdf.rect(currentX, totalsY, colWidths.total, rowHeight, 'S');
    pdf.text('Total:', currentX + 0.05, totalsY + rowHeight/2 + 0.01);
    currentX += colWidths.total;
    
    // Running total (empty, no shading)
    pdf.rect(currentX, totalsY, colWidths.runTotal, rowHeight, 'S');
    
    // Draw outer border
    pdf.setLineWidth(0.01);
    pdf.rect(gridX, gridY, gridWidth, gridHeight, 'S');
    
    // Draw vertical lines between columns
    currentX = gridX;
    pdf.setLineWidth(0.005);
    for (let i = 0; i <= 8; i++) {
      if (i > 0) {
        pdf.line(currentX, gridY, currentX, gridY + gridHeight);
      }
      if (i === 0) currentX += colWidths.end;
      else if (i === 1) currentX += colWidths.a1;
      else if (i === 2) currentX += colWidths.a2;
      else if (i === 3) currentX += colWidths.a3;
      else if (i === 4) currentX += colWidths.xs;
      else if (i === 5) currentX += colWidths.tens;
      else if (i === 6) currentX += colWidths.total;
      else if (i === 7) currentX += colWidths.runTotal;
    }
  }

  /**
   * Format date string
   * 
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @returns {string} Formatted date
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }

  // Public API
  return {
    generateScorecardsPDF
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.PrintableScorecards = PrintableScorecards;
}
