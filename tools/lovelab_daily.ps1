# Follower tracker daily snapshot (Windows Task Scheduler: "hirofarm-lovelab-daily").
# Instagram blocks API calls (429), so collection goes through the logged-in Chrome
# via Claude Code headless + Claude in Chrome. Steps live in lovelab_daily_prompt.md.
# ASCII only: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.
param([string]$Prompt = 'Read tools/lovelab_daily_prompt.md and follow it exactly.')
$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
$log = Join-Path $env:LOCALAPPDATA 'hirofarm-lovelab-daily.log'
$env:PYTHONIOENCODING = 'utf-8'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)

"==== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') start" | Out-File $log -Append -Encoding utf8

# The extension only answers while Chrome is running.
if (-not (Get-Process chrome -ErrorAction SilentlyContinue)) {
  Start-Process chrome
  Start-Sleep -Seconds 20
}

$claude = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
& $claude -p $Prompt `
  --chrome `
  --permission-mode acceptEdits `
  --add-dir $env:TEMP `
  --allowedTools 'mcp__claude-in-chrome' 'Read' 'Write' 'Glob' 'Grep' 'ToolSearch' 'Bash(py -3 tools/lovelab_apply.py:*)' 'PowerShell(py -3 tools/lovelab_apply.py:*)' `
  2>&1 | Out-File $log -Append -Encoding utf8

"==== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') end (exit $LASTEXITCODE)" | Out-File $log -Append -Encoding utf8
