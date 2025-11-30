# Archer Trading Card Structure

## Overview
This document outlines the structure and data elements for a "Trading Card" view for Archer Profile and Archer History. The card should be designed mobile-first (99% phone usage) and present key archer information in a collectible card format.

---

## Card Dimensions & Layout

### Recommended Aspect Ratio
- **Portrait orientation**: 2:3 ratio (similar to sports trading cards)
- **Mobile-optimized**: Designed for phone screens in portrait mode
- **Card size**: Should be easily viewable on mobile, with consideration for sharing/printing

### Layout Structure
The card should be divided into distinct visual sections/zones:

1. **Header Zone** (Top 20-25%)
2. **Photo/Visual Zone** (Center 30-40%)
3. **Stats Zone** (Center-Bottom 30-35%)
4. **Footer/Details Zone** (Bottom 10-15%)

---

## Data Elements & Groupings

### ZONE 1: HEADER (Top Section)
**Purpose**: Primary identification and branding

#### Group 1.1: Archer Identity
- **Full Name** (First + Last)
  - Display: Large, prominent font
  - Format: "First Last" or "First 'Nickname' Last" if nickname exists
  - Priority: Highest

- **Nickname** (if available)
  - Display: Smaller, in quotes or parentheses
  - Format: "(Nickname)" or "'Nickname'"
  - Priority: Medium

#### Group 1.2: School & Division
- **School Code**
  - Display: 3-letter code (e.g., "WDV")
  - Format: Uppercase, bold
  - Priority: High

- **Level**
  - Display: VAR, JV, or BEG
  - Format: Abbreviation with label
  - Priority: High

- **Division** (from most recent event)
  - Display: BVAR, GVAR, BJV, GJV
  - Format: Full or abbreviated
  - Priority: Medium

- **Grade**
  - Display: 9, 10, 11, 12, or GRAD
  - Format: "Grade X" or just number
  - Priority: Medium

#### Group 1.3: Gender Indicator
- **Gender**
  - Display: M/F icon or text
  - Format: Icon or single letter
  - Priority: Low-Medium

---

### ZONE 2: PHOTO/VISUAL (Center Section)
**Purpose**: Visual representation and branding

#### Group 2.1: Profile Photo
- **Photo URL** (if available)
  - Display: Circular or rounded square avatar
  - Fallback: Initials (First + Last initial)
  - Size: Prominent, centered
  - Priority: High

#### Group 2.2: Visual Branding Elements
- **Card Number/ID** (optional)
  - Display: Small text in corner
  - Format: Sequential number or UUID short code
  - Priority: Low

- **Rarity/Status Indicator** (optional)
  - Display: Badge or border color
  - Based on: Career achievements, PR scores, or activity level
  - Priority: Low

---

### ZONE 3: STATS (Center-Bottom Section)
**Purpose**: Performance metrics and achievements

#### Group 3.1: Career Performance Stats
**Note**: These are calculated from all rounds/matches in history

- **Career Best (Ranking Round)**
  - Label: "Career Best" or "PR"
  - Value: Highest ranking round score (0-360)
  - Display: Large, prominent number
  - Priority: Highest

- **Career Average (Ranking Round)**
  - Label: "Avg" or "Career Avg"
  - Value: Average of all ranking round scores
  - Display: Medium number with one decimal
  - Priority: High

- **Total 10s (Career)**
  - Label: "10s" or "Total 10s"
  - Value: Sum of all 10s across all rounds
  - Display: Medium number
  - Priority: High

- **Total Xs (Career)**
  - Label: "Xs" or "Total Xs"
  - Value: Sum of all Xs across all rounds
  - Display: Medium number
  - Priority: Medium

#### Group 3.2: Match Records
- **Solo Match Record**
  - Label: "Solo" or "Solo Matches"
  - Value: "W-L" format (e.g., "8-2")
  - Display: Win-Loss record
  - Priority: High

- **Team Match Record**
  - Label: "Team" or "Team Matches"
  - Value: "W-L" format (e.g., "4-1")
  - Display: Win-Loss record
  - Priority: Medium

- **Shoot-Off Record** (if available)
  - Label: "Shoot-Off"
  - Value: "W-L" format
  - Display: Win-Loss record
  - Priority: Low-Medium

#### Group 3.3: Activity Metrics
- **Total Rounds**
  - Label: "Rounds" or "Events"
  - Value: Count of completed rounds
  - Display: Number
  - Priority: Medium

- **Events Attended**
  - Label: "Events"
  - Value: Count of unique events
  - Display: Number
  - Priority: Medium

#### Group 3.4: Personal Records (PRs)
- **JV PR**
  - Label: "JV PR"
  - Value: Personal record for JV level (0-360)
  - Display: Number (only if exists)
  - Priority: Medium

- **VAR PR**
  - Label: "VAR PR"
  - Value: Personal record for Varsity level (0-360)
  - Display: Number (only if exists)
  - Priority: Medium

---

### ZONE 4: FOOTER/DETAILS (Bottom Section)
**Purpose**: Additional context and metadata

#### Group 4.1: Recent Performance
- **Most Recent Event**
  - Label: "Last Event"
  - Value: Event name (truncated if long)
  - Display: Text with date
  - Format: "Event Name (MM/DD/YY)"
  - Priority: Medium

- **Most Recent Score**
  - Label: "Last Score"
  - Value: Final score from most recent round
  - Display: Number
  - Priority: Medium

#### Group 4.2: Equipment/Physical (Optional, Collapsible)
- **Dominant Hand**
  - Value: RT (Right) or LT (Left)
  - Priority: Low

- **Dominant Eye**
  - Value: RT (Right) or LT (Left)
  - Priority: Low

- **Height** (if available)
  - Value: Inches
  - Format: "XX in" or "X'X\""
  - Priority: Low

- **Wingspan** (if available)
  - Value: Inches
  - Format: "XX.X in"
  - Priority: Low

#### Group 4.3: Metadata
- **Archer ID** (for technical reference)
  - Display: Small, subtle text
  - Format: UUID short code or extId
  - Priority: Very Low

- **Last Updated**
  - Display: Timestamp of last data sync
  - Format: "Updated: MM/DD/YY" or relative time
  - Priority: Very Low

---

## Data Availability & Fallbacks

### Always Available
- Full Name
- School Code
- Level
- Gender
- Total Rounds (from history count)

### Conditionally Available
- **Photo**: Falls back to initials if not available
- **Nickname**: Only shown if exists
- **Career Stats**: Only shown if archer has completed rounds
- **Match Records**: Only shown if archer has participated in matches
- **PRs**: Only shown if values exist
- **Equipment Data**: Only shown if coach has entered it

### Calculated Fields
- Career Best: `MAX(final_score)` from all ranking rounds
- Career Average: `AVG(final_score)` from all ranking rounds
- Total 10s: `SUM(total_tens)` from all rounds
- Total Xs: `SUM(total_xs)` from all rounds
- Solo Match Record: Count wins/losses from `solo_matches`
- Team Match Record: Count wins/losses from `team_matches`
- Events Attended: Count distinct `event_id` from rounds

---

## Visual Design Considerations

### Color Coding
- **Division Colors**: Consider color-coding by division (BVAR, GVAR, BJV, GJV)
- **Level Indicators**: Visual distinction for VAR vs JV vs BEG
- **Achievement Badges**: Visual indicators for high PRs or achievements

### Typography Hierarchy
1. **Primary**: Archer name (largest, boldest)
2. **Secondary**: Career Best/PR (large, prominent)
3. **Tertiary**: Other stats (medium)
4. **Quaternary**: Labels and metadata (smallest)

### Spacing & Grouping
- Group related stats visually (e.g., all match records together)
- Use visual separators (lines, borders, backgrounds) to distinguish zones
- Ensure touch targets are at least 44px for mobile interaction

### Responsive Considerations
- Card should scale appropriately on different phone sizes
- Consider landscape orientation (though primary is portrait)
- Ensure text remains readable at small sizes

---

## API Data Sources

### Primary Endpoint
- `GET /v1/archers/:id/history` - Returns archer info + round history
- `GET /v1/archers/:id/matches` - Returns match history

### Data Structure Reference

#### Archer Object (from history endpoint)
```json
{
  "id": "uuid",
  "extId": "external-id",
  "firstName": "First",
  "lastName": "Last",
  "fullName": "First Last",
  "school": "WDV",
  "level": "VAR",
  "gender": "M"
}
```

#### History Array (from history endpoint)
```json
{
  "history": [
    {
      "event_id": "uuid",
      "event_name": "Event Name",
      "event_date": "YYYY-MM-DD",
      "round_id": "uuid",
      "division": "BVAR",
      "round_type": "R300",
      "final_score": 345,
      "ends_completed": 10,
      "total_tens": 25,
      "total_xs": 5
    }
  ],
  "totalRounds": 12
}
```

#### Matches Array (from matches endpoint)
```json
{
  "matches": [
    {
      "id": "uuid",
      "event_name": "Event Name",
      "match_type": "bracket",
      "opponent": { "id": "uuid", "name": "Opponent Name" },
      "is_winner": true,
      "result": "W",
      "my_total_set_points": 6,
      "opponent_total_set_points": 2
    }
  ],
  "total_matches": 8,
  "bracket_matches": 5,
  "informal_matches": 3
}
```

---

## Implementation Notes

### Mobile-First Design
- Card should be optimized for phone screens (primary use case)
- Consider swipe gestures for card navigation (if multiple cards)
- Ensure all text is readable without zooming

### Data Loading
- Card should load progressively (show basic info first, then stats)
- Handle loading states gracefully
- Show fallbacks for missing data

### Sharing/Export
- Consider ability to share card as image
- Consider printing format (standard trading card size: 2.5" x 3.5")
- Include QR code option linking to full profile

### Accessibility
- Ensure sufficient color contrast
- Support screen readers with proper ARIA labels
- Maintain readable font sizes

---

## Example Card Layout (Textual Representation)

```
┌─────────────────────────────┐
│  [WDV]  VAR  Grade 11       │  ← Header Zone
│                             │
│      ALEX JOHNSON           │
│      "Ace"                  │
│                             │
│    ┌─────────────┐          │
│    │             │          │  ← Photo Zone
│    │   [Photo]   │          │
│    │   or        │          │
│    │   [AJ]      │          │
│    └─────────────┘          │
│                             │
│  Career Best: 345          │  ← Stats Zone
│  Avg: 312.5                │
│  10s: 122  Xs: 25          │
│                             │
│  Solo: 8-2  Team: 4-1      │
│  Rounds: 12  Events: 6     │
│                             │
│  Last: State Champs (345)  │  ← Footer Zone
└─────────────────────────────┘
```

---

## Design Deliverables Checklist

- [ ] Card layout mockup (portrait orientation)
- [ ] Color scheme and branding
- [ ] Typography specifications
- [ ] Icon/illustration style guide
- [ ] Photo/avatar treatment
- [ ] Stat display formats
- [ ] Empty state designs (no photo, no stats)
- [ ] Loading state designs
- [ ] Dark mode variant
- [ ] Print/export format specifications

---

## Questions for Designer

1. Should the card have a border/frame treatment (like physical trading cards)?
2. How should we visually distinguish different achievement levels?
3. Should there be different card "rarities" or "tiers" based on performance?
4. What visual treatment for missing data (e.g., no photo, no stats)?
5. Should the card be interactive (tap to expand, swipe to navigate)?
6. How should we handle long names or text overflow?
7. Should there be a "back" side to the card with additional details?
8. What's the preferred aspect ratio for sharing/printing?

---

*Last Updated: [Current Date]*
*Version: 1.0*

