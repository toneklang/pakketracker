
/**
 * Note: To use this in production, you would register an app in 
 * Azure Portal (portal.azure.com) and get a Client ID.
 */

const CLIENT_ID = 'YOUR_MICROSOFT_CLIENT_ID'; // Placeholder
const SCOPES = ['https://graph.microsoft.com/Mail.Read'];

export interface OutlookEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  body: { content: string };
  from: { emailAddress: { name: string, address: string } };
}

export async function fetchOutlookEmails(accessToken: string, folderName: string = "Packages"): Promise<OutlookEmail[]> {
  try {
    // 1. Get the folder ID for the "Packages" folder
    const folderResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/mailFolders?$filter=displayName eq '${folderName}'`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const folders = await folderResponse.json();
    
    if (!folders.value || folders.value.length === 0) {
      throw new Error(`Folder '${folderName}' not found. Please create it in Outlook.`);
    }

    const folderId = folders.value[0].id;

    // 2. Fetch the latest messages from that folder
    const messagesResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/mailFolders/${folderId}/messages?$top=10&$select=id,subject,bodyPreview,body,from`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const messages = await messagesResponse.json();
    
    return messages.value || [];
  } catch (error) {
    console.error("Outlook Sync Error:", error);
    throw error;
  }
}

// Mock auth flow for the UI demo - in real app would use MSAL.js
export function loginToOutlook(): Promise<string> {
  return new Promise((resolve) => {
    // This is a simulation. In a real environment, you'd use a popup or redirect.
    console.log("Redirecting to Microsoft login...");
    setTimeout(() => {
      resolve("MOCK_ACCESS_TOKEN");
    }, 1000);
  });
}
