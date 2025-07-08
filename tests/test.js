const { parseScoreValue, getScoreColor } = require('../js/common.js');

describe('Common Functions', function() {

  describe('parseScoreValue', () => {
    test('should parse valid string numbers', () => {
      expect(parseScoreValue('10')).toBe(10);
      expect(parseScoreValue('5')).toBe(5);
      expect(parseScoreValue('0')).toBe(0);
    });

    test('should handle special value "X"', () => {
      expect(parseScoreValue('X')).toBe(10);
      expect(parseScoreValue('x')).toBe(10);
    });

    test('should handle special value "M"', () => {
      expect(parseScoreValue('M')).toBe(0);
      expect(parseScoreValue('m')).toBe(0);
    });

    test('should handle valid numbers', () => {
      expect(parseScoreValue(10)).toBe(10);
      expect(parseScoreValue(0)).toBe(0);
    });

    test('should return 0 for invalid or empty inputs', () => {
      expect(parseScoreValue('')).toBe(0);
      expect(parseScoreValue('  ')).toBe(0);
      expect(parseScoreValue('abc')).toBe(0);
      expect(parseScoreValue(null)).toBe(0);
      expect(parseScoreValue(undefined)).toBe(0);
      expect(parseScoreValue(NaN)).toBe(0);
    });
  });

  describe('getScoreColor', () => {
    test('should return correct class for X and 10', () => {
      expect(getScoreColor('X')).toBe('score-x');
      expect(getScoreColor('10')).toBe('score-10');
      expect(getScoreColor(10)).toBe('score-10');
    });

    test('should return correct class for 9', () => {
      expect(getScoreColor('9')).toBe('score-9');
      expect(getScoreColor(9)).toBe('score-9');
    });

    test('should return correct class for 7 and 8', () => {
      expect(getScoreColor('8')).toBe('score-8');
      expect(getScoreColor(7)).toBe('score-7');
    });

    test('should return correct class for 5 and 6', () => {
      expect(getScoreColor('6')).toBe('score-6');
      expect(getScoreColor(5)).toBe('score-5');
    });

    test('should return correct class for 3 and 4', () => {
        expect(getScoreColor('4')).toBe('score-4');
        expect(getScoreColor(3)).toBe('score-3');
    });

    test('should return correct class for 1 and 2', () => {
        expect(getScoreColor('2')).toBe('score-2');
        expect(getScoreColor(1)).toBe('score-1');
    });

    test('should return correct class for M (Miss)', () => {
      expect(getScoreColor('M')).toBe('score-m');
    });

    test('should return empty class for invalid inputs', () => {
      expect(getScoreColor('')).toBe('score-empty');
      expect(getScoreColor('  ')).toBe('score-empty');
      expect(getScoreColor('abc')).toBe('score-empty');
      expect(getScoreColor(null)).toBe('score-empty');
      expect(getScoreColor(undefined)).toBe('score-empty');
      expect(getScoreColor(11)).toBe('score-empty');
    });
  });

}); 