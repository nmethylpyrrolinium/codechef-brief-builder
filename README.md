# CodeChef ZHCET Chapter - Faculty Briefing PDF Builder

This repository is a self-contained, lightweight tool designed for the **Editorial Lead** of the CodeChef ZHCET Chapter. It allows you to maintain faculty briefing documents in Markdown and automatically compile them into print-ready, professional A4 PDFs.

> [!IMPORTANT]
> **🎉 Congratulations on becoming the Editorial Lead!**
>
> Welcome to the team! You have inherited a key leadership role in managing our chapter's publications, contest editorials, and event reporting. To help you succeed and save you time, this project was built to automate the tedious process of writing, formatting, and rendering faculty briefings. You can focus on the content—the tool handles the typesetting for you.

---

## 📥 Getting Started (Cloning & Offline Use)

There are two ways to get this project onto your local system to use it (even completely offline):

### Option A: Clone Using Git (Recommended)
Cloning the repository sets you up for easy updates, tracking changes, and committing edits.

1. **Open your Terminal** (macOS/Linux) or **Command Prompt/PowerShell** (Windows).
2. **Clone the repository** by running the following command (replace with your actual GitHub URL once uploaded):
   ```bash
   git clone https://github.com/ahmadxfaraz/codechef-brief-builder.git
   ```
3. **Navigate into the project directory**:
   ```bash
   cd codechef-brief-builder
   ```

### Option B: Download as ZIP (No Git Required)
If you don't want to use Git, you can download the project files directly:
1. Go to the GitHub repository page in your web browser.
2. Click the green **Code** button at the top right of the file list.
3. Click **Download ZIP**.
4. Extract the downloaded ZIP file to a folder on your local system.
5. Open your terminal and navigate to the extracted directory:
   ```bash
   cd /path/to/extracted/codechef-brief-builder
   ```

> [!NOTE]
> Once you have cloned or downloaded the project, it can be run **completely offline**. There are no external `npm` package downloads or internet connections required to compile your PDFs.

---

## 🛠️ Prerequisites

To use this tool, you need two things installed on your system:
1. **Node.js** (v18 or higher)
2. **Google Chrome** (used headlessly to render and print the A4 PDF)

No external Node package installations are required! The builder script uses standard libraries and communicates directly with your Chrome installation.

---

## 📁 File Structure

* **[codechef_zhcet_faculty_brief_2025_26.md](file:///Users/ahmadxfaraz/Documents/Playground/codechef-brief-builder/codechef_zhcet_faculty_brief_2025_26.md)**: The Markdown source of truth for the academic year 2025-26.
* **[codechef_zhcet_faculty_brief_2024_25.md](file:///Users/ahmadxfaraz/Documents/Playground/codechef-brief-builder/codechef_zhcet_faculty_brief_2024_25.md)**: The Markdown source of truth for the academic year 2024-25.
* **[build-brief.mjs](file:///Users/ahmadxfaraz/Documents/Playground/codechef-brief-builder/build-brief.mjs)**: The compilation and generation script. It parses markdown, renders HTML, and uses Chrome to print a PDF.
* **[package.json](file:///Users/ahmadxfaraz/Documents/Playground/codechef-brief-builder/package.json)**: Holds scripts to build and check your files easily.

---

## 🚀 Step-by-Step Guide for the Next Editorial Lead

Follow these steps to create or update a faculty briefing:

### Step 1: Create or Edit the Markdown Briefing
If you are starting a new academic year (e.g. `2026_27`):
1. Copy an existing briefing file, for example, copy [codechef_zhcet_faculty_brief_2025_26.md](file:///Users/ahmadxfaraz/Documents/Playground/codechef-brief-builder/codechef_zhcet_faculty_brief_2025_26.md) and rename it to `codechef_zhcet_faculty_brief_2026_27.md`.
2. Edit the content of the new markdown file. Keep the formatting contract intact:
   * **Title**: Starting with `# Annual Chapter Briefing by ...`
   * **Metadata Lines**: Specifying `**Faculty Advisor:**`, `**Chapter:**`, `**Reporting Period:**`, and `**Total Events Conducted:**`.
   * **Sections**: Defined using `## <Section Name>` headings (e.g., `## Executive Summary`, `## Summary of Events`, `## Detailed Event Notes`, `## Office Bearers`).
   * **Detailed Event Notes**: Each event heading starts with `### <Event Name>`, followed by `**Date:**`, `**Type:**`, and `**Audience:**` paragraphs.

### Step 2: Build the Briefing (HTML & PDF)
Open your terminal in this project folder and run:

* **For the default/current year (2025-26)**:
  ```bash
  npm run build
  ```

* **For a custom year (e.g., 2026-27)**:
  Run the Node script directly passing the year key as an argument:
  ```bash
  node build-brief.mjs 2026_27
  ```

This will generate `codechef_zhcet_faculty_brief_2026_27.html` and `codechef_zhcet_faculty_brief_2026_27.pdf` in the same directory.

### Step 3: Validate the Markdown (Optional Check)
To check if the Markdown compiles correctly and matches all layout constraints without rendering a new PDF, run:
```bash
# For 2025-26 default
npm run check

# For a custom year
node build-brief.mjs 2026_27 --check
```

---

## 🔍 Troubleshooting Chrome Path

If the build script fails with a "Chrome binary not found" error, it means the script is looking for Chrome in a different location than where it's installed.
* On macOS, the script expects Chrome at:
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
* If you have Chrome installed in a different location, you can set the `CHROME_PATH` environment variable before running the script:
  ```bash
  CHROME_PATH="/your/custom/path/to/chrome" npm run build
  ```
