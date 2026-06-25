# Job Match Dashboard

A self-updating job search dashboard that runs inside [Claude for Desktop](https://claude.ai/download) (Cowork mode). It searches Dice, Indeed, and ZipRecruiter daily for roles matching your profile, scores them with AI, and tracks your applications and job search activity — all in one place.

![Dashboard screenshot](docs/screenshot.png)

---

## What It Does

- **Daily automated search** across Dice, Indeed, and ZipRecruiter (via scheduled Claude task)
- **AI-scored matches** — each job gets a 1–10 relevance score with a plain-English reason
- **Smart filtering** — exclude defense roles, filter by salary, work arrangement, and local metro area
- **Job search log** — track applications, interviews, networking contacts, and follow-ups
- **Resume library** — keep your active and archived resumes in one tab
- **Live Search** — bypass the daily cache and run a fresh search on demand
- **Fully configurable** — all preferences managed in a Settings tab, no code editing required

---

## Prerequisites

1. **Claude for Desktop** with Cowork mode enabled  
   → [Download here](https://claude.ai/download)

2. **Three Cowork plugins** (install from the Plugins marketplace inside Claude):
   - **Dice** job search connector
   - **Indeed / JSearch** job search connector
   - **ZipRecruiter** job search connector

3. Your **MCP Tool IDs** (see Step 2 of Setup below)

---

## Setup

### Step 1 — Install the plugins

Open Claude for Desktop, go to **Settings → Plugins**, and install the three job board connectors listed above. Once installed, they'll appear as connected tools.

### Step 2 — Find your MCP Tool IDs

Each plugin installation gets a unique ID. You need to put yours into `dashboard.html` before creating the artifact.

Open a new Claude conversation and ask:

> "List the exact tool names available to you for searching jobs on Dice, Indeed, and ZipRecruiter."

Claude will respond with tool names in the format `mcp__{uuid}__search_jobs`. Copy the three IDs.

Then open `dashboard.html` in a text editor and find this section near the top of the `<script>` block:

```javascript
const DICE_TOOL   = 'mcp__b0b0549b-bf32-4d46-9b0c-b3315e78be7b__search_jobs'; // ← replace
const INDEED_TOOL = 'mcp__488f41d8-7ab4-4647-88f2-ba14dd0aaa6f__search_jobs'; // ← replace
const ZR_TOOL     = 'mcp__c73855fe-5ca0-4178-9fe0-23de8bc7512b__search_jobs'; // ← replace
```

Replace each value with your own IDs and save the file.

### Step 3 — Create the artifact in Claude

1. Open Claude for Desktop in Cowork mode
2. Open a new conversation
3. Paste the entire contents of `dashboard.html` into the message and send it with the prompt:

   > "Create a Cowork artifact from this HTML file. Use the id `job-match-dashboard`."

   Or ask Claude to read the file directly if you've given it access to this folder.

4. The artifact will appear as **🎯 Job Match Dashboard** in your conversation.

### Step 4 — Configure your profile and preferences

Click the **⚙ Settings** tab inside the dashboard and fill in:

| Section | What to fill in |
|---|---|
| **Your Profile** | Your name, location, and a description of your skills and experience (this is sent to Claude when scoring jobs) |
| **Job Preferences** | Work arrangement (remote/hybrid/on-site), commute range, minimum salary, defense role preference |
| **Local Metro Cities** | Cities within commute range — use the **Auto-fill** button if you've set your location and commute range |
| **Search Terms** | Job titles to search for across all three boards (e.g. `senior software engineer`, `staff engineer`) |

Click **Save Settings** at the bottom when done.

### Step 5 (Optional) — Set up the daily scheduled task

The dashboard gets much more useful with a scheduled task that runs every morning and pre-populates fresh results before you even open it.

Ask Claude to set this up:

> "Set up a daily scheduled task at 7am that searches Dice, Indeed, and ZipRecruiter for jobs matching my profile, scores them, and injects the results into my job-match-dashboard artifact."

Claude will configure this using your search settings. You can adjust the time and frequency as needed.

---

## How It Works

### Job Scoring

Each job is scored 1–10 by Claude (Haiku model) based on your profile:
- **9–10** — Excellent match, apply soon
- **7–8** — Good fit
- **5–6** — Partial match, worth reviewing
- **Below 5** — Filtered out, won't appear

### Filtering

Jobs are hidden from results if they:
- Score below 5
- Don't match your work arrangement preference
- Are outside your local metro area (for hybrid/on-site roles)
- Fall below your minimum salary (if set)
- Are defense/clearance roles (if set to exclude)
- Have no salary listed (if "Hide no-salary jobs" is checked)
- Have already been applied to or dismissed

### Preloaded vs. Live Search

When you open the dashboard, it checks whether the daily task has run recently (within 24 hours). If so, it shows those pre-scored results instantly. If not, or if you click **🔍 Live Search**, it runs fresh searches against all three job boards in real time (takes 1–2 minutes).

---

## Data Storage

All data is stored in the **browser's localStorage** inside the Cowork artifact — there's no server, no database, and no account required.

| What | localStorage key | Description |
|---|---|---|
| Job cache | `jd_job_cache` | All jobs ever seen (used for "new" badges) |
| Applications | `jd_activities` | Your full job search activity log |
| Dismissed jobs | `jd_dismissed` | Jobs you marked "Not Interested" |
| Settings | `jd_settings` | All your preferences |
| Resumes | `jd_resumes` | Resume library entries |

**Important notes:**
- Data persists between sessions as long as you use the same Cowork instance
- Clearing browser/app storage will wipe all your data — there's no backup mechanism built in yet
- Dismissed jobs have no "undo" — once dismissed, a job won't appear again
- Data does not sync across devices

---

## Customization

### Search Terms

The **Settings → Search Terms** section controls what gets searched on each job board. One job title per line. The dashboard automatically formats these for each service (Dice appends "remote", Indeed pairs with a location, ZipRecruiter uses as job role).

For specialized searches, expand the **Advanced** section to add extra terms per service.

### Candidate Profile

The profile in **Settings → Your Profile** is a free-text description sent to Claude when scoring jobs. The more specific you are about your skills, seniority level, and what you're looking for, the better the scores will be. Separate "core skills" from "background experience" so the AI can weigh them appropriately.

### Scoring Adjustments

The `keywordScore()` function in the script provides keyword-based fallback scoring when AI scoring fails or times out. You can edit this function to add or adjust scoring rules for your specific role. Look for it in the `<script>` section.

### Defense/Clearance Roles

Set to **Penalize (−2)**, **Exclude**, or **Include normally** in Settings. The dashboard uses keyword matching on the job title, company name, and description to identify defense-adjacent roles.

---

## Folder Structure (Recommended)

```
your-job-search-folder/
├── resumes/
│   ├── YourName_resume_Master.docx    ← base template
│   ├── YourName_resume_Master.pdf
│   └── archived/                      ← tailored resumes by company
├── dashboard.html                     ← this file (source of truth)
└── README.md
```

---

## Troubleshooting

**Dashboard spins on "Starting searches…" and never loads**  
→ Your MCP Tool IDs are likely wrong. Re-check Step 2 above and verify the IDs match what Claude reports for your installation.

**Live Search returns no results**  
→ Check that your three plugins are connected (Settings → Plugins in Claude). Also try broadening your search terms in Settings.

**Jobs I applied to are still showing up**  
→ Make sure you're logging the application through the **Job Search Log** tab, not just externally. The dashboard filters based on its own activity log.

**Auto-fill metro cities says "Failed"**  
→ Make sure you've filled in your **Location** field in the Profile section and set a **Commute Range** before clicking Auto-fill.

**The daily task isn't injecting new jobs**  
→ Check your scheduled tasks in Claude. The task needs Cowork access to run the artifact update. Try running it manually by asking Claude to run the daily job search task.

---

## Contributing

This tool was built using Claude for Desktop (Cowork mode) as the development environment. If you've made improvements, feel free to open a PR. The entire dashboard is a single self-contained HTML file — all logic, styles, and configuration live in `dashboard.html`.

---

## License

MIT
