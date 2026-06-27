Set WshShell = CreateObject("WScript.Shell")

' Run Vite Dev Server silently on port 5173
WshShell.Run "cmd.exe /c npm run dev -- --host 127.0.0.1 --port 5173", 0, false

' Run Local Bridge Server silently on port 5188
WshShell.Run "cmd.exe /c node tools/local-bridge.js", 0, false

' Inform the user with an auto-closing popup (closes after 5 seconds)
WshShell.Popup "AntiQuotar CMS & Local Bridge have started silently in the background!" & vbCrLf & _
               "CMS: http://127.0.0.1:5173" & vbCrLf & _
               "Bridge: http://127.0.0.1:5188", 5, "AntiQuotar Silent Launcher", 64
