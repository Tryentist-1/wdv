// Shared on-screen score keypad for archery score entry.
// Usage:
//   const keypad = ScoreKeypad.init(containerElement, { ...options });
//   document.body.addEventListener('focusin', e => {
//       if (e.target.matches('#scoring-view input[type="text"]')) keypad.showForInput(e.target);
//   });

const ScoreKeypad = (() => {
    const DEFAULTS = {
        inputSelector: '#scoring-view input[type="text"]',
        autoAdvance: true,
        onShow: () => {},
        onHide: () => {},
        onValue: (input, value) => {
            if (!input) return;
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        },
        onClear: (input) => {
            if (!input) return;
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        },
        getInputKey: (input) => {
            if (!input || !input.dataset) return '';
            const d = input.dataset;
            return [
                d.team || '',
                d.archer || '',
                d.end || '',
                d.arrow || ''
            ].join('|');
        }
    };

    function renderLayout(container) {
        if (!container) return;
        container.innerHTML = `
            <div class="grid grid-cols-4 gap-0 w-full">
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="X">X</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="10">10</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="9">9</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-gray-200 dark:bg-gray-200 text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="M">M</button>
                
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-red text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="8">8</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-red text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="7">7</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-blue text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="6">6</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-blue text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="5">5</button>
                
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-black text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="4">4</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-black text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="3">3</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-white text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="2">2</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-white text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 rounded-none" data-value="1">1</button>
                
                <button class="keypad-btn p-4 text-lg font-bold border-r border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 col-span-2 rounded-none" data-action="close">CLOSE</button>
                <button class="keypad-btn p-4 text-lg font-bold cursor-pointer transition-all duration-150 flex items-center justify-center bg-danger-light dark:bg-danger-dark text-danger-dark dark:text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 col-span-2 rounded-none" data-action="clear">CLEAR</button>
            </div>
        `;
    }

    function show(state, input) {
        if (!state || !state.container) return;
        state.currentInput = input;
        state.container.classList.remove('hidden');
        if (typeof state.options.onShow === 'function') {
            state.options.onShow();
        }
    }

    function hide(state) {
        if (!state || !state.container) return;
        if (!state.container.classList.contains('hidden')) {
            state.container.classList.add('hidden');
            if (typeof state.options.onHide === 'function') {
                state.options.onHide();
            }
        }
        state.currentInput = null;
    }

    function advance(state) {
        if (!state || !state.currentInput) {
            hide(state);
            return;
        }
        const selector = state.options.inputSelector;
        if (!selector) return;
        const inputs = Array.from(document.querySelectorAll(selector));
        if (!inputs.length) return;
        const getKey = state.options.getInputKey || DEFAULTS.getInputKey;
        const currentKey = getKey(state.currentInput);
        let nextInput = null;
        if (currentKey) {
            const idx = inputs.findIndex(el => getKey(el) === currentKey);
            if (idx > -1 && idx < inputs.length - 1) {
                nextInput = inputs[idx + 1];
            }
        } else {
            const idx = inputs.indexOf(state.currentInput);
            if (idx > -1 && idx < inputs.length - 1) {
                nextInput = inputs[idx + 1];
            }
        }
        if (nextInput) {
            nextInput.focus();
            state.currentInput = nextInput;
        } else {
            hide(state);
        }
    }

    function handleClick(event, state) {
        const button = event.target.closest('.keypad-btn');
        if (!button || !state) return;
        const action = button.dataset.action;
        const value = button.dataset.value;

        if (action === 'close') {
            hide(state);
            return;
        }

        const input = state.currentInput;
        if (!input) return;

        if (action === 'clear') {
            (state.options.onClear || DEFAULTS.onClear)(input);
            return;
        }

        if (value) {
            (state.options.onValue || DEFAULTS.onValue)(input, value);
            if (state.options.autoAdvance !== false) {
                advance(state);
            }
        }
    }

    function init(container, options = {}) {
        if (!container) return null;
        const mergedOptions = Object.assign({}, DEFAULTS, options);
        const state = {
            container,
            options: mergedOptions,
            currentInput: null
        };
        renderLayout(container);
        container.classList.add('hidden');
        container.addEventListener('click', (e) => handleClick(e, state));

        return {
            showForInput(input) {
                if (!input) return;
                show(state, input);
            },
            hide() {
                hide(state);
            },
            getCurrentInput() {
                return state.currentInput;
            }
        };
    }

    return { init };
})();
