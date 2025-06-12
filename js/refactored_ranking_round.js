document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    // More code to come

    class RankingRoundApp {
        constructor() {
            this.state = {
                archerCount: 4,
                endCount: 12,
                archers: [],
                scores: [],
                currentArcherIndex: 0,
            };

            this.getDOMElements();
            this.init();
        }

        getDOMElements() {
            this.tabsContainer = document.getElementById('tabs-container');
            this.archerTablesContainer = document.getElementById('archer-tables-container');
            this.totalsContainer = document.getElementById('totals-container');
            this.keypadContainer = document.getElementById('keypad-container');
            this.setupModalContainer = document.getElementById('setup-modal-container');
            this.setupButton = document.getElementById('setup-button');
            this.resetButton = document.getElementById('reset-button');
        }

        init() {
            this.loadState();
            this.render();
            this.attachEventListeners();
            this.keypad = new Keypad(this.keypadContainer, (value) => {
                this.handleScoreChange(
                    this.keypad.currentTarget.dataset.archerIndex,
                    this.keypad.currentTarget.dataset.endIndex,
                    this.keypad.currentTarget.dataset.arrowIndex,
                    value
                );
            });
        }

        initializeAppState() {
            for (let i = 0; i < this.state.archerCount; i++) {
                this.state.archers.push({
                    name: `Archer ${i + 1}`,
                    school: '',
                    gender: 'M',
                    team: 'JV',
                });
                const archerScores = [];
                for (let j = 0; j < this.state.endCount; j++) {
                    archerScores.push(['', '', '']);
                }
                this.state.scores.push(archerScores);
            }
        }

        loadState() {
            const savedState = localStorage.getItem('rankingRoundState');
            if (savedState) {
                this.state = JSON.parse(savedState);
            } else {
                this.initializeAppState();
            }
        }

        saveState() {
            localStorage.setItem('rankingRoundState', JSON.stringify(this.state));
        }

        render() {
            this.renderTabs();
            this.renderArcherTables();
            this.renderTotalsTable();
            this.renderSetupModal();
        }

        renderTabs() {
            this.tabsContainer.innerHTML = '';
            const tabsFragment = document.createDocumentFragment();
            this.state.archers.forEach((archer, index) => {
                const tab = document.createElement('button');
                tab.className = 'btn';
                if (index === this.state.currentArcherIndex) {
                    tab.classList.add('btn-primary');
                } else {
                    tab.classList.add('btn-secondary');
                }
                tab.textContent = archer.name;
                tab.dataset.archerIndex = index;
                tabsFragment.appendChild(tab);
            });
            this.tabsContainer.appendChild(tabsFragment);
        }

        renderArcherTables() {
            this.archerTablesContainer.innerHTML = '';
            const tablesFragment = document.createDocumentFragment();

            this.state.archers.forEach((_, archerIndex) => {
                const tableContainer = document.createElement('div');
                tableContainer.className = 'archer-table-container';
                tableContainer.dataset.archerIndex = archerIndex;
                if (archerIndex !== this.state.currentArcherIndex) {
                    tableContainer.style.display = 'none';
                }

                const table = document.createElement('table');
                table.className = 'score-table';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>End</th>
                            <th>Arrow 1</th>
                            <th>Arrow 2</th>
                            <th>Arrow 3</th>
                            <th>End Total</th>
                            <th>Total</th>
                            <th>10s</th>
                            <th>Xs</th>
                        </tr>
                    </thead>
                `;

                const tbody = document.createElement('tbody');
                this.state.scores[archerIndex].forEach((endScores, endIndex) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${endIndex + 1}</td>
                        <td><input type="text" class="score-input" value="${endScores[0]}" data-archer-index="${archerIndex}" data-end-index="${endIndex}" data-arrow-index="0"></td>
                        <td><input type="text" class="score-input" value="${endScores[1]}" data-archer-index="${archerIndex}" data-end-index="${endIndex}" data-arrow-index="1"></td>
                        <td><input type="text" class="score-input" value="${endScores[2]}" data-archer-index="${archerIndex}" data-end-index="${endIndex}" data-arrow-index="2"></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    `;
                    tbody.appendChild(row);
                });

                table.appendChild(tbody);
                tableContainer.appendChild(table);
                tablesFragment.appendChild(tableContainer);
            });

            this.archerTablesContainer.appendChild(tablesFragment);
        }

        renderTotalsTable() {
            this.totalsContainer.innerHTML = '';
            const table = document.createElement('table');
            table.className = 'score-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Archer</th>
                        <th>Score</th>
                        <th>10s</th>
                        <th>Xs</th>
                    </tr>
                </thead>
            `;

            const tbody = document.createElement('tbody');
            this.state.archers.forEach((archer, archerIndex) => {
                const totals = this.calculateTotals(archerIndex);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${archer.name}</td>
                    <td>${totals.score}</td>
                    <td>${totals.tens}</td>
                    <td>${totals.xs}</td>
                `;
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            this.totalsContainer.appendChild(table);
        }

        attachEventListeners() {
            this.tabsContainer.addEventListener('click', (event) => {
                if (event.target.matches('[data-archer-index]')) {
                    const archerIndex = parseInt(event.target.dataset.archerIndex, 10);
                    this.handleTabClick(archerIndex);
                }
            });

            this.archerTablesContainer.addEventListener('input', (event) => {
                if (event.target.matches('.score-input')) {
                    const archerIndex = parseInt(event.target.dataset.archerIndex, 10);
                    const endIndex = parseInt(event.target.dataset.endIndex, 10);
                    const arrowIndex = parseInt(event.target.dataset.arrowIndex, 10);
                    const value = event.target.value;
                    this.handleScoreChange(archerIndex, endIndex, arrowIndex, value);
                }
            });

            this.archerTablesContainer.addEventListener('focusin', (event) => {
                if (event.target.matches('.score-input')) {
                    this.keypad.open(event.target);
                }
            });

            this.setupButton.addEventListener('click', () => {
                this.setupModal.open();
            });
        }

        handleTabClick(archerIndex) {
            this.state.currentArcherIndex = archerIndex;
            this.renderTabs();
            
            const archerTableContainers = this.archerTablesContainer.querySelectorAll('.archer-table-container');
            archerTableContainers.forEach(container => {
                if (parseInt(container.dataset.archerIndex, 10) === archerIndex) {
                    container.style.display = 'block';
                } else {
                    container.style.display = 'none';
                }
            });
        }

        handleScoreChange(archerIndex, endIndex, arrowIndex, value) {
            this.state.scores[archerIndex][endIndex][arrowIndex] = value;
            this.updateEndScores(archerIndex, endIndex);
            this.renderTotalsTable();
            this.saveState();
        }

        updateEndScores(archerIndex, endIndex) {
            const endScores = this.state.scores[archerIndex][endIndex];
            const endTotal = this.calculateEndTotal(endScores);
            
            const table = this.archerTablesContainer.querySelector(`[data-archer-index="${archerIndex}"] table`);
            const row = table.rows[endIndex + 1];

            row.cells[4].textContent = endTotal.total;
            row.cells[6].textContent = endTotal.tens;
            row.cells[7].textContent = endTotal.xs;
            
            this.updateRunningTotal(archerIndex);
        }

        updateRunningTotal(archerIndex) {
            const table = this.archerTablesContainer.querySelector(`[data-archer-index="${archerIndex}"] table`);
            let runningTotal = 0;
            for (let i = 0; i < this.state.endCount; i++) {
                const endScores = this.state.scores[archerIndex][i];
                const endTotal = this.calculateEndTotal(endScores);
                runningTotal += endTotal.total;
                table.rows[i + 1].cells[5].textContent = runningTotal;
            }
        }
        
        calculateEndTotal(endScores) {
            let total = 0;
            let tens = 0;
            let xs = 0;

            endScores.forEach(arrowScore => {
                if (arrowScore.toUpperCase() === 'X') {
                    total += 10;
                    tens++;
                    xs++;
                } else if (arrowScore.toUpperCase() === 'M') {
                    total += 0;
                } else if (arrowScore !== '') {
                    const value = parseInt(arrowScore, 10);
                    if (!isNaN(value)) {
                        total += value;
                        if (value === 10) {
                            tens++;
                        }
                    }
                }
            });

            return { total, tens, xs };
        }

        calculateTotals(archerIndex) {
            let score = 0;
            let tens = 0;
            let xs = 0;

            this.state.scores[archerIndex].forEach(endScores => {
                endScores.forEach(arrowScore => {
                    if (arrowScore.toUpperCase() === 'X') {
                        score += 10;
                        tens++;
                        xs++;
                    } else if (arrowScore.toUpperCase() === 'M') {
                        score += 0;
                    } else if (arrowScore !== '') {
                        const value = parseInt(arrowScore, 10);
                        if (!isNaN(value)) {
                            score += value;
                            if (value === 10) {
                                tens++;
                            }
                        }
                    }
                });
            });

            return { score, tens, xs };
        }

        renderSetupModal() {
            this.setupModal = new SetupModal(this.setupModalContainer, this.state.archers, (updatedArchers) => {
                this.state.archers = updatedArchers;
                this.render();
                this.saveState();
            });
        }
    }

    class SetupModal {
        constructor(container, archers, onSave) {
            this.container = container;
            this.archers = archers;
            this.onSave = onSave;
            this.render();
        }

        render() {
            this.container.innerHTML = `
                <div class="modal" id="setup-modal" style="display: none;">
                    <div class="modal-content">
                        <h2>Setup Archers</h2>
                        <div id="setup-form"></div>
                        <button id="save-setup" class="btn btn-primary">Save</button>
                        <button id="cancel-setup" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>
            `;
            this.modalElement = document.getElementById('setup-modal');
            this.setupForm = document.getElementById('setup-form');
            this.saveButton = document.getElementById('save-setup');
            this.cancelButton = document.getElementById('cancel-setup');

            this.renderForm();
            this.attachEventListeners();
        }

        renderForm() {
            this.setupForm.innerHTML = '';
            this.archers.forEach((archer, index) => {
                const archerFormGroup = document.createElement('div');
                archerFormGroup.className = 'form-group';
                archerFormGroup.innerHTML = `
                    <label for="archer-name-${index}">Archer ${index + 1} Name</label>
                    <input type="text" id="archer-name-${index}" value="${archer.name}">
                `;
                this.setupForm.appendChild(archerFormGroup);
            });
        }

        attachEventListeners() {
            this.saveButton.addEventListener('click', () => this.save());
            this.cancelButton.addEventListener('click', () => this.close());
        }

        open() {
            this.modalElement.style.display = 'block';
        }

        close() {
            this.modalElement.style.display = 'none';
        }

        save() {
            const updatedArchers = [];
            this.archers.forEach((_, index) => {
                const nameInput = document.getElementById(`archer-name-${index}`);
                updatedArchers.push({
                    ...this.archers[index],
                    name: nameInput.value,
                });
            });
            this.onSave(updatedArchers);
            this.close();
        }
    }

    class Keypad {
        constructor(container, onKeyPress) {
            this.container = container;
            this.onKeyPress = onKeyPress;
            this.render();
        }

        render() {
            this.container.innerHTML = `
                <div id="score-keypad" style="display: none;">
                    <button type="button" data-value="X">X</button>
                    <button type="button" data-value="10">10</button>
                    <button type="button" data-value="9">9</button>
                    <button type="button" data-action="next" class="keypad-action-next" title="Next Field">➡️</button>
                    <button type="button" data-value="8">8</button>
                    <button type="button" data-value="7">7</button>
                    <button type="button" data-value="6">6</button>
                    <button type="button" data-action="back" class="keypad-action-back" title="Previous Field">⬅️</button>
                    <button type="button" data-value="5">5</button>
                    <button type="button" data-value="4">4</button>
                    <button type="button" data-value="3">3</button>
                    <button type="button" data-action="clear" class="keypad-action" title="Clear Field">Clear</button>
                    <button type="button" data-value="2">2</button>
                    <button type="button" data-value="1">1</button>
                    <button type="button" data-value="M">M</button>
                    <button type="button" data-action="close" class="keypad-action-close" title="Close Keypad">Close</button>
                </div>
            `;
            this.keypadElement = document.getElementById('score-keypad');
            this.attachEventListeners();
        }

        attachEventListeners() {
            this.keypadElement.addEventListener('click', (event) => {
                const target = event.target;
                if (target.matches('button')) {
                    const value = target.dataset.value;
                    const action = target.dataset.action;

                    if (value) {
                        this.onKeyPress(value);
                        this.currentTarget.value = value;
                    } else if (action) {
                        this.handleAction(action);
                    }
                }
            });
        }

        handleAction(action) {
            switch (action) {
                case 'close':
                    this.close();
                    break;
                case 'clear':
                    this.onKeyPress('');
                    this.currentTarget.value = '';
                    break;
                case 'next':
                    this.focusNext();
                    break;
                case 'back':
                    this.focusPrevious();
                    break;
            }
        }

        open(target) {
            this.currentTarget = target;
            this.keypadElement.style.display = 'grid';
        }

        close() {
            this.currentTarget = null;
            this.keypadElement.style.display = 'none';
        }

        focusNext() {
            const inputs = Array.from(document.querySelectorAll('.score-input'));
            const currentIndex = inputs.indexOf(this.currentTarget);
            const nextIndex = (currentIndex + 1) % inputs.length;
            inputs[nextIndex].focus();
        }

        focusPrevious() {
            const inputs = Array.from(document.querySelectorAll('.score-input'));
            const currentIndex = inputs.indexOf(this.currentTarget);
            const previousIndex = (currentIndex - 1 + inputs.length) % inputs.length;
            inputs[previousIndex].focus();
        }
    }

    new RankingRoundApp();
}); 