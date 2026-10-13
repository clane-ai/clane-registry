# Microsoft 365

Connects Clane to your Outlook mail, calendar, OneDrive and SharePoint files, and your
profile, through Microsoft Graph.

This connector is built into Clane. Installing it adds a **Connect** entry under
Settings → Connectors; nothing is connected until you sign in there.

## What you need to connect

An Azure app registration in your Microsoft tenant:

- **Tenant ID** of your Azure AD tenant (or `common` for any tenant)
- **Client ID** of the app registration
- **Client secret** from the app registration's Certificates & secrets page

You enter these on the Connect screen. They are never stored in this registry and never
typed into a chat.

## What it can do

- **Read** (never asks once connected): list, read and search mail and attachments, read
  your calendar, search your files, read your profile.
- **Write** (asks once): create drafts, send mail, move messages.
- **Delete**: none.
