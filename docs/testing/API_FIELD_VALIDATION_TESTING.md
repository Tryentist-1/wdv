# API Field Validation Testing

**Purpose:** Ensure all API endpoints handle all fields correctly  
**Date:** January 13, 2026  
**Status:** Critical Gap Identified

---

## 🐛 The Problem: Missing Field Validation

### Recent Bug Example
**Issue:** Shirt size updates showed "saved to database" but didn't persist after refresh.

**Root Cause:** The `/v1/archers/self` endpoint was missing `shirtSize`, `pantSize`, and `hatSize` in its update logic, even though:
- The frontend sent these fields
- The database has these columns
- The bulk_upsert endpoint handles them
- The self-update endpoint was missing them

**Why It Wasn't Caught:**
1. ❌ No test for `/v1/archers/self` endpoint
2. ❌ No field completeness validation
3. ❌ No comparison between endpoints (bulk_upsert vs self-update)
4. ❌ Manual testing didn't verify persistence after refresh

---

## 📋 Required Testing Improvements

### 1. **Field Completeness Tests**

Every endpoint that updates archer data must test:
- ✅ All fields from the data model are accepted
- ✅ All fields are persisted to database
- ✅ All fields are returned in GET responses

**Test Pattern:**
```javascript
test('should handle all archer fields', async () => {
    const allFields = {
        firstName: 'Test',
        lastName: 'Archer',
        nickname: 'Testy',
        email: 'test@example.com',
        phone: '555-1234',
        school: 'TEST',
        grade: '12',
        gender: 'M',
        level: 'VAR',
        status: 'active',
        shirtSize: 'L',
        pantSize: '32',
        hatSize: 'M',
        // ... all other fields
    };
    
    // Update via endpoint
    const updateResponse = await client.post('/archers/self', allFields);
    expect(updateResponse.status).toBe(200);
    
    // Verify persistence - GET and check all fields
    const getResponse = await client.get('/archers');
    const updated = getResponse.data.archers.find(a => a.id === archerId);
    
    // Assert all fields match
    expect(updated.shirtSize).toBe('L');
    expect(updated.pantSize).toBe('32');
    expect(updated.hatSize).toBe('M');
    // ... verify all fields
});
```

### 2. **Endpoint Consistency Tests**

Compare field handling across related endpoints:
- `/v1/archers/self` vs `/v1/archers/bulk_upsert`
- `/v1/archers` (POST) vs `/v1/archers/bulk_upsert`
- Ensure all endpoints handle the same fields

**Test Pattern:**
```javascript
test('self-update should handle same fields as bulk_upsert', async () => {
    const testFields = {
        shirtSize: 'XL',
        pantSize: '34',
        hatSize: 'L',
        // ... other fields
    };
    
    // Test via self-update
    const selfResponse = await client.post('/archers/self', testFields);
    expect(selfResponse.status).toBe(200);
    
    // Test via bulk_upsert
    const bulkResponse = await client.post('/archers/bulk_upsert', [testFields]);
    expect(bulkResponse.status).toBe(200);
    
    // Both should persist the same way
    const archer = await getArcher(archerId);
    expect(archer.shirtSize).toBe('XL');
});
```

### 3. **Persistence Verification Tests**

Every update endpoint must verify:
- ✅ Changes are saved to database
- ✅ Changes persist after refresh
- ✅ Changes are visible in GET requests

**Test Pattern:**
```javascript
test('should persist changes to database', async () => {
    // Update field
    await client.post('/archers/self', { shirtSize: 'XL' });
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Refresh - GET from database
    const refreshed = await client.get('/archers');
    const archer = refreshed.data.archers.find(a => a.id === archerId);
    
    // Verify persistence
    expect(archer.shirtSize).toBe('XL');
});
```

### 4. **Field Mapping Tests**

Verify field name mapping between:
- Frontend (camelCase: `shirtSize`)
- API (camelCase: `shirtSize`)
- Database (snake_case: `shirt_size`)

**Test Pattern:**
```javascript
test('should map field names correctly', async () => {
    const payload = { shirtSize: 'L' }; // camelCase
    await client.post('/archers/self', payload);
    
    // Verify database has snake_case
    const dbRecord = await queryDatabase('SELECT shirt_size FROM archers WHERE id = ?', [archerId]);
    expect(dbRecord.shirt_size).toBe('L');
});
```

---

## 🧪 Missing Tests to Add

### Critical Gaps

1. **`/v1/archers/self` Endpoint** - ❌ No tests exist
   - Field completeness test
   - Persistence verification
   - Field mapping validation

2. **Field Completeness Validation** - ❌ Not tested
   - Compare endpoint field lists
   - Verify all fields are handled
   - Check for missing fields

3. **Persistence Tests** - ⚠️ Limited coverage
   - Update → Refresh → Verify pattern
   - Cross-endpoint consistency

4. **Field Mapping Tests** - ❌ Not tested
   - camelCase ↔ snake_case conversion
   - Null/empty value handling

---

## 📝 Implementation Plan

### Phase 1: Self-Update Endpoint Tests (Priority: High)

**File:** `tests/api/archers/archer-self-update.test.js`

**Tests to Add:**
1. ✅ Basic self-update functionality
2. ✅ All field updates (shirtSize, pantSize, hatSize, etc.)
3. ✅ Persistence verification (update → GET → verify)
4. ✅ Field mapping validation
5. ✅ Error handling (invalid archer, missing fields)

### Phase 2: Field Completeness Validation (Priority: High)

**File:** `tests/api/archers/archer-field-completeness.test.js`

**Tests to Add:**
1. ✅ Compare field lists between endpoints
2. ✅ Verify all fields are handled in each endpoint
3. ✅ Detect missing fields automatically

### Phase 3: Endpoint Consistency Tests (Priority: Medium)

**File:** `tests/api/archers/archer-endpoint-consistency.test.js`

**Tests to Add:**
1. ✅ Same fields work across all update endpoints
2. ✅ Same validation rules apply
3. ✅ Same persistence behavior

---

## 🔧 Test Utilities Needed

### Field List Generator
```javascript
function getAllArcherFields() {
    return [
        'firstName', 'lastName', 'nickname', 'email', 'phone',
        'school', 'grade', 'gender', 'level', 'status',
        'shirtSize', 'pantSize', 'hatSize',
        'domEye', 'domHand', 'heightIn', 'wingspanIn',
        // ... complete list
    ];
}
```

### Field Completeness Checker
```javascript
function verifyFieldCompleteness(endpoint, fields) {
    const handledFields = getEndpointFields(endpoint);
    const missing = fields.filter(f => !handledFields.includes(f));
    if (missing.length > 0) {
        throw new Error(`Missing fields in ${endpoint}: ${missing.join(', ')}`);
    }
}
```

### Persistence Verifier
```javascript
async function verifyPersistence(updateFn, getFn, field, value) {
    // Update
    await updateFn({ [field]: value });
    
    // Wait
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify
    const result = await getFn();
    expect(result[field]).toBe(value);
}
```

---

## ✅ Pre-Deployment Checklist

Before deploying any endpoint changes:

- [ ] All fields in data model are tested
- [ ] Persistence is verified (update → refresh → verify)
- [ ] Field mapping is validated (camelCase ↔ snake_case)
- [ ] Endpoint consistency is checked (compare with related endpoints)
- [ ] Error cases are tested (missing fields, invalid values)
- [ ] Manual smoke test on actual device
- [ ] Database verification (check actual DB values)

---

## 📊 Current vs Target Coverage

### Current State
- **Self-Update Endpoint:** 0% (no tests)
- **Field Completeness:** 0% (not tested)
- **Persistence Verification:** ~20% (limited)
- **Field Mapping:** 0% (not tested)

### Target State
- **Self-Update Endpoint:** 100% (all fields tested)
- **Field Completeness:** 100% (automated checks)
- **Persistence Verification:** 100% (all update endpoints)
- **Field Mapping:** 100% (all field conversions)

---

## 🚀 Quick Win: Add Self-Update Tests

**Priority:** Critical  
**Effort:** 2-3 hours  
**Impact:** Prevents field-related bugs

Create `tests/api/archers/archer-self-update.test.js` with:
1. Basic update test
2. All field update test (shirtSize, pantSize, hatSize, etc.)
3. Persistence verification test
4. Field mapping validation

This would have caught the shirt size bug immediately.
