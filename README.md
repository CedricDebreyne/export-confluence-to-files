# export-confluence-to-files
Export confluence pages to txt files to train Gemini

INSTRUCTIONS
1. Create GSheet file
  GSheet name: what you want

  Tab name: “Pages”

  Column
    **Address**: Page’s adress to export. Only the ID of the page (example: 189973811) will be used. The end of the URL can change without impact.
    **Export type**: Type of export. Options:
      **Page**: Only the defined page will be exported
      **Hierarchy**: The page and all its children pages will be exported
    **To export**: Define if the page/hierachy has to be exported. Options:
        **Yes**:  Page/hierachy is exported 
        **No**: Page/hierachy not exported
    **Destination** file: Name of the destination file (without extension). Several pages can be exported to the same file.
  Note the Google Sheet ID: (from the URL)

2. Create destination Google Drive directory
  Create a Google Drive directory where your files will be generated.
  Note the Google Sheet ID: (from the URL)

3. Create Confluence token
  To create a Confluence token
    Go to Confluence
    Click on your account picture
    Click on Account setting
    Click on “Security” tab
    In API token, click on Create and manage API tokens
    Use “Create and manage API token” form with the name you want
    Save the API token’s code in safe place.

4. Create Apps Script 
  In Google Apps Script, create a script with following code (export_confluence_to_files.js)
 
  Update following settings with your own data:
    CONFLUENCE_EMAIL: 'your@email.com' Your Decathlon email
    SHEET_ID: 'sheet_id' Your configuration GSheet 
    SHEET_NAME: ‘Pages' The name of your tab in the Gsheet (to adjust if it’s not “Pages”)
    DRIVE_FOLDER_ID: 'drive_folder_id' Your destination Drive directory
    CONFLUENCE_API_TOKEN: 'API_TOKEN' Your Confluence token

  5. Run the script
      Click somewhere in exportFromSheet code
      Clik on “Execute”
