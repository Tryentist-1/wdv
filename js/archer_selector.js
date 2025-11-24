// Archer Selector Component
// Shared roster selection UI for ranking, solo, and team workflows.
// Provides a configurable set of selection groups (e.g., A1/A2 or Team1/Team2)
// and emits change events whenever the selection state updates.

(function(window) {
    const DEFAULT_GROUPS = [];

    function defaultArcherId(archer = {}) {
        if (!archer) return '';
        if (archer.extId) return String(archer.extId);
        if (archer.id) return String(archer.id);
        const first = (archer.first || archer.firstName || '').trim();
        const last = (archer.last || archer.lastName || '').trim();
        return [first, last].filter(Boolean).join('-').toLowerCase();
    }

    function normalizeArcher(archer = {}, getId = defaultArcherId) {
        const clone = Object.assign({}, archer);
        clone.first = clone.first || clone.firstName || '';
        clone.last = clone.last || clone.lastName || '';
        clone.level = clone.level || clone.division || '';
        clone.school = clone.school || '';
        clone.grade = clone.grade || '';
        clone.extId = clone.extId || clone.extid || '';
        clone.photoUrl = clone.photoUrl || clone.photoURL || clone.photo_url || '';
        clone.fave = !!clone.fave || !!clone.coachFavorite;
        clone.id = clone.id || getId(clone);
        return clone;
    }

    class ArcherSelector {
        constructor(container, options = {}) {
            this.container = container;
            this.options = Object.assign({
                groups: DEFAULT_GROUPS,
                emptyMessage: 'No archers found. Sync your roster to begin.',
                onSelectionChange: null,
                onFavoriteToggle: null,
                getArcherId: defaultArcherId,
                showAvatars: true,
                showFavoriteToggle: true
            }, options);
            this.filter = '';
            this.roster = [];
            this.selection = {};
            this.context = {
                favorites: new Set(),
                selfExtId: ''
            };
            this.options.groups.forEach(group => {
                this.selection[group.id] = Array.isArray(group.initial)
                    ? group.initial.map(item => normalizeArcher(item, this.options.getArcherId))
                    : [];
            });
            this.render();
        }

        setContext(ctx = {}) {
            const next = Object.assign({}, ctx);
            if (Array.isArray(next.favorites)) {
                this.context.favorites = new Set(next.favorites.filter(Boolean));
            } else if (next.favorites instanceof Set) {
                this.context.favorites = new Set(Array.from(next.favorites).filter(Boolean));
            } else {
                this.context.favorites = new Set();
            }
            this.context.selfExtId = next.selfExtId || '';
            this.render();
        }

        setRoster(list = []) {
            this.roster = Array.isArray(list)
                ? list.map(item => normalizeArcher(item, this.options.getArcherId))
                : [];
            this.render();
        }

        setSelection(selectionMap = {}) {
            this.options.groups.forEach(group => {
                const groupSelection = Array.isArray(selectionMap[group.id]) ? selectionMap[group.id] : [];
                const limited = group.max
                    ? groupSelection.slice(0, group.max)
                    : groupSelection.slice();
                this.selection[group.id] = limited.map(item => normalizeArcher(item, this.options.getArcherId));
            });
            this.render();
            this.emitChange();
        }

        getSelection() {
            const snapshot = {};
            this.options.groups.forEach(group => {
                snapshot[group.id] = (this.selection[group.id] || []).map(archer => Object.assign({}, archer));
            });
            return snapshot;
        }

        setFilter(query = '') {
            this.filter = String(query || '').trim().toLowerCase();
            this.render();
        }

        clear() {
            this.options.groups.forEach(group => {
                this.selection[group.id] = [];
            });
            this.render();
            this.emitChange();
        }

        canSelect(groupId) {
            const group = this.options.groups.find(g => g.id === groupId);
            if (!group) return true;
            const max = Number.isFinite(group.max) ? group.max : Infinity;
            return (this.selection[groupId] || []).length < max;
        }

        isSelected(groupId, archerId) {
            return (this.selection[groupId] || []).some(item => item.id === archerId);
        }

        totalSelected(groupId) {
            return (this.selection[groupId] || []).length;
        }

        toggleSelection(groupId, rawArcher) {
            const archer = normalizeArcher(rawArcher, this.options.getArcherId);
            if (!archer.id) return;

            const groupList = this.selection[groupId] || (this.selection[groupId] = []);
            const existingIdx = groupList.findIndex(item => item.id === archer.id);
            if (existingIdx > -1) {
                groupList.splice(existingIdx, 1);
            } else {
                if (!this.canSelect(groupId)) return;
                // Remove from other groups
                this.options.groups.forEach(group => {
                    if (group.id === groupId) return;
                    const otherList = this.selection[group.id];
                    if (!otherList) return;
                    const matchIdx = otherList.findIndex(item => item.id === archer.id);
                    if (matchIdx > -1) {
                        otherList.splice(matchIdx, 1);
                    }
                });
                groupList.push(archer);
            }
            this.render();
            this.emitChange();
        }

        emitChange() {
            if (typeof this.options.onSelectionChange === 'function') {
                this.options.onSelectionChange(this.getSelection());
            }
        }

        getFilteredRoster() {
            if (!this.filter) return this.roster;
            return this.roster.filter(archer => {
                const text = [
                    archer.first,
                    archer.last,
                    archer.nickname,
                    archer.school,
                    archer.level,
                    archer.grade,
                    archer.extId,
                    archer.id
                ].join(' ').toLowerCase();
                return text.includes(this.filter);
            });
        }

        getSelectionPriority(archerId) {
            let priority = null;
            this.options.groups.forEach((group, idx) => {
                const list = this.selection[group.id] || [];
                const foundIdx = list.findIndex(item => item.id === archerId);
                if (foundIdx > -1) {
                    const rank = idx * 10 + foundIdx;
                    priority = priority === null ? rank : Math.min(priority, rank);
                }
            });
            return priority;
        }

        isSelf(archer) {
            const target = this.context.selfExtId || '';
            if (!target) return false;
            const extId = archer.extId || '';
            return target && extId && extId === target;
        }

        isFavorite(archer) {
            const favorites = this.context.favorites || new Set();
            const extId = archer.extId || '';
            if (extId && favorites.size) {
                return favorites.has(extId);
            }
            return !!archer.fave;
        }

        getSortedRoster() {
            const roster = this.getFilteredRoster().slice();
            roster.sort((a, b) => {
                const selA = this.getSelectionPriority(a.id);
                const selB = this.getSelectionPriority(b.id);
                const aSelected = selA !== null;
                const bSelected = selB !== null;
                if (aSelected !== bSelected) return aSelected ? -1 : 1;
                if (aSelected && bSelected && selA !== selB) return selA - selB;

                const aSelf = this.isSelf(a);
                const bSelf = this.isSelf(b);
                if (aSelf !== bSelf) return aSelf ? -1 : 1;

                const aFav = this.isFavorite(a);
                const bFav = this.isFavorite(b);
                if (aFav !== bFav) return aFav ? -1 : 1;

                const nameA = `${a.first} ${a.last}`.trim().toLowerCase();
                const nameB = `${b.first} ${b.last}`.trim().toLowerCase();
                return nameA.localeCompare(nameB);
            });
            return roster;
        }

        createButton(group, archer) {
            const button = document.createElement('button');
            const archerId = archer.id;
            const isSelected = this.isSelected(group.id, archerId);
            const canSelect = isSelected || this.canSelect(group.id);
            const accent = group.accentClass || 'bg-primary text-white';
            const inactiveClass = 'bg-secondary text-white';

            button.type = 'button';
            button.textContent = group.buttonText || group.label;
            button.className = `px-3 py-1 text-sm rounded-lg font-semibold min-h-[44px] transition-colors ${isSelected ? accent : inactiveClass}`;
            if (!canSelect) {
                button.disabled = true;
                button.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                button.addEventListener('click', () => this.toggleSelection(group.id, archer));
                button.classList.add('hover:opacity-80');
            }
            return button;
        }

        createAvatar(archer, isSelf) {
            if (!this.options.showAvatars) return null;
            const wrapper = document.createElement('div');
            // Match test-components.html: bg-primary text-white for initials fallback
            wrapper.className = 'w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold overflow-hidden';
            if (archer.photoUrl) {
                const img = document.createElement('img');
                img.src = archer.photoUrl;
                img.alt = `${archer.first || ''} ${archer.last || ''}`.trim();
                img.className = 'w-full h-full object-cover';
                wrapper.textContent = '';
                wrapper.appendChild(img);
            } else {
                const initials = `${(archer.first || '?').charAt(0)}${(archer.last || '').charAt(0)}`.toUpperCase();
                wrapper.textContent = initials;
            }
            if (isSelf) {
                wrapper.classList.add('ring', 'ring-primary', 'ring-offset-2');
            }
            return wrapper;
        }

        createInfoBlock(archer, isSelf, isFavorite) {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex-1 min-w-0';
            const nameRow = document.createElement('div');
            nameRow.className = 'flex items-center gap-2 text-gray-900 dark:text-white font-semibold truncate';
            const nameText = document.createElement('span');
            nameText.textContent = `${archer.first} ${archer.last}`.trim();
            nameRow.appendChild(nameText);

            if (isSelf) {
                const youBadge = document.createElement('span');
                youBadge.textContent = 'You';
                youBadge.className = 'text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wide';
                nameRow.appendChild(youBadge);
            }

            if (isFavorite && !isSelf) {
                const favBadge = document.createElement('i');
                favBadge.className = 'fas fa-heart text-red-500 text-xs';
                favBadge.title = 'Favorite';
                nameRow.appendChild(favBadge);
            }

            const metaRow = document.createElement('div');
            metaRow.className = 'text-xs text-gray-500 dark:text-gray-400 truncate';
            const school = archer.school || 'No school';
            const level = archer.level || '—';
            metaRow.textContent = `${school} • ${level}`;

            wrapper.appendChild(nameRow);
            wrapper.appendChild(metaRow);
            return wrapper;
        }

        createFavoriteToggle(archer, isSelf, isFavorite) {
            if (!this.options.showFavoriteToggle || !this.options.onFavoriteToggle) return null;
            const btn = document.createElement('button');
            btn.type = 'button';
            // Match test-components.html: text-gray-400 hover:text-red-500, ensure 44px touch target
            btn.className = 'px-2 text-lg min-h-[44px] min-w-[44px] flex items-center justify-center';
            if (isSelf) {
                btn.innerHTML = '<i class="fas fa-user-check text-primary"></i>';
                btn.title = 'This is you';
                btn.disabled = true;
                btn.classList.add('cursor-default');
                return btn;
            }

            btn.innerHTML = isFavorite
                ? '<i class="fas fa-heart text-red-500"></i>'
                : '<i class="far fa-heart text-gray-400"></i>';
            btn.title = isFavorite ? 'Remove favorite' : 'Mark as favorite';
            btn.classList.add('hover:scale-110', 'transition-transform');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.options.onFavoriteToggle(archer);
            });
            return btn;
        }

        isSelectedAnywhere(archerId) {
            return this.options.groups.some(group => this.isSelected(group.id, archerId));
        }

        renderEmptyState() {
            if (!this.container) return;
            this.container.innerHTML = '';
            const empty = document.createElement('div');
            empty.className = 'p-4 text-center text-sm text-gray-500 dark:text-gray-400';
            empty.textContent = this.options.emptyMessage;
            this.container.appendChild(empty);
        }

        render() {
            if (!this.container) return;
            this.container.innerHTML = '';
            const roster = this.getFilteredRoster();
            if (!roster.length) {
                this.renderEmptyState();
                return;
            }
            const sorted = this.getSortedRoster();
            sorted.forEach(archer => {
                const row = document.createElement('div');
                // Match test-components.html standards: bg-gray-50 for normal, primary-light for selected
                const baseClasses = 'flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors';
                row.className = baseClasses;
                const selectedAnywhere = this.isSelectedAnywhere(archer.id);
                if (selectedAnywhere) {
                    // Match test-components.html selected state: bg-primary-light dark:bg-primary/20 border-2 border-primary
                    row.classList.remove('bg-gray-50', 'dark:bg-gray-700');
                    row.classList.add('bg-primary-light', 'dark:bg-primary/20', 'border-2', 'border-primary');
                }

                const isSelf = this.isSelf(archer);
                const isFavorite = this.isFavorite(archer);

                const avatar = this.createAvatar(archer, isSelf);
                if (avatar) row.appendChild(avatar);

                const info = this.createInfoBlock(archer, isSelf, isFavorite);
                row.appendChild(info);

                const favoriteBtn = this.createFavoriteToggle(archer, isSelf, isFavorite);
                if (favoriteBtn) row.appendChild(favoriteBtn);

                const buttons = document.createElement('div');
                buttons.className = 'flex gap-2';
                this.options.groups.forEach(group => {
                    buttons.appendChild(this.createButton(group, archer));
                });
                row.appendChild(buttons);

                this.container.appendChild(row);
            });
        }
    }

    window.ArcherSelector = {
        init(container, options) {
            return new ArcherSelector(container, options);
        }
    };
})(window);
