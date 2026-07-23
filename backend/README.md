# VC Gurukul Practice App Backend (Google Apps Script Database Interface)

This repository contains the backend codebase for the **VC Gurukul Practice App**, designed under strict **Zero-Cost Constraints** using Google Sheets as a database and Google Apps Script as the API server.

---

## 1. Sheet Setup and Initialization

1. Create a brand new Google Spreadsheet in your Google Drive (e.g., name it `VC Gurukul Database`).
2. Open the spreadsheet, and click on **Extensions** -> **Apps Script** from the top menu bar. This will open the Google Apps Script editor.
3. In the Apps Script editor, rename the default file `Code.gs` to `setup.gs`.
4. Copy the entire contents of [setup.gs](setup.gs) and paste it into the editor, replacing any default code.
5. Save the project (click the disk icon or press `Ctrl + S` / `Cmd + S`).
6. Click the function dropdown at the top, select `setupDatabase`, and click **Run**.
7. **Authorization Prompt**: Apps Script will request permissions to access your Spreadsheet. Click **Review Permissions**, select your Google account, click **Advanced**, click **Go to Untitled project (unsafe)** (or your script name), and click **Allow**.
8. Once the script completes execution, you will see a popup in your spreadsheet confirming that all tabs (Config, Chapters, Topics, MCQ_Questions, SM_Questions, SM_Rubric_Points, SM_Model_Answers, Students, MCQ_Attempts, MCQ_Responses, SM_Attempts, Import_Paste, Import_Errors, Dashboard) have been created, formatted, and loaded with sample rows.

---

## 2. Deploying the Apps Script Web App

To connect your frontend to this database, you must deploy the Apps Script as a Web App:

### Step A: Set the Security Token (`app_token`)
To protect your database from unauthorized spam, the script validates a shared secret token on every request:
1. In the Apps Script editor, click on the **Project Settings** (gear icon on the left sidebar).
2. Scroll down to the **Script Properties** section.
3. Click **Add script property**.
4. Set **Property** to `app_token`.
5. Set **Value** to a strong secret string of your choice (e.g., `my_secure_vcgurukul_pass_2026`).
6. Click **Save script properties**.

### Step B: Create Code Files
1. In the Apps Script editor, go back to the **Editor** (code icon on the left sidebar).
2. Click the `+` button next to "Files" and select **Script**. Name it `Code`. (This creates `Code.gs`).
3. Copy the entire contents of [Code.gs](Code.gs) and paste it into the file.
4. Click the `+` button next to "Files" again and select **Script**. Name it `validateContent`. (This creates `validateContent.gs`).
5. Copy the entire contents of [validateContent.gs](validateContent.gs) and paste it into the file.
6. Save the project.

### Step C: Deploy as Web App
1. Click the blue **Deploy** button at the top right, and select **New deployment**.
2. Click the gear icon next to "Select type" and select **Web app**.
3. Configure the fields exactly as follows:
   - **Description**: `VC Gurukul API v1`
   - **Execute as**: **Me (your-email@gmail.com)** *(Crucial: This grants the API read/write rights to your Sheet)*
   - **Who has access**: **Anyone** *(Crucial: This allows the frontend client to communicate with the endpoint without forcing students to log in with Google)*
4. Click **Deploy**.
5. Once the deployment finishes, copy the **Web app URL** (it ends with `/exec`). This is the API endpoint to paste into your frontend configuration.

---

## 3. Custom Admin Menu & Validation

Go back to your Google Spreadsheet and refresh the browser tab. You will see a custom menu option called **VC Gurukul** appear in the top bar.

- **Validate Content**: Scans MCQ options for blanks or invalid answer letters (A/B/C/D), validates that the sum of SM rubric marks equals the question marks, checks for missing model answers, duplicate question IDs, and dangling topic references. Failsafe checks prevent broken questions from being served to students. Detailed reports are compiled in the `Import_Errors` tab.
- **Refresh Dashboard**: Compiles leaderboard data and metrics dynamically.
- **Export CSV to Drive**: Generates raw CSV backups of Students, MCQ attempts, and SM attempts. Files are saved in a Google Drive folder named `VC_Gurukul_Backups` inside your Drive.
- **Deploy Check**: Performs a diagnostics check verifying that the security properties are set.

---

## 4. Quotas, Limits, and Scaling

Since this backend runs entirely on a free consumer Google account, it relies on Google Sheets and Apps Script quotas:

| Metric / Service | Consumer Limit | Expected Student Capacity |
|---|---|---|
| **Spreadsheet Size** | 10,000,000 cells max | ~100,000 rows across all tables. |
| **Concurrent Executions** | 30 simultaneous web requests | Up to 150-200 active concurrent users doing tests, thanks to caching. |
| **Properties Read/Write** | 50,000 / day | Ample; only read once for app startup token verification. |
| **Daily Email Triggers** | 100 emails/day | (Not used in core database grading, zero risk). |

### Caching Strategy
To protect the backend from hitting Google sheets read quotas, we implement **`CacheService`** in `Code.gs`:
- **`app_config`** and **`chapters`** listings are cached for **6 hours**.
- If you update configuration keys, chapters, or topics in your sheet, simply click **VC Gurukul** -> **Refresh Dashboard** or run validation to clear/refresh Cache keys, or wait for them to expire.

### What to do when you outgrow the Free Tier
1. **Google Workspace Account ($6/mo)**: Instantly bumps Apps Script execution quotas (e.g. increases concurrent execution limits and API daily limits). No code rewrite required.
2. **Dedicated Cloud Database (Supabase/PostgreSQL)**: If you outgrow Google Sheets (e.g. >200 concurrent users or >100,000 attempts), migrate the database layer to a free or low-cost Supabase instance. The React frontend is designed modularly so that only the fetch/post endpoints need updating.

---

## 5. Adding New Questions in Under 10 Minutes

1. **MCQ**: Double-click the `MCQ_Questions` tab. Enter a unique `q_id` (e.g. `mcq_ch1_001`), reference the target `topic_id` and `chapter_id`, specify correct option as a letter (`A`, `B`, `C`, or `D`), fill option values, and set `is_active` to `true`.
2. **SM**:
   - Add a row in `SM_Questions` with the question text and total marks (e.g., `5`).
   - Add matching rows in `SM_Rubric_Points` representing grading points. **Crucial**: Sum of marks in these rubric rows MUST equal the question's total marks (e.g. 5 points of 1.0 marks each).
   - Add a row in `SM_Model_Answers` with the model answer text for students to reference.
3. Run **VC Gurukul** -> **Validate Content** to make sure no typos exist. If clean, the questions are live immediately.
