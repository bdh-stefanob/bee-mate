# bootstrap.ps1
# Lancialo UNA volta dalla cartella del repo per:
#   - installare le dipendenze
#   - scaricare Chromium di Playwright
#   - validare il progetto (tsc + cucumber dry-run + catalog)
#   - inizializzare git con il primo commit
#
# Uso: da PowerShell, dentro la cartella bdd-automation-scaffold/
#   .\bootstrap.ps1

$ErrorActionPreference = 'Stop'
# PowerShell tratta lo stderr dei comandi nativi come errore terminante
# anche quando il processo esce con 0. Disabilito quel comportamento:
# ci affidiamo a $LASTEXITCODE per i comandi esterni.
$PSNativeCommandUseErrorActionPreference = $false

function Step($msg) {
    Write-Host ""
    Write-Host "=== $msg ===" -ForegroundColor Cyan
}

function Invoke-Native {
    param([string]$Label, [scriptblock]$Block)
    & $Block
    if ($LASTEXITCODE -ne 0) { throw "$Label fallito (exit $LASTEXITCODE)" }
}

function Require-Cmd($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "$name non trovato nel PATH. Installalo prima di continuare."
    }
}

# 0. Prerequisiti
Step "Verifica prerequisiti"
Require-Cmd node
Require-Cmd npm
Require-Cmd npx
Require-Cmd git
Write-Host "node $(node --version)  npm $(npm --version)  git $((git --version) -replace 'git version ','')"

# 0bis. Pulizia eventuale node_modules residuo (corrotto da sessioni precedenti)
if (Test-Path node_modules) {
    Step "Rimuovo node_modules residuo"
    try {
        Remove-Item -Recurse -Force node_modules -ErrorAction Stop
    } catch {
        Write-Host "AVVISO: impossibile rimuovere node_modules ($($_.Exception.Message))." -ForegroundColor Yellow
        Write-Host "Probabile causa: OneDrive sta sincronizzando file precedenti." -ForegroundColor Yellow
        Write-Host "Opzioni:" -ForegroundColor Yellow
        Write-Host "  1. Metti in pausa la sync OneDrive (icona nella tray) e rilancia."
        Write-Host "  2. Cancella node_modules manualmente da Esplora risorse e rilancia."
        Write-Host "  3. Sposta lo scaffold fuori da OneDrive (es. C:\dev\) e rilancia."
        throw "Pulizia node_modules fallita."
    }
}
if (Test-Path package-lock.json) {
    Remove-Item -Force package-lock.json
}

# 1. npm install
Step "npm install"
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm install fallito" }

# 2. Playwright Chromium
Step "npx playwright install chromium"
npx playwright install chromium
if ($LASTEXITCODE -ne 0) { throw "playwright install fallito" }

# 3. TypeScript check
Step "npx tsc --noEmit"
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "tsc --noEmit ha trovato errori" }
Write-Host "tsc OK" -ForegroundColor Green

# 4. Cucumber dry-run
Step "npx cucumber-js --dry-run"
$dryOutput = (& npx cucumber-js --dry-run 2>&1 | Out-String)
Write-Host $dryOutput
if ($LASTEXITCODE -ne 0) { throw "cucumber dry-run fallito (exit $LASTEXITCODE)" }
# 'undefined' compare nel sommario tipo "0 (0 undefined)" - cerco match veri
if ($dryOutput -match '\b[1-9]\d*\s+undefined\b') {
    throw "Trovati step UNDEFINED nel dry-run. Verifica le definizioni step."
}
Write-Host "Dry-run OK (atteso: 5 scenari / 18 step, 0 undefined)" -ForegroundColor Green

# 5. Step catalog markdown (solo render — non sovrascrive step-catalog.json)
# NOTA: npm run catalog reimposta step-catalog.json dai .steps.ts implementati,
# perdendo gli step @wanted del team. Usiamo solo render-markdown.ts che legge
# step-catalog.json esistente e genera STEP_CATALOG.md senza toccare il catalogo.
Step "npx ts-node scripts/render-markdown.ts"
npx ts-node scripts/render-markdown.ts
if ($LASTEXITCODE -ne 0) { throw "render-markdown.ts fallito" }
if (-not (Test-Path STEP_CATALOG.md)) { throw "STEP_CATALOG.md non generato" }
Write-Host "STEP_CATALOG.md rigenerato" -ForegroundColor Green

# 6. Git init + primo commit
Step "Git init"
if (-not (Test-Path .git)) {
    git init
    git branch -M main
} else {
    Write-Host "Repo git gia inizializzato, salto git init"
}

Step "Verifica .gitignore prima del commit"
$ignored = @('node_modules', '.env', 'reports', 'dist', 'cucumber-messages.ndjson', 'step-catalog.json')
foreach ($pattern in $ignored) {
    $hit = git check-ignore -q $pattern 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ignored: $pattern" -ForegroundColor DarkGray
    }
}

Step "git status (anteprima)"
git status --short

Step "git add + first commit"
git add .
$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "Nessun file da committare (gia tutto in history?)" -ForegroundColor Yellow
} else {
    git commit -m "chore: initial commit - BDD automation scaffold (Playwright + Cucumber.js + TS)"
    if ($LASTEXITCODE -ne 0) { throw "git commit fallito" }
}

Write-Host ""
Write-Host "BOOTSTRAP COMPLETATO." -ForegroundColor Green
Write-Host "Prossimo step: .\publish-to-github.ps1   (crea il repo su GitHub e pusha)"
