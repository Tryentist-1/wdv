/**
 * Live Action HUD Beta
 * Handles pulling live matches from the backend, filtering, and rendering the HUD cards.
 */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port || '8001'}/api/index.php/v1`
    : 'https://archery.tryentist.com/api/v1';

class LiveActionHUD {
    constructor() {
        this.eventId = null;
        this.matches = []; // Standardized array of match objects
        this.overviewData = null; // Basic event context
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.refreshInterval = null;
        this.isFetching = false;
        this.lastRefreshTime = null;

        // DOM Elements
        this.els = {
            eventName: document.getElementById('event-name'),
            eventDate: document.getElementById('event-date'),
            eventStatus: document.getElementById('event-status'),
            hudGrid: document.getElementById('hud-grid'),
            emptyState: document.getElementById('empty-state'),
            searchInput: document.getElementById('hud-search'),
            clearSearchBtn: document.getElementById('clear-search'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            lastUpdated: document.getElementById('last-updated'),
            refreshSpinner: document.getElementById('refresh-spinner'),
            refreshText: document.getElementById('refresh-text')
        };

        this.init();
    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.eventId = urlParams.get('event');

        if (!this.eventId) {
            this.els.eventName.textContent = "Error: No Event Selected";
            this.els.hudGrid.innerHTML = '';
            return;
        }

        this.setupEventListeners();
        await this.fetchEventOverview();
        await this.refreshData();

        // Start 15s polling
        this.refreshInterval = setInterval(() => this.refreshData(), 15000);
    }

    setupEventListeners() {
        // Search input with debounce
        let timeout;
        this.els.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase().trim();

            if (this.searchTerm.length > 0) {
                this.els.clearSearchBtn.classList.remove('hidden');
            } else {
                this.els.clearSearchBtn.classList.add('hidden');
            }

            clearTimeout(timeout);
            timeout = setTimeout(() => this.renderGrid(), 300);
        });

        // Clear search
        this.els.clearSearchBtn.addEventListener('click', () => {
            this.els.searchInput.value = '';
            this.searchTerm = '';
            this.els.clearSearchBtn.classList.add('hidden');
            this.renderGrid();
        });

        // Quick Filters
        this.els.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update styling
                this.els.filterBtns.forEach(b => {
                    b.classList.remove('bg-primary', 'text-white', 'border-primary');
                    b.classList.add('bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300', 'border-gray-300', 'dark:border-gray-600');
                });
                const targetBtn = e.target.closest('.filter-btn');
                targetBtn.classList.remove('bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300', 'border-gray-300', 'dark:border-gray-600');
                targetBtn.classList.add('bg-primary', 'text-white', 'border-primary');

                // Set filter and render
                this.currentFilter = targetBtn.dataset.filter;
                this.renderGrid();
            });
        });
    }

    setLoadingState(isLoading) {
        if (isLoading) {
            this.els.refreshSpinner.classList.remove('hidden');
            this.els.refreshText.textContent = this.lastRefreshTime ? 'Syncing...' : 'Connecting...';
        } else {
            this.els.refreshSpinner.classList.add('hidden');
            this.els.refreshText.textContent = 'Live';
            this.els.refreshText.parentElement.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300');
            this.els.refreshText.parentElement.classList.add('bg-green-100', 'dark:bg-green-900', 'text-green-800', 'dark:text-green-200');

            const now = new Date();
            this.lastRefreshTime = now;
            this.els.lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        }
    }

    async fetchEventOverview() {
        try {
            const response = await fetch(`${API_BASE}/events/${this.eventId}/snapshot`);
            if (!response.ok) throw new Error('Failed to fetch event details');
            this.overviewData = await response.json();

            // Render header
            this.els.eventName.textContent = this.overviewData.event.name;
            const dateObj = new Date(this.overviewData.event.date + 'T00:00:00');
            this.els.eventDate.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            const statusClass = this.overviewData.event.status === 'ACTIVE' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400';
            this.els.eventStatus.innerHTML = `<span class="${statusClass}">${this.overviewData.event.status}</span>`;

        } catch (e) {
            console.error(e);
            this.els.eventName.textContent = "Event Not Found";
        }
    }

    async refreshData(manualClick = false) {
        if (this.isFetching) return;
        this.isFetching = true;

        if (manualClick) {
            const btn = document.querySelector('footer button');
            const icon = btn.querySelector('.fa-sync-alt');
            icon.classList.add('fa-spin');
            setTimeout(() => icon.classList.remove('fa-spin'), 1000);
        }

        this.setLoadingState(true);

        try {
            // Fetch both Solo and Team matches in parallel
            const [soloRes, teamRes] = await Promise.all([
                fetch(`${API_BASE}/events/${this.eventId}/solo-matches`),
                fetch(`${API_BASE}/events/${this.eventId}/team-matches`)
            ]);

            const [soloData, teamData] = await Promise.all([
                soloRes.ok ? soloRes.json() : { matches: [] },
                teamRes.ok ? teamRes.json() : { matches: [] }
            ]);

            this.processMatches(soloData.matches || [], teamData.matches || []);
            this.renderGrid();

        } catch (e) {
            console.error("Error fetching match data:", e);
            this.els.refreshText.textContent = "Offline";
            this.els.refreshText.parentElement.className = "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
        } finally {
            this.isFetching = false;
            this.setLoadingState(false);
        }
    }

    processMatches(soloMatches, teamMatches) {
        this.matches = [];

        // Format Solo Matches
        soloMatches.forEach(m => {
            // Exclude matches without archers or invalid status
            if (!m.archer1 || !m.archer2) return;
            if (m.status === 'VOID' || m.card_status === 'VOID') return;
            if (!m.bale_number || m.bale_number == 0) return; // HUD needs bales to place them physically

            this.matches.push({
                id: m.id,
                type: 'SOLO',
                baleNumber: m.bale_number,
                status: m.status, // OPEN, PENDING, COMPLETED
                cardStatus: m.card_status, // PEND, VER, COMP
                bracketName: m.bracket_name || 'Solo Match',
                division: m.division || '',
                format: m.format, // ELIMINATION vs SWISS
                sideA: {
                    name: m.archer1.archer_name || 'TBD',
                    school: m.archer1.school || '',
                    seed: m.archer1.target_assignment || '-', // Sometimes target assignment is the seed in early API formats
                    setPoints: m.archer1.sets_won || 0 // Assuming the API output format
                },
                sideB: {
                    name: m.archer2.archer_name || 'TBD',
                    school: m.archer2.school || '',
                    seed: m.archer2.target_assignment || '-',
                    setPoints: m.archer2.sets_won || 0
                },
                rawMatch: m
            });
        });

        // Format Team Matches
        teamMatches.forEach(m => {
            if (!m.team1 || !m.team2) return;
            if (m.status === 'VOID' || m.card_status === 'VOID') return;
            if (!m.bale_number || m.bale_number == 0) return;

            this.matches.push({
                id: m.id,
                type: 'TEAM',
                baleNumber: m.bale_number,
                status: m.status,
                cardStatus: m.card_status,
                bracketName: m.bracket_name || 'Team Match',
                division: m.division || '',
                format: m.format,
                sideA: {
                    name: m.team1.team_name || 'TBD',
                    school: m.team1.school || '',
                    roster: (m.team1.archers || []).map(a => a.archer_name).join(', '),
                    seed: '-',
                    setPoints: m.team1.sets_won || 0
                },
                sideB: {
                    name: m.team2.team_name || 'TBD',
                    school: m.team2.school || '',
                    roster: (m.team2.archers || []).map(a => a.archer_name).join(', '),
                    seed: '-',
                    setPoints: m.team2.sets_won || 0
                },
                rawMatch: m
            });
        });

        // Sort by Bale Number (numerical)
        this.matches.sort((a, b) => {
            const bA = parseInt(a.baleNumber) || 999;
            const bB = parseInt(b.baleNumber) || 999;
            return bA - bB;
        });
    }

    getDerivedState(match) {
        const cardStatus = (match.cardStatus || '').toUpperCase();

        if (cardStatus === 'VER' || cardStatus === 'VRFD') {
            return { state: 'VERIFIED', class: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', text: 'Verified', liveRing: false };
        }
        if (cardStatus === 'COMP') {
            return { state: 'COMPLETED', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', text: 'Completed', liveRing: false };
        }

        // Determine if it's currently live (has some scores but isn't complete)
        const isLive = (match.sideA.setPoints > 0 || match.sideB.setPoints > 0);

        if (isLive) {
            return { state: 'LIVE', class: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700/50', text: 'Live Action', liveRing: true };
        }

        return { state: 'PENDING', class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', text: 'Pending', liveRing: false };
    }

    filterMatches() {
        return this.matches.filter(m => {
            // 1. Text Search Filter (OR logic for multiple terms)
            if (this.searchTerm) {
                // Remove commas from the search string before matching, so OR terms match cleanly even if a comma follows an archer's name
                const searchString = `${m.baleNumber} ${m.sideA.name} ${m.sideA.school} ${m.sideA.roster || ''} ${m.sideB.name} ${m.sideB.school} ${m.sideB.roster || ''} ${m.bracketName} ${m.division}`.toLowerCase().replace(/,/g, '');
                const searchTerms = this.searchTerm.split(' ').filter(term => term.length > 0);

                // At least one term must be included in the search string (OR logic)
                const isMatch = searchTerms.some(term => searchString.includes(term));
                if (!isMatch) return false;
            }

            // 2. State Quick Filters
            if (this.currentFilter !== 'all') {
                const derived = this.getDerivedState(m);
                if (this.currentFilter === 'live' && derived.state !== 'LIVE') return false;
                if (this.currentFilter === 'pending' && derived.state !== 'PENDING') return false;
                if (this.currentFilter === 'completed' && (derived.state !== 'COMPLETED' && derived.state !== 'VERIFIED')) return false;
            }

            return true;
        });
    }

    renderGrid() {
        const filteredMatches = this.filterMatches();

        if (filteredMatches.length === 0) {
            this.els.hudGrid.innerHTML = '';
            this.els.emptyState.classList.remove('hidden');
            return;
        }

        this.els.emptyState.classList.add('hidden');
        let html = '';

        filteredMatches.forEach(m => {
            const stateObj = this.getDerivedState(m);

            const cardUrl = m.type === 'SOLO' ? `solo_card.html?match=${m.id}` : `team_card.html?match=${m.id}`;

            html += `
        <a href="${cardUrl}" target="_blank" class="hud-card block bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full cursor-pointer transition-shadow">
            
            <!-- Card Header: Bale & Context -->
            <div class="${stateObj.class} px-4 py-2 flex justify-between items-center border-b border-gray-100 dark:border-gray-700/50 transition-colors">
                <div class="font-bold text-lg flex items-center gap-2">
                    ${stateObj.liveRing ? '<span class="status-live-dot"></span>' : ''}
                    Bale ${m.baleNumber}
                </div>
                <div class="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                    ${stateObj.text}
                </div>
            </div>

            <!-- Context Subheader -->
            <div class="px-4 py-2 bg-gray-50/50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/50 truncate">
                <i class="fas ${m.type === 'SOLO' ? 'fa-user' : 'fa-users'} mr-1"></i>
                ${m.bracketName}
            </div>

            <!-- Card Body: Matchup -->
            <div class="p-4 flex-1 flex flex-col justify-center gap-3 relative">
                
                ${stateObj.state === 'VERIFIED' ? '<div class="absolute inset-0 bg-green-500/5 dark:bg-green-500/10 pointer-events-none"></div>' : ''}

                <!-- Side A -->
                <div class="flex justify-between items-center z-10">
                    <div class="flex-1 min-w-0 pr-2">
                        <div class="font-bold text-gray-900 dark:text-white truncate text-lg" title="${m.sideA.name}">${m.sideA.name}</div>
                        ${m.type === 'SOLO' ? `<div class="text-xs text-gray-400 dark:text-gray-500">TGT ${m.baleNumber}-A</div>` : `<div class="text-[11px] leading-tight text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5" title="${m.sideA.roster}">${m.sideA.roster || ''}</div>`}
                    </div>
                    <div class="flex-shrink-0 text-2xl font-black ${m.sideA.setPoints > m.sideB.setPoints ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}">
                        ${m.sideA.setPoints}
                    </div>
                </div>

                <div class="w-full text-center text-xs text-gray-300 dark:text-gray-600 font-bold uppercase tracking-widest border-t border-b border-gray-100 dark:border-gray-700/50 py-1 z-10">
                    Set Points
                </div>

                <!-- Side B -->
                <div class="flex justify-between items-center z-10">
                    <div class="flex-1 min-w-0 pr-2">
                        <div class="font-bold text-gray-900 dark:text-white truncate text-lg" title="${m.sideB.name}">${m.sideB.name}</div>
                        ${m.type === 'SOLO' ? `<div class="text-xs text-gray-400 dark:text-gray-500">TGT ${m.baleNumber}-B</div>` : `<div class="text-[11px] leading-tight text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5" title="${m.sideB.roster}">${m.sideB.roster || ''}</div>`}
                    </div>
                    <div class="flex-shrink-0 text-2xl font-black ${m.sideB.setPoints > m.sideA.setPoints ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}">
                        ${m.sideB.setPoints}
                    </div>
                </div>

            </div>
        </a>
      `;
        });

        this.els.hudGrid.innerHTML = html;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.hudApp = new LiveActionHUD();
});
