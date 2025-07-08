const { parseScoreValue, getScoreColor } = require('../js/common.js');

QUnit.module('Common Functions', function() {

  QUnit.module('parseScoreValue', function() {
    QUnit.test('should parse valid string numbers', function(assert) {
      assert.strictEqual(parseScoreValue('10'), 10, 'String "10" should be 10');
      assert.strictEqual(parseScoreValue('5'), 5, 'String "5" should be 5');
      assert.strictEqual(parseScoreValue('0'), 0, 'String "0" should be 0');
    });

    QUnit.test('should handle special value "X"', function(assert) {
      assert.strictEqual(parseScoreValue('X'), 10, 'String "X" should be 10');
      assert.strictEqual(parseScoreValue('x'), 10, 'String "x" should be 10');
    });

    QUnit.test('should handle special value "M"', function(assert) {
      assert.strictEqual(parseScoreValue('M'), 0, 'String "M" should be 0');
      assert.strictEqual(parseScoreValue('m'), 0, 'String "m" should be 0');
    });

    QUnit.test('should handle valid numbers', function(assert) {
      assert.strictEqual(parseScoreValue(10), 10, 'Number 10 should be 10');
      assert.strictEqual(parseScoreValue(0), 0, 'Number 0 should be 0');
    });

    QUnit.test('should return 0 for invalid or empty inputs', function(assert) {
      assert.strictEqual(parseScoreValue(''), 0, 'Empty string should be 0');
      assert.strictEqual(parseScoreValue('  '), 0, 'String with spaces should be 0');
      assert.strictEqual(parseScoreValue('abc'), 0, 'Non-numeric string should be 0');
      assert.strictEqual(parseScoreValue(null), 0, 'null should be 0');
      assert.strictEqual(parseScoreValue(undefined), 0, 'undefined should be 0');
      assert.strictEqual(parseScoreValue(NaN), 0, 'NaN should be 0');
    });
  });

  QUnit.module('getScoreColor', function() {
    QUnit.test('should return correct class for X and 10 (Yellow)', function(assert) {
      assert.strictEqual(getScoreColor('X'), 'score-x', 'String "X" should return score-x');
      assert.strictEqual(getScoreColor('10'), 'score-10', 'String "10" should return score-10');
      assert.strictEqual(getScoreColor(10), 'score-10', 'Number 10 should return score-10');
    });

    QUnit.test('should return correct class for 9 (Yellow)', function(assert) {
      assert.strictEqual(getScoreColor('9'), 'score-9', 'String "9" should return score-9');
      assert.strictEqual(getScoreColor(9), 'score-9', 'Number 9 should return score-9');
    });

    QUnit.test('should return correct class for 7 and 8 (Red)', function(assert) {
      assert.strictEqual(getScoreColor('8'), 'score-8', 'String "8" should return score-8');
      assert.strictEqual(getScoreColor(7), 'score-7', 'Number 7 should return score-7');
    });

    QUnit.test('should return correct class for 5 and 6 (Blue)', function(assert) {
      assert.strictEqual(getScoreColor('6'), 'score-6', 'String "6" should return score-6');
      assert.strictEqual(getScoreColor(5), 'score-5', 'Number 5 should return score-5');
    });

    QUnit.test('should return correct class for 3 and 4 (Black)', function(assert) {
        assert.strictEqual(getScoreColor('4'), 'score-4', 'String "4" should return score-4');
        assert.strictEqual(getScoreColor(3), 'score-3', 'Number 3 should return score-3');
    });

    QUnit.test('should return correct class for 1 and 2 (White)', function(assert) {
        assert.strictEqual(getScoreColor('2'), 'score-2', 'String "2" should return score-2');
        assert.strictEqual(getScoreColor(1), 'score-1', 'Number 1 should return score-1');
    });

    QUnit.test('should return correct class for M (Miss)', function(assert) {
      assert.strictEqual(getScoreColor('M'), 'score-m', 'String "M" should return score-m');
    });

    QUnit.test('should return empty class for invalid inputs', function(assert) {
      assert.strictEqual(getScoreColor(''), 'score-empty', 'Empty string should be score-empty');
      assert.strictEqual(getScoreColor('  '), 'score-empty', 'Spaced string should be score-empty');
      assert.strictEqual(getScoreColor('abc'), 'score-empty', 'Non-numeric string should be score-empty');
      assert.strictEqual(getScoreColor(null), 'score-empty', 'null should be score-empty');
      assert.strictEqual(getScoreColor(undefined), 'score-empty', 'undefined should be score-empty');
      assert.strictEqual(getScoreColor(11), 'score-empty', 'Number 11 should be score-empty');
    });
  });

}); 