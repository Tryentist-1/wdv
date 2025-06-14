# Archer Module Design

## Purpose
- Manage a master list of archers for a team/club/season.
- Allow easy creation, import, and editing of archer info.
- Enable selection/assignment of archers to bale groups for scoring.
- Support exporting concise results for pasting into results tables.

## Core Features

### 1. Archer List Management
- **Create:** Add new archers manually (with all required fields).
- **Import:** Upload a CSV or paste a list to bulk add archers.
- **Edit:** Update archer info (Varsity/JV, Target Size, etc.) as needed.
- **Active/Inactive:** Mark archers as active or inactive for filtering.

### 2. Archer Fields
- **First Name** (required)
- **Last Name** (required)
- **Email** (optional)
- **USArchery** (optional)
- **Gender** (required, default: M)
- **Grade** (required)
- **Age** (required)
- **Level** (optional, default: Varsity)
- **School** (optional, default: "WDV")
- **Active** (optional, default: "Active")
- **Bale Assignment** (optional, default: "01")
- **Target Assignment** (optional, default: "A")
- **Target Size** (optional, default: "40cm")

### 3. Bale Group Assignment
- Select archers from the master list to form a bale group for a round.
- Assign bale and target as needed (or leave as default).
- Only one bale group per score card.

### 4. Export/Results
- Export or SMS only the essential scoring data:
  - Bale Group
  - Archer Name (abbreviated if needed)
  - 10s
  - Xs
  - Total Score
  - Avg Arrow
  - Timestamp (optional)
  - Gender (optional)
- Format should be concise for easy pasting into Google Sheets.

### 5. List Sharing
- Generate a link or QR code for archers/scorers to access the current list.
- Allow archers to update their info (with coach approval if needed).

## Future-Proofing
- The module should be designed so it can later support:
  - Event/round-specific lists
  - Season-long tracking and analytics (for coaches)
  - More advanced exports (CSV, JSON, etc.)

## User Experience Notes
- The UI should be simple and mobile-friendly.
- Adding or editing archers should be quick and forgiving (undo, confirm, etc.).
- Filtering/searching the list should be easy, especially for large teams.
- Export/SMS should be a one-tap action with clear instructions. 