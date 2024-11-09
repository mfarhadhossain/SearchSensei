# SearchSensei: featuring Sensitivity-Based Search Customization and Data Minimization Alerts.

SearchSensei is a browser tool that helps you protect sensitive information in search queries. It customizes searches to limit data sharing and alerts you to unnecessary data collection.

## Getting Started with SearchSensei

### Step 1: Clone the SearchSensei Repository

To download SearchSensei, use the following command to clone the repository:

```bash
git clone https://github.com/mfarhadhossain/SearchSensei.git
```

Next, open the folder where you downloaded SearchSensei:

```bash
cd SearchSensei
```

### Step 2: Install Required Packages

In the SearchSensei folder, install the necessary packages by running:

```bash
npm i
```

### Step 3: Build SearchSensei

- **For testing**:
  To quickly set up SearchSensei for testing, run:

  ```bash
  npm start
  ```

  This will bundle the files for quick development testing.

- **For production**:
  To create the final version of SearchSensei, run:
  ```bash
  npm run build
  ```
  This command will generate an optimized build in the `dist` folder.

### Step 4: Load SearchSensei in Chrome

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `dist` folder inside your SearchSensei folder.

### How to Use SearchSensei

After installing SearchSensei in Chrome:

1. When you enter a search term in your search engine, SearchSensei will scan your input and suggest actions if sensitive terms are detected.
2. Follow the prompts to manage each sensitive term by keeping, replacing, or abstracting it for privacy.
3. SearchSensei will also alert you if additional data collection by the search engine is detected.

---

Thank you for choosing SearchSensei to enhance your search privacy! We hope it proves to be both effective and easy to use.
