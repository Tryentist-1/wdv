// This file will contain all the QUnit test suites for our modernized applications.
// We will add tests for:
// 1. Archer Module

const ArcherModule = require('../js/archer_module.js');
const { parseScoreValue } = require('../js/common.js');
// 2. Ranking Round
// 3. Solo Card
// 4. Team Card
/* */
describe('Getting Started', function() {
  QUnit.test('tests are running', function(assert) {
    assert.ok(true, 'QUnit is set up and tests are running.');
  });
});

QUnit.module('ArcherModule', function(hooks) {
    const testListName = 'testArcherList';
    // We will need to mock ArcherModule and localStorage for these tests in Jest

    const sampleArcher1 = { first: 'John', last: 'Doe', school: 'TestU', grade: '10', gender: 'M', level: 'VAR', fave: false };
    const sampleArcher2 = { first: 'Jane', last: 'Smith', school: 'TestU', grade: '11', gender: 'F', level: 'JV', fave: true };

    // Before each test, clear the test list in localStorage
    hooks.beforeEach(function() {
        // localStorage.removeItem(testListName); // Mock localStorage instead
        // Temporarily override the default list name for testing purposes
        // ArcherModule.listName = testListName; // Mock ArcherModule
    });
    // After all tests, restore the original list name
    // After all tests, restore the original list name
    hooks.after(function() {
        ArcherModule.listName = 'archerList'; // Restore default
    });

    QUnit.test('should be empty initially', function(assert) {
        const list = ArcherModule.loadList();
        assert.deepEqual(list, [], 'List is initially empty');
    });

    QUnit.test('should add an archer', function(assert) {
        ArcherModule.addArcher(sampleArcher1);
        const list = ArcherModule.loadList();
        assert.equal(list.length, 1, 'List has one archer after adding');
        assert.deepEqual(list[0], sampleArcher1, 'Added archer data is correct');
    });

    QUnit.test('should add multiple archers', function(assert) {
        ArcherModule.addArcher(sampleArcher1);
        ArcherModule.addArcher(sampleArcher2);
        const list = ArcherModule.loadList();
        assert.equal(list.length, 2, 'List has two archers');
    });

    QUnit.test('should edit an archer', function(assert) {
        ArcherModule.addArcher(sampleArcher1);
        const updatedArcher = { ...sampleArcher1, school: 'NewSchool' };
        ArcherModule.editArcher(0, updatedArcher);
        const list = ArcherModule.loadList();
        assert.equal(list[0].school, 'NewSchool', 'Archer school was updated');
    });

    QUnit.test('should delete an archer', function(assert) {
        ArcherModule.addArcher(sampleArcher1);
        ArcherModule.addArcher(sampleArcher2);
        ArcherModule.deleteArcher(0);
        const list = ArcherModule.loadList();
        assert.equal(list.length, 1, 'List has one archer after deletion');
        assert.deepEqual(list[0], sampleArcher2, 'The correct archer was deleted');
    });

    QUnit.test('should clear the list', function(assert) {
        ArcherModule.addArcher(sampleArcher1);
        ArcherModule.addArcher(sampleArcher2);
        ArcherModule.clearList();
        const list = ArcherModule.loadList();
        assert.deepEqual(list, [], 'List is empty after clearing');
    });

    QUnit.test('should get an archer by ID', function(assert) {
        ArcherModule.addArcher(sampleArcher1);
        ArcherModule.addArcher(sampleArcher2);
        const archerId = `${sampleArcher2.first}-${sampleArcher2.last}`;
        const foundArcher = ArcherModule.getArcherById(archerId);
        assert.deepEqual(foundArcher, sampleArcher2, 'Correct archer is found by ID');
    });

    QUnit.test('should return null if archer ID not found', function(assert) {
        ArcherModule.addArcher(sampleArcher1);
        const foundArcher = ArcherModule.getArcherById('Non-Existent-ID');
        assert.equal(foundArcher, null, 'Returns null for a non-existent ID');
    });
});

describe('Ranking Round Logic', function() {
    // The parseScoreValue function is now globally available from js/common.js
    // We will need to import or mock it for Jest.

    test('parseScoreValue handles various inputs', function() {
        // Since parseScoreValue is tested in tests/test.js,
        // we can keep a minimal check here or remove if redundant.
        // For now, let's keep a basic check using Jest's expect syntax.
        expect(parseScoreValue('X')).toBe(10);
        expect(parseScoreValue('10')).toBe(10);
        expect(parseScoreValue('M')).toBe(0);
    });
});

describe('Solo Card Logic', function() {
    // The parseScoreValue function is now globally available from js/common.js
    // We will need to import or mock it for Jest.

    test('End winner and set points', function() {
        // We will need to ensure parseScoreValue is available.
        const scoresA1 = ['9', '9', '8']; // Total 26
        const scoresA2 = ['8', '8', '7']; // Total 23
        const totalA1 = scoresA1.reduce((sum, s) => sum + parseScoreValue(s), 0);
        const totalA2 = scoresA2.reduce((sum, s) => sum + parseScoreValue(s), 0);

        let setPointsA1 = 0, setPointsA2 = 0;
        if (totalA1 > totalA2) setPointsA1 = 2;
        else if (totalA2 > totalA1) setPointsA2 = 2;
        else { setPointsA1 = 1; setPointsA2 = 1; }

        expect(setPointsA1).toBe(2);
        expect(setPointsA2).toBe(0);
    });

    test('Tied end and set points', function() {
        // We will need to ensure parseScoreValue is available.
        const scoresA1 = ['10', '9', '8']; // Total 27
        const scoresA2 = ['X', '9', '8']; // Total 27
        const totalA1 = scoresA1.reduce((sum, s) => sum + parseScoreValue(s), 0);
        const totalA2 = scoresA2.reduce((sum, s) => sum + parseScoreValue(s), 0);

        let setPointsA1 = 0, setPointsA2 = 0;
        if (totalA1 > totalA2) { setPointsA1 = 2; }
        else if (totalA2 > totalA1) { setPointsA2 = 2; }
        else { setPointsA1 = 1; setPointsA2 = 1; }

        expect(setPointsA1).toBe(1);
        expect(setPointsA2).toBe(1);
    });

    test('Shoot-off logic uses parseScoreValue correctly', function() {
        // This test is partially redundant with tests/test.js but
        // confirms usage within this module's context.
        expect(parseScoreValue('X')).toBe(10);
        expect(parseScoreValue('10')).toBe(10);
        expect(parseScoreValue('10')).toBeGreaterThan(parseScoreValue('9'));
        expect(parseScoreValue('M')).not.toBeGreaterThan(parseScoreValue('1'));
    });
});

describe('Team Card Logic', function() {
    // This helper gives 'X' a higher value for sorting/comparison in tie-breaks,
    // without affecting its score value of 10.
    function getArrowValueForTiebreak(score) {
        const upperScore = String(score).toUpperCase().trim();
        if (upperScore === 'X') return 10.1;
        // We will need to ensure parseScoreValue is available.
        return parseScoreValue(score);
    }

    // Test for shoot-off with highest arrow tie-breaker
    test('Shoot-off with totals tied, won by highest arrow (X vs 10)', function() {
        const soT1 = ['X', '8']; // Total 18
        const soT2 = ['9', '9']; // Total 18
        // We will need to ensure parseScoreValue is available.
        const t1SoTotal = soT1.reduce((sum, s) => sum + parseScoreValue(s), 0);
        const t2SoTotal = soT2.reduce((sum, s) => sum + parseScoreValue(s), 0);

        expect(t1SoTotal).toBe(t2SoTotal);

        let winner = null;
        if (t1SoTotal > t2SoTotal) {
            winner = 't1';
        } else if (t2SoTotal > t1SoTotal) {
            winner = 't2';
        } else {
            // Totals are tied, check for highest arrow using the tiebreak helper.
            // We will need to ensure getArrowValueForTiebreak is available.
            const t1Max = Math.max(...soT1.map(s => getArrowValueForTiebreak(s)));
            const t2Max = Math.max(...soT2.map(s => getArrowValueForTiebreak(s)));

            if (t1Max > t2Max) {
                winner = 't1';
            } else if (t2Max > t1Max) {
                winner = 't2';
            } else {
                winner = 'judge_call'; // Truly tied
            }
        }
        
        expect(winner).toBe('t1');
    });

    test('Shoot-off with totals tied, won by highest arrow (10 vs 9)', function() {
        const soT1 = ['10', '8']; // Total 18
        const soT2 = ['9', '9']; // Total 18
        // We will need to ensure parseScoreValue is available.
        const t1SoTotal = soT1.reduce((sum, s) => sum + parseScoreValue(s), 0);
        const t2SoTotal = soT2.reduce((sum, s) => sum + parseScoreValue(s), 0);

        expect(t1SoTotal).toBe(t2SoTotal);

        let winner = null;
        if (t1SoTotal > t2SoTotal) {
            winner = 't1'; // This branch won't be hit in this test case
        } else if (t2SoTotal > t1SoTotal) {
            winner = 't2';
        } else {
            const t1Max = Math.max(...soT1.map(s => getArrowValueForTiebreak(s)));
            const t2Max = Math.max(...soT2.map(s => getArrowValueForTiebreak(s)));

            if (t1Max > t2Max) winner = 't1';
            else if (t2Max > t1Max) winner = 't2';
            else winner = 'judge_call';
        }

        expect(winner).toBe('t1');
    });

    test('Shoot-off with totals and highest arrows tied, requires judge call', function() {
        // This is a true tie. Totals are equal, and highest arrows are equal (both X).
        const soT1_tied = ['X', '8']; // Total 18, High X
        const soT2_tied = ['X', '8']; // Total 18, High X

        // We will need to ensure parseScoreValue is available.
        const t1SoTotal = soT1_tied.reduce((sum, s) => sum + parseScoreValue(s), 0);
        const t2SoTotal = soT2_tied.reduce((sum, s) => sum + parseScoreValue(s), 0);

        expect(t1SoTotal).toBe(t2SoTotal);

        let winner = null;
        // Replicate the exact logic from team_card.js
        // We will need to ensure getArrowValueForTiebreak is available.
        const t1Max = Math.max(...soT1_tied.map(s => getArrowValueForTiebreak(s)));
        const t2Max = Math.max(...soT2_tied.map(s => getArrowValueForTiebreak(s)));

        if (t1Max > t2Max) winner = 't1';
        else if (t2Max > t1Max) winner = 't2';
        else winner = 'judge_call';

        expect(winner).toBe('judge_call');
    });
}); 