$app = New-Object -ComObject Shell.Application
$app.ShellExecute("cmd.exe", "/c C:\Users\CSE\Downloads\AI-study-companion\scripts\install_pgvector.bat", "", "runas", 1)
Start-Sleep -Seconds 3
