# 🎯 WDV Archery Scoring App

This project is a browser-based scoring tool for archery teams using the Olympic Archery in Schools (OAS) format. It was developed by Jazz for the Wiseburn Da Vinci (WDV) archery team.

## 🚀 Features
- Scorekeeping for multiple archers
- Tabs for switching between archers
- LocalStorage-based session saving
- Export scores via Copy, SMS, or Email
- Reset options and sample data loading
- Mobile-friendly responsive layout
- Modular structure for scalability

## 🗂 Folder Structure
```
/wdv
├── index.html              # Optional landing page (not required)
├── score360.html           # Modular version for 360 round (12 ends)
├── score300.html           # Modular version for 300 round (10 ends, WIP)
├── css/
│   └── score.css           # All styles
├── js/
│   └── score.js            # Main scoring logic, used by both rounds
├── score360-legacy.html    # Old single-page version (HTML+JS+CSS inline)
└── README.md
```

## 🌐 Deployment
On your web server (e.g. SiteGround), upload the entire project to:
```
/public_html/WDV/
```
Then access it like:
- `https://yourdomain.com/WDV/score360.html`
- `https://yourdomain.com/WDV/score300.html` (when ready)

## 🌱 Development Workflow
- `main` branch = current stable version used by archers
- `dev` or `modular-dev` branch = working versions, experiments
- Use GitHub Desktop or command-line to manage branches/merges

## 💡 Coming Soon
- Round picker (300 / 360 / custom)
- Optional archer list import
- Real-time session save + restore
- Database or cloud save option (TBD)

## 👋 Credits
Created and maintained by Jazz, Coach of the Wiseburn Da Vinci Archery Team.

---

For any cool ideas or improvements, feel free to vibe code and send pull requests. 🏹💻
# wdv
 
