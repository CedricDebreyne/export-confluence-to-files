{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww15080\viewh11580\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 /**\
 * @file Confluence Exporter from Google Sheet\
 * @description This script reads instructions from a Google Sheet to export pages or page trees from Confluence to Google Drive files.\
 * @version 3.0.0\
 */\
\
// --- CONFIGURATION ---\
/**\
 * User-defined settings.\
 * These are the only variables you need to modify.\
 */\
const CONFIG = \{\
  // The URL of your Confluence instance (e.g., 'your-company.atlassian.net')\
  CONFLUENCE_URL: 'decathlon.atlassian.net',\
\
  // Your email address used to log in to Confluence/Atlassian.\
  CONFLUENCE_EMAIL: 'your@email.com',\
\
  // The ID of the Google Sheet containing the export instructions.\
  SHEET_ID: 'sheet_id', // <--- TO BE FILLED\
\
  // The name of the tab in your Google Sheet.\
  SHEET_NAME: 'Pages', // <--- ADJUST IF NECESSARY\
\
  // The ID of the Google Drive folder where the files will be created/updated.\
  DRIVE_FOLDER_ID: 'drive_folder_id', // <--- TO BE FILLED\
\
  // Your Confluence API token.\
  // IMPORTANT: This is a secret. Treat it like a password.\
  // Generate one here: https://id.atlassian.com/manage-profile/security/api-tokens\
  CONFLUENCE_API_TOKEN: 'API_TOKEN' // <--- TO BE FILLED WITH YOUR TOKEN\
\};\
\
\
/**\
 * Main function that orchestrates the export from the spreadsheet instructions.\
 * This is the function you should run.\
 */\
function exportFromSheet() \{\
  try \{\
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);\
    if (!sheet) \{\
      throw new Error(`Sheet "$\{CONFIG.SHEET_NAME\}" was not found in the document.`);\
    \}\
    const data = sheet.getDataRange().getValues();\
    const headers = data.shift(); // Removes and retrieves the header row\
\
    // Step 1: Group tasks by destination file\
    const exportTasks = \{\};\
    data.forEach((row, index) => \{\
      const [address, exportType, toExport, destinationFile] = row;\
\
      // Ignore rows that should not be exported or are incomplete\
      if (toExport.toString().toLowerCase() !== 'yes' || !address || !destinationFile) \{\
        return;\
      \}\
\
      if (!exportTasks[destinationFile]) \{\
        exportTasks[destinationFile] = [];\
      \}\
      exportTasks[destinationFile].push(\{\
        address,\
        exportType\
      \});\
    \});\
\
    Logger.log(`Export tasks scheduled for $\{Object.keys(exportTasks).length\} file(s).`);\
\
    // Step 2: Execute each grouped task\
    for (const destinationFile in exportTasks) \{\
      Logger.log(`--- Starting processing for file: "$\{destinationFile\}" ---`);\
\
      const tasks = exportTasks[destinationFile];\
      const allPageIdsToFetch = new Set(); // Use a Set to avoid duplicate IDs\
\
      for (const task of tasks) \{\
        const pageId = extractPageIdFromUrl(task.address);\
        if (!pageId) \{\
          Logger.log(`Invalid URL or page ID not found for "$\{task.address\}". Task skipped.`);\
          continue;\
        \}\
\
        if (task.exportType.toLowerCase() === 'hierarchy') \{\
          Logger.log(`"Hierarchy" type for page $\{pageId\}. Fetching the full tree.`);\
          allPageIdsToFetch.add(pageId); // Add the root page itself\
          const descendantIds = getAllDescendantPageIds(pageId);\
          if (descendantIds) \{\
            descendantIds.forEach(id => allPageIdsToFetch.add(id));\
          \}\
        \} else \{ // 'Page' or any other type is treated as a single page\
          Logger.log(`"Page" type for page $\{pageId\}. Adding this single page.`);\
          allPageIdsToFetch.add(pageId);\
        \}\
      \}\
\
      const pageIdsArray = Array.from(allPageIdsToFetch);\
      Logger.log(`$\{pageIdsArray.length\} unique page(s) to export to "$\{destinationFile\}".`);\
\
      if (pageIdsArray.length === 0) \{\
        Logger.log(`No pages to process for "$\{destinationFile\}". File skipped.`);\
        continue;\
      \}\
\
      // Step 3: Fetch and format the content\
      const allPagesContent = [];\
      for (let i = 0; i < pageIdsArray.length; i++) \{\
        const pageId = pageIdsArray[i];\
        Logger.log(`Processing page $\{i + 1\} / $\{pageIdsArray.length\} (ID: $\{pageId\})...`);\
        const pageData = getConfluencePageData(pageId);\
        if (pageData) \{\
          const formattedPage = `title: $\{pageData.title\}\\n` +\
            `url: $\{pageData.url\}\\n` +\
            `location: $\{pageData.breadcrumb\}\\n` +\
            `text:\\n$\{pageData.content\}`;\
          allPagesContent.push(formattedPage);\
        \}\
      \}\
\
      // Step 4: Assemble the final content and update the file\
      const now = new Date();\
      const timezone = Session.getScriptTimeZone();\
      const timestamp = Utilities.formatDate(now, timezone, 'dd/MM/yyyy HH:mm:ss');\
      const headerText = `Confluence Export (generated on $\{timestamp\})`;\
\
      const header = `$\{headerText\}\\n\\n---\\n\\n`;\
      const body = allPagesContent.join('\\n\\n---\\n\\n');\
      const finalContent = header + body;\
\
      createOrUpdateFileInFolder(CONFIG.DRIVE_FOLDER_ID, `$\{destinationFile\}.txt`, finalContent);\
      Logger.log(`--- File "$\{destinationFile\}" processed successfully. ---`);\
    \}\
\
    Logger.log('All exports are complete!');\
\
  \} catch (error) \{\
    Logger.log(`A critical error occurred: $\{error.toString()\} \\nStack: $\{error.stack\}`);\
  \}\
\}\
\
/**\
 * Extracts the page ID from a Confluence URL.\
 * @param \{string\} url The full URL of the Confluence page.\
 * @returns \{string|null\} The page ID or null if not found.\
 */\
function extractPageIdFromUrl(url) \{\
  if (!url) return null;\
  const match = url.match(/\\/pages\\/(\\d+)/);\
  return match ? match[1] : null;\
\}\
\
/**\
 * Creates a file in a Google Drive folder or updates its content if it already exists.\
 * @param \{string\} folderId The ID of the destination folder.\
 * @param \{string\} fileName The name of the file to create/update.\
 * @param \{string\} content The new content for the file.\
 */\
function createOrUpdateFileInFolder(folderId, fileName, content) \{\
  try \{\
    const folder = DriveApp.getFolderById(folderId);\
    const files = folder.getFilesByName(fileName);\
\
    if (files.hasNext()) \{\
      // The file exists, so we update it\
      const file = files.next();\
      file.setContent(content);\
      Logger.log(`File "$\{fileName\}" (ID: $\{file.getId()\}) updated successfully.`);\
    \} else \{\
      // The file does not exist, so we create it\
      const newFile = folder.createFile(fileName, content, MimeType.PLAIN_TEXT);\
      Logger.log(`File "$\{fileName\}" (ID: $\{newFile.getId()\}) created successfully.`);\
    \}\
  \} catch (e) \{\
    Logger.log(`Failed to create/update file "$\{fileName\}" in folder ID $\{folderId\}. Error: $\{e.toString()\}`);\
    throw e;\
  \}\
\}\
\
\
// --- CONFLUENCE UTILITY FUNCTIONS (UNCHANGED) ---\
\
/**\
 * Fetches all descendant page IDs from a root page using the Confluence search API.\
 * It reliably handles pagination by following the 'next' links provided by the API.\
 * @param \{string\} rootPageId The ID of the root page.\
 * @returns \{string[]|null\} An array of page IDs, or null on error.\
 */\
function getAllDescendantPageIds(rootPageId) \{\
  const allIds = [];\
  const limit = 50; // Results per API call\
\
  const headers = \{\
    'Authorization': `Basic $\{Utilities.base64Encode(`$\{CONFIG.CONFLUENCE_EMAIL\}:$\{CONFIG.CONFLUENCE_API_TOKEN\}`)\}`,\
    'Accept': 'application/json'\
  \};\
\
  const cql = `ancestor=$\{rootPageId\} ORDER BY title asc`;\
  let nextPageUrl = `https://$\{CONFIG.CONFLUENCE_URL\}/wiki/rest/api/search?cql=$\{encodeURIComponent(cql)\}&limit=$\{limit\}`;\
\
  while (nextPageUrl) \{\
    try \{\
      const response = UrlFetchApp.fetch(nextPageUrl, \{\
        headers: headers,\
        muteHttpExceptions: true\
      \});\
      const responseCode = response.getResponseCode();\
\
      if (responseCode !== 200) \{\
        Logger.log(`Failed to fetch child pages for root $\{rootPageId\}. Code: $\{responseCode\}, Response: $\{response.getContentText()\}`);\
        return null;\
      \}\
\
      const data = JSON.parse(response.getContentText());\
      const pageIds = data.results.map(result => result.content.id);\
\
      if (pageIds.length === 0) \{\
        break;\
      \}\
\
      allIds.push(...pageIds);\
\
      if (data._links && data._links.next) \{\
        nextPageUrl = `https://$\{CONFIG.CONFLUENCE_URL\}/wiki$\{data._links.next\}`;\
      \} else \{\
        nextPageUrl = null;\
      \}\
    \} catch (e) \{\
      Logger.log(`An exception occurred while fetching child pages for root $\{rootPageId\}: $\{e.toString()\}`);\
      return null;\
    \}\
  \}\
  Logger.log(`Found $\{allIds.length\} descendant pages for root ID $\{rootPageId\}.`);\
  return allIds;\
\}\
\
/**\
 * Fetches complete details for a single Confluence page.\
 * @param \{string\} pageId The ID of the page to fetch.\
 * @returns \{object|null\} An object with title, url, breadcrumb, and content, or null on error.\
 */\
function getConfluencePageData(pageId) \{\
  const apiUrl = `https://$\{CONFIG.CONFLUENCE_URL\}/wiki/rest/api/content/$\{pageId\}?expand=body.storage,ancestors`;\
  const encodedCredentials = Utilities.base64Encode(`$\{CONFIG.CONFLUENCE_EMAIL\}:$\{CONFIG.CONFLUENCE_API_TOKEN\}`);\
  const headers = \{\
    'Authorization': `Basic $\{encodedCredentials\}`,\
    'Accept': 'application/json'\
  \};\
  const options = \{\
    'method': 'get',\
    'headers': headers,\
    'muteHttpExceptions': true\
  \};\
\
  try \{\
    const response = UrlFetchApp.fetch(apiUrl, options);\
    if (response.getResponseCode() === 200) \{\
      const data = JSON.parse(response.getContentText());\
\
      const title = data.title;\
      const url = `https://$\{CONFIG.CONFLUENCE_URL\}/wiki$\{data._links.webui\}`;\
\
      const breadcrumbParts = data.ancestors.map(ancestor => ancestor.title);\
      breadcrumbParts.push(title);\
      const breadcrumb = breadcrumbParts.join(' / ');\
\
      const content = data.body.storage.value;\
\
      return \{\
        title,\
        url,\
        breadcrumb,\
        content\
      \};\
    \} else \{\
      Logger.log(`Failed to fetch data for page ID $\{pageId\}. Code: $\{response.getResponseCode()\}`);\
      return null;\
    \}\
  \} catch (e) \{\
    Logger.log(`An exception occurred for page ID $\{pageId\}: $\{e.toString()\}`);\
    return null;\
  \}\
\}}