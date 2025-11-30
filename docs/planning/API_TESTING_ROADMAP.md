# API Testing Catch-Up Roadmap

**Goal:** Systematic approach to achieve 85% API coverage efficiently  
**Current:** 15% coverage (10/63 endpoints)  
**Target:** 85% coverage with comprehensive error testing  
**Timeline:** 4 weeks to catch up, then maintain

---

## 🎯 Strategic Approach

### **Phase-Based Implementation**
1. **Quick Wins First** - High-impact, low-effort endpoints
2. **Core Workflows** - Critical business logic
3. **Advanced Features** - Complex scenarios
4. **Polish & Maintain** - Error handling, performance

### **Prioritization Matrix**
```
High Impact + Low Effort = Week 1 (Quick Wins)
High Impact + High Effort = Week 2-3 (Core Focus)  
Low Impact + Low Effort = Week 4 (Fill Gaps)
Low Impact + High Effort = Future (Nice to Have)
```

---

## 📅 Week-by-Week Implementation Plan

### **Week 1: Quick Wins & Foundation (Days 1-7)**
**Goal:** 40% coverage (25/63 endpoints)  
**Strategy:** Test simple CRUD endpoints with existing patterns

#### **Day 1-2: Archer Management (8 endpoints)**
```bash
# Priority: HIGH (already partially tested)
# Effort: LOW (extend existing tests)

tests/api/archers/
├── archer-crud.test.js          ✅ (already created)
├── archer-search.test.js        🔄 (extend)
├── archer-bulk-operations.test.js 🆕 (new)
└── archer-validation.test.js    🆕 (new)
```

**Endpoints to complete:**
- `POST /v1/archers` - Create single archer
- `GET /v1/archers/search` - Search functionality  
- `POST /v1/upload_csv` - CSV upload
- `POST /v1/archers/upsert` - Single upsert
- `GET /v1/archers/{id}/current-session` - Session data
- `GET /v1/archers/{id}/history` - Archer history

#### **Day 3-4: Round Management Basics (6 endpoints)**
```bash
# Priority: HIGH (core functionality)
# Effort: LOW (simple CRUD)

tests/api/rounds/
├── round-creation.test.js       🆕 (new)
├── round-archers.test.js        🆕 (new)
└── round-snapshots.test.js      🆕 (new)
```

**Endpoints to complete:**
- `POST /v1/rounds/{id}/archers/bulk` - Bulk add archers
- `GET /v1/rounds/{id}/bales/{bale}/archers` - Bale archers
- `PATCH /v1/rounds/{id}/archers/{id}` - Update archer
- `DELETE /v1/rounds/{id}/archers/{id}` - Delete archer
- `GET /v1/rounds/recent` - Recent rounds
- `POST /v1/rounds/{id}/link-event` - Link to event

#### **Day 5-6: Event Management Basics (6 endpoints)**
```bash
# Priority: HIGH (event system core)
# Effort: LOW (simple operations)

tests/api/events/
├── event-crud.test.js           🆕 (new)
├── event-verification.test.js   🆕 (new)
└── event-archers.test.js        🆕 (new)
```

**Endpoints to complete:**
- `PATCH /v1/events/{id}` - Update event
- `POST /v1/events/{id}/archers` - Add archers to event
- `GET /v1/events/recent` - Recent events
- `DELETE /v1/events/{id}` - Delete event
- `POST /v1/events/{id}/reset` - Reset event
- `GET /v1/events/{id}/snapshot` - Event snapshot

#### **Day 7: Health & Diagnostics (3 endpoints)**
```bash
# Priority: MEDIUM (already mostly done)
# Effort: VERY LOW (extend existing)

tests/api/core/
├── health.test.js               ✅ (already created)
├── diagnostics.test.js          🆕 (new)
└── debug-endpoints.test.js      🆕 (new)
```

**Endpoints to complete:**
- `GET /v1/debug/round/{id}` - Round diagnostics
- Enhanced health check scenarios

**Week 1 Target: 25/63 endpoints (40% coverage)**

---

### **Week 2: Core Workflows (Days 8-14)**
**Goal:** 60% coverage (38/63 endpoints)  
**Strategy:** Focus on critical business workflows

#### **Day 8-9: Scoring Workflows (6 endpoints)**
```bash
# Priority: CRITICAL (core functionality)
# Effort: MEDIUM (business logic)

tests/api/scoring/
├── end-scoring.test.js          🆕 (new)
├── score-updates.test.js        🆕 (new)
└── score-validation.test.js     🆕 (new)
```

**Endpoints to complete:**
- `GET /v1/round_archers/{id}` - Get round archer
- `PUT /v1/round_archers/{id}/scores` - Update scores
- `GET /v1/rounds/{id}/archers/{id}/scorecard` - Get scorecard
- Enhanced end scoring scenarios
- Score calculation validation
- Running total verification

#### **Day 10-11: Event-Round Integration (6 endpoints)**
```bash
# Priority: HIGH (event system)
# Effort: MEDIUM (relationships)

tests/api/events/
├── event-rounds.test.js         🆕 (new)
├── event-round-archers.test.js  🆕 (new)
└── event-workflows.test.js      🆕 (new)
```

**Endpoints to complete:**
- `POST /v1/events/{id}/rounds` - Create event round
- `GET /v1/events/{id}/rounds` - Get event rounds
- `POST /v1/events/{id}/rounds/{id}/archers` - Add archers to event round
- Event-round relationship testing
- Archer assignment workflows
- Data consistency validation

#### **Day 12-14: Solo Match System (6 endpoints)**
```bash
# Priority: HIGH (match system)
# Effort: MEDIUM (match logic)

tests/api/matches/
├── solo-match-creation.test.js  🆕 (new)
├── solo-match-scoring.test.js   🆕 (new)
└── solo-match-lifecycle.test.js 🆕 (new)
```

**Endpoints to complete:**
- `POST /v1/solo-matches` - Create solo match
- `POST /v1/solo-matches/{id}/archers` - Add archers
- `POST /v1/solo-matches/{id}/archers/{id}/sets` - Post set score
- `GET /v1/solo-matches/{id}` - Get solo match
- `PATCH /v1/solo-matches/{id}` - Update solo match
- `GET /v1/events/{id}/solo-matches` - Get event solo matches

**Week 2 Target: 38/63 endpoints (60% coverage)**

---

### **Week 3: Advanced Features (Days 15-21)**
**Goal:** 75% coverage (47/63 endpoints)  
**Strategy:** Complex workflows and team features

#### **Day 15-16: Team Match System (6 endpoints)**
```bash
# Priority: HIGH (team functionality)
# Effort: HIGH (complex logic)

tests/api/matches/
├── team-match-creation.test.js  🆕 (new)
├── team-match-teams.test.js     🆕 (new)
└── team-match-scoring.test.js   🆕 (new)
```

**Endpoints to complete:**
- `POST /v1/team-matches` - Create team match
- `POST /v1/team-matches/{id}/teams` - Add team
- `POST /v1/team-matches/{id}/teams/{id}/archers` - Add archer to team
- `POST /v1/team-matches/{id}/teams/{id}/archers/{id}/sets` - Post set score
- `GET /v1/team-matches/{id}` - Get team match
- `GET /v1/events/{id}/team-matches` - Get event team matches

#### **Day 17-18: Verification System (6 endpoints)**
```bash
# Priority: CRITICAL (data integrity)
# Effort: HIGH (complex workflows)

tests/api/verification/
├── scorecard-verification.test.js 🆕 (new)
├── bale-verification.test.js     🆕 (new)
└── verification-workflows.test.js 🆕 (new)
```

**Endpoints to complete:**
- `POST /v1/round_archers/{id}/verify` - Verify scorecard
- `POST /v1/round_archers/{id}/verification` - Verification action
- `POST /v1/rounds/{id}/verification/bale` - Bale verification
- `POST /v1/rounds/{id}/verification/close` - Close verification
- `POST /v1/solo-matches/{id}/verify` - Verify solo match
- `POST /v1/team-matches/{id}/verify` - Verify team match

#### **Day 19-21: Match Updates (3 endpoints)**
```bash
# Priority: MEDIUM (match management)
# Effort: MEDIUM (state management)

tests/api/matches/
├── match-updates.test.js        🆕 (new)
└── match-state-management.test.js 🆕 (new)
```

**Endpoints to complete:**
- `PATCH /v1/solo-matches/{id}` - Update solo match
- `PATCH /v1/team-matches/{id}` - Update team match
- Match state transitions
- Update validation

**Week 3 Target: 47/63 endpoints (75% coverage)**

---

### **Week 4: Bracket System & Polish (Days 22-28)**
**Goal:** 85% coverage (54/63 endpoints)  
**Strategy:** Complete bracket system and error handling

#### **Day 22-24: Bracket Management (8 endpoints)**
```bash
# Priority: HIGH (tournament system)
# Effort: HIGH (complex tournament logic)

tests/api/brackets/
├── bracket-creation.test.js     🆕 (new)
├── bracket-entries.test.js      🆕 (new)
├── bracket-generation.test.js   🆕 (new)
└── bracket-results.test.js      🆕 (new)
```

**Endpoints to complete:**
- `POST /v1/events/{id}/brackets` - Create bracket
- `GET /v1/events/{id}/brackets` - Get event brackets
- `GET /v1/brackets/{id}` - Get bracket
- `PATCH /v1/brackets/{id}` - Update bracket
- `DELETE /v1/brackets/{id}` - Delete bracket
- `POST /v1/brackets/{id}/entries` - Add bracket entry
- `GET /v1/brackets/{id}/entries` - Get bracket entries
- `DELETE /v1/brackets/{id}/entries/{id}` - Delete bracket entry

#### **Day 25-26: Bracket Advanced (3 endpoints)**
```bash
# Priority: HIGH (tournament functionality)
# Effort: VERY HIGH (complex algorithms)

tests/api/brackets/
├── bracket-generation-advanced.test.js 🆕 (new)
└── bracket-results-advanced.test.js    🆕 (new)
```

**Endpoints to complete:**
- `POST /v1/brackets/{id}/generate` - Generate bracket
- `GET /v1/brackets/{id}/results` - Get bracket results
- Tournament bracket algorithms
- Results calculation validation

#### **Day 27-28: Error Handling & Integration (Remaining endpoints)**
```bash
# Priority: MEDIUM (completeness)
# Effort: MEDIUM (systematic testing)

tests/api/integration/
├── error-scenarios.test.js      🆕 (new)
├── edge-cases.test.js          🆕 (new)
└── full-workflows.test.js      🆕 (new)
```

**Focus areas:**
- Comprehensive error scenario testing
- Edge case validation
- Full workflow integration tests
- Performance baseline testing

**Week 4 Target: 54/63 endpoints (85% coverage)**

---

## 🛠️ Daily Implementation Template

### **Daily Workflow (2-3 hours/day)**
```bash
# 1. Morning Setup (15 minutes)
git checkout testing-cleanup
npm run serve
./test-api-suite.sh core  # Verify existing tests still pass

# 2. Implementation (2 hours)
# Create test files for assigned endpoints
# Follow existing patterns from tests/api/core/ and tests/api/archers/
# Use TestDataManager, APIClient, TestAssertions

# 3. Validation (30 minutes)
./test-api-suite.sh [category]  # Test new category
npm run test:api:coverage       # Check coverage improvement

# 4. Commit Progress (15 minutes)
git add tests/api/
git commit -m "feat: add [category] API tests - [X] endpoints covered"
```

### **Test File Template**
```javascript
/**
 * [Category] API Tests
 * Tests [description] endpoints
 */

const { APIClient, TestAssertions, TestDataManager } = require('../helpers/test-data');

describe('[Category] API', () => {
    let client;
    let authClient;
    let testData;

    beforeAll(() => {
        client = new APIClient();
        authClient = client.withPasscode('wdva26');
        testData = new TestDataManager();
    });

    afterAll(async () => {
        await testData.cleanup(authClient);
    });

    describe('[Endpoint Group]', () => {
        test('should [test description]', async () => {
            // Arrange
            const data = testData.create[TestData]();
            
            // Act
            const response = await authClient.[method]('[endpoint]', data);
            
            // Assert
            TestAssertions.expectSuccess(response);
            expect(response.data).toHaveProperty('[expectedProperty]');
        });
    });
});
```

---

## 📊 Progress Tracking

### **Coverage Dashboard**
```bash
# Daily coverage check
./test-api-suite.sh coverage

# Weekly progress report
echo "Week [X] Progress:"
echo "Endpoints: [completed]/63 ([percentage]%)"
echo "Categories: [completed categories]"
echo "Critical gaps: [remaining high-priority endpoints]"
```

### **Quality Gates**
- **Daily:** All existing tests must pass
- **Weekly:** Coverage increase of 15+ endpoints
- **End of Week 4:** 85% coverage achieved
- **Ongoing:** New endpoints tested within 1 week of creation

---

## 🎯 Success Metrics

### **Quantitative Goals**
- **Week 1:** 40% coverage (25/63 endpoints)
- **Week 2:** 60% coverage (38/63 endpoints)  
- **Week 3:** 75% coverage (47/63 endpoints)
- **Week 4:** 85% coverage (54/63 endpoints)

### **Qualitative Goals**
- **Test Quality:** Each endpoint tested for happy path + 2 error scenarios
- **Documentation:** Each test file has clear descriptions
- **Maintainability:** Consistent patterns using test utilities
- **Performance:** Test suite runs in < 2 minutes

---

## 🚀 Automation & Maintenance

### **Post-Catch-Up Strategy**
```bash
# 1. Pre-commit hook (prevent regression)
#!/bin/bash
npm run test:api:core  # Must pass before commit

# 2. Weekly maintenance (15 minutes)
./test-api-suite.sh coverage  # Check for coverage regression
# Update tests for any new endpoints

# 3. Monthly review (30 minutes)
# Review test performance
# Update test data and utilities
# Plan improvements
```

### **New Endpoint Protocol**
1. **Endpoint Created** → Test within 1 week
2. **Test Pattern** → Follow established patterns
3. **Coverage Check** → Maintain 85% minimum
4. **Documentation** → Update API test docs

---

## 🎉 Quick Start Implementation

### **Today: Get Started (30 minutes)**
```bash
# 1. Set up daily workflow
git checkout testing-cleanup
npm run serve

# 2. Pick first target (Archer Management)
cd tests/api/archers/

# 3. Extend existing archer-crud.test.js
# Add tests for remaining 4 archer endpoints

# 4. Run and commit
./test-api-suite.sh archers
git add . && git commit -m "feat: complete archer API tests - 8/8 endpoints"
```

### **This Week: Build Momentum**
- **Day 1-2:** Complete archer management (8 endpoints)
- **Day 3-4:** Add round management basics (6 endpoints)  
- **Day 5-6:** Add event management basics (6 endpoints)
- **Day 7:** Add diagnostics and review (3 endpoints)

**Result:** 40% coverage by end of week 1

---

## 💡 Pro Tips for Success

### **Efficiency Strategies**
1. **Copy-Paste-Modify** - Use existing test patterns
2. **Batch Similar Endpoints** - Group CRUD operations
3. **Test Data Reuse** - Leverage TestDataManager
4. **Parallel Development** - Test multiple endpoints per file

### **Quality Shortcuts**
1. **Happy Path First** - Get coverage, add error cases later
2. **Existing Patterns** - Follow established test structure
3. **Utility Functions** - Use TestAssertions for common checks
4. **Documentation Later** - Focus on implementation first

### **Motivation Maintenance**
1. **Daily Wins** - Commit progress daily
2. **Visual Progress** - Run coverage reports
3. **Quick Feedback** - Test frequently during development
4. **Celebrate Milestones** - Acknowledge weekly targets

---

**Status:** 📋 **Ready to Execute**  
**Next Step:** Start with archer management tests today  
**Timeline:** 4 weeks to 85% coverage  
**Maintenance:** 15 minutes/week after catch-up
