# GTK Runtime Installation Guide (Windows)

This project uses **WeasyPrint** to generate high-quality PDF evaluation reports. On Windows, WeasyPrint requires the **GTK+ Runtime** to be installed on your system to handle PDF rendering and fonts.

### ⚠️ When do you need this?
*   **Running with Docker?** You do **NOT** need this. The Docker image automatically handles these dependencies.
*   **Running Backend Natively on Windows?** You **MUST** follow this guide. Without GTK, the `/api/v1/reports/render-pdf` endpoint will fail.

---

## Installation Steps

1.  **Locate the Installer**: Find the `gtk-installer.exe` file in the root of this project.
2.  **Run the Installer**: Double-click `gtk-installer.exe` to begin the setup.
3.  **Default Settings**: You can keep the default installation path (usually `C:\Program Files\GTK3-Runtime Win64`).
4.  **Add to PATH**: 
    *   During installation, ensure the option **"Add to system PATH"** is checked.
    *   If you've already installed it and it's not working, manually add the `bin` folder (e.g., `C:\Program Files\GTK3-Runtime Win64\bin`) to your Windows System Environment Variables.
5.  **Restart Your Terminal**: After installation, close and reopen your PowerShell, CMD, or VS Code terminal for the changes to take effect.

## Troubleshooting

### "dlopen() failed to load a library: gobject-2.0"
This error means Python cannot find the GTK libraries.
- Ensure the GTK `bin` folder is in your System PATH.
- Verify you installed the **64-bit** version (the provided installer is 64-bit).

### Fonts not rendering correctly?
The GTK runtime uses the fonts installed on your Windows system. If specific symbols are missing, ensure you have common fonts like Arial or Roboto installed.

---
*Built for SmartTender AI: Unnati — Technical Evaluation Platform*
