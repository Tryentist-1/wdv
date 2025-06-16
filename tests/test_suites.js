// This file will contain all the QUnit test suites for our modernized applications.
// We will add tests for:
// 1. Archer Module
// 2. Ranking Round
// 3. Solo Card
// 4. Team Card

QUnit.module('Getting Started', function() {
  QUnit.test('tests are running', function(assert) {
    assert.ok(true, 'QUnit is set up and tests are running.');
  });
});

QUnit.module('ArcherModule', function(hooks) {
    const testListName = 'testArcherList';
    const sampleArcher1 = { first: 'John', last: 'Doe', school: 'TestU', grade: '10', gender: 'M', level: 'VAR', fave: false };
    const sampleArcher2 = { first: 'Jane', last: 'Smith', school: 'TestU', grade: '11', gender: 'F', level: 'JV', fave: true };

    // Before each test, clear the test list in localStorage
    hooks.beforeEach(function() {
        localStorage.removeItem(testListName);
        // Temporarily override the default list name for testing purposes
        ArcherModule.listName = testListName;
    });

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

QUnit.module('Ranking Round Logic', function() {
    // The parseScoreValue function is now globally available from js/common.js
    // No need to replicate it here.

    QUnit.test('parseScoreValue handles various inputs', function(assert) {
        assert.equal(parseScoreValue('X'), 10, 'X is 10');
        assert.equal(parseScoreValue('x'), 10, 'x is 10');
        assert.equal(parseScoreValue('10'), 10, 'String "10" is 10');
        assert.equal(parseScoreValue('5'), 5, 'String "5" is 5');
        assert.equal(parseScoreValue('M'), 0, 'M is 0');
        assert.equal(parseScoreValue('m'), 0, 'm is 0');
        assert.equal(parseScoreValue(''), 0, 'Empty string is 0');
        assert.equal(parseScoreValue(null), 0, 'Null is 0');
        assert.equal(parseScoreValue(undefined), 0, 'Undefined is 0');
        assert.equal(parseScoreValue('abc'), 0, 'Invalid string is 0');
        assert.equal(parseScoreValue(8), 8, 'Number 8 is 8');
    });
});

QUnit.module('Solo Card Logic', function() {
    // The parseScoreValue function is now globally available from js/common.js

    QUnit.test('End winner and set points', function(assert) {
        const scoresA1 = ['9', '9', '8']; // Total 26
        const scoresA2 = ['8', '8', '7']; // Total 23
        const totalA1 = scoresA1.reduce((sum, s) => sum + parseScoreValue(s), 0);
        const totalA2 = scoresA2.reduce((sum, s) => sum + parseScoreValue(s), 0);
        
        let setPointsA1 = 0, setPointsA2 = 0;
        if (totalA1 > totalA2) setPointsA1 = 2;
        else if (totalA2 > totalA1) setPointsA2 = 2;
        else { setPointsA1 = 1; setPointsA2 = 1; }

        assert.equal(setPointsA1, 2, 'Archer 1 wins the set');
        assert.equal(setPointsA2, 0, 'Archer 2 loses the set');
    });

    QUnit.test('Tied end and set points', function(assert) {
        const scoresA1 = ['10', '9', '8']; // Total 27
        const scoresA2 = ['X', '9', '8']; // Total 27
        const totalA1 = scoresA1.reduce((sum, s) => sum + parseScoreValue(s), 0);
        const totalA2 = scoresA2.reduce((sum, s) => sum + parseScoreValue(s), 0);

        let setPointsA1 = 0, setPointsA2 = 0;
        if (totalA1 > totalA2) setPointsA1 = 2;
        else if (totalA2 > totalA1) setPointsA2 = 2;
        else { setPointsA1 = 1; setPointsA2 = 1; }

        assert.equal(setPointsA1, 1, 'Archer 1 gets 1 point for a tie');
        assert.equal(setPointsA2, 1, 'Archer 2 gets 1 point for a tie');
    });

    QUnit.test('Shoot-off logic uses parseScoreValue correctly', function(assert) {
        assert.equal(parseScoreValue('X'), 10, 'X has a score value of 10');
        assert.equal(parseScoreValue('10'), 10, '10 has a score value of 10');
        assert.ok(parseScoreValue('10') > parseScoreValue('9'), '10 is greater than 9 for score value');
        assert.notOk(parseScoreValue('M') > parseScoreValue('1'), 'M is not greater than 1 for score value');
    });
});

QUnit.module('Team Card Logic', function(hooks) {
    // This helper gives 'X' a higher value for sorting/comparison in tie-breaks,
    // without affecting its score value of 10.
    function getArrowValueForTiebreak(score) {
        const upperScore = String(score).toUpperCase().trim();
        if (upperScore === 'X') return 10.1;
        return parseScoreValue(score);
    }
    
    // Test for shoot-off with highest arrow tie-breaker
    QUnit.test('Shoot-off with totals tied, won by highest arrow (X vs 10)', function(assert) {
        const soT1 = ['X', '8']; // Total 18
        const soT2 = ['9', '9']; // Total 18
        const t1SoTotal = soT1.reduce((sum, s) => sum + parseScoreValue(s), 0);
        const t2SoTotal = soT2.reduce((sum, s) => sum + parseScoreValue(s), 0);
        
        assert.equal(t1SoTotal, t2SoTotal, 'Shoot-off totals are tied at 18');
        
        let winner = null;
        if (t1SoTotal > t2SoTotal) {
            winner = 't1';
        } else if (t2SoTotal > t1SoTotal) {
            winner = 't2';
        } else {
            // Totals are tied, check for highest arrow using the tiebreak helper
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
        
        assert.equal(winner, 't1', 'Team 1 wins due to having an X (higher tiebreak value)');
    });

    QUnit.test('Shoot-off with totals tied, won by highest arrow (10 vs 9)', function(assert) {
        const soT1 = ['10', '8']; // Total 18
        const soT2 = ['9', '9']; // Total 18
        const t1SoTotal = soT1.reduce((sum, s) => sum + parseScoreValue(s), 0);
        const t2SoTotal = soT2.reduce((sum, s) => sum + parseScoreValue(s), 0);
        
        assert.equal(t1SoTotal, t2SoTotal, 'Shoot-off totals are tied at 18');
        
        let winner = null;
        if (t1SoTotal > t2SoTotal) {
            winner = 't1';
        } else if (t2SoTotal > t1SoTotal) {
            winner = 't2';
        } else {
            const t1Max = Math.max(...soT1.map(s => getArrowValueForTiebreak(s)));
            const t2Max = Math.max(...soT2.map(s => getArrowValueForTiebreak(s)));

            if (t1Max > t2Max) winner = 't1';
            else if (t2Max > t1Max) winner = 't2';
            else winner = 'judge_call';
        }
        
        assert.equal(winner, 't1', 'Team 1 wins with a 10 vs two 9s');
    });
    
    QUnit.test('Shoot-off with totals and highest arrows tied, requires judge call', function(assert) {
        // This is a true tie. Totals are equal, and highest arrows are equal (both X).
        const soT1_tied = ['X', '8']; // Total 18, High X
        const soT2_tied = ['X', '8']; // Total 18, High X

        const t1SoTotal = soT1_tied.reduce((sum, s) => sum + parseScoreValue(s), 0);
        const t2SoTotal = soT2_tied.reduce((sum, s) => sum + parseScoreValue(s), 0);

        assert.equal(t1SoTotal, t2SoTotal, 'Shoot-off totals are tied');

        let winner = null;
        // Replicate the exact logic from team_card.js
        const t1Max = Math.max(...soT1_tied.map(s => getArrowValueForTiebreak(s)));
        const t2Max = Math.max(...soT2_tied.map(s => getArrowValueForTiebreak(s)));

        if (t1Max > t2Max) winner = 't1';
        else if (t2Max > t1Max) winner = 't2';
        else winner = 'judge_call';
        
        assert.equal(winner, 'judge_call', 'Winner is judge_call when totals and high arrows are identical');
    });
}); 