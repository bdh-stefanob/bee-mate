# publish-to-github.ps1
# Crea il repo su GitHub (privato di default) e pusha il primo commit.
# Usa GitHub CLI (gh) con la tua autenticazione locale - nessun token in chiaro.
#
# Prerequisiti:
#   - bootstrap.ps1 gia eseguito (esiste .git con almeno un commit)
#   - gh CLI installato e loggato (gh auth login)
#
# Uso:
#   .\publish-to-github.ps1                          # default: bdd-automation-scaffold, private
#   .\publish-to-github.ps1 -RepoName mio-repo       # nome custom
#   .\publish-to-github.ps1 -Public                  # pubblico (default e privato)

param(
    [string]$RepoName = "bdd-automation-scaffold",
    [switch]$Public
)

$ErrorActionPreference = 'Stop'

function Step($msg) {
    Write-Host ""
    Write-Host "=== $msg ===" -ForegroundColor Cyan
}

# 1. Prerequisiti
Step "Verifica prerequisiti"
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI 'gh' non trovato. Installalo da https://cli.github.com/ e poi 'gh auth login'."
}
if (-not (Test-Path .git)) {
    throw "Non sembra una repo git. Lancia prima .\bootstrap.ps1"
}

# 2. Auth status
Step "Verifica autenticazione GitHub"
gh auth status
if ($LASTEXITCODE -ne 0) {
    throw "gh non e' autenticato. Esegui 'gh auth login' e riprova."
}

# 3. Account GitHub
$ghUser = gh api user --jq .login
Write-Host "Account GitHub: $ghUser" -ForegroundColor Green

# 4. Verifica almeno un commit
$head = git rev-parse --verify HEAD 2>$null
if (-not $head) {
    throw "Nessun commit nella repo. Lancia prima .\bootstrap.ps1"
}

# 5. Visibility
$visibility = if ($Public) { "--public" } else { "--private" }
$visLabel = if ($Public) { "PUBLIC" } else { "PRIVATE" }

# 6. Conferma esplicita
Write-Host ""
Write-Host "STO PER CREARE:" -ForegroundColor Yellow
Write-Host "  Repo:        $ghUser/$RepoName"
Write-Host "  Visibility:  $visLabel"
Write-Host "  Source:      $(Get-Location)"
Write-Host "  Branch:      $(git branch --show-current)"
Write-Host ""
$confirm = Read-Host "Confermi? (yes/no)"
if ($confirm -ne 'yes') {
    Write-Host "Annullato." -ForegroundColor Yellow
    exit 0
}

# 7. Check se il repo esiste gia'
Step "Controllo se il repo esiste gia"
gh repo view "$ghUser/$RepoName" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    throw "Il repo $ghUser/$RepoName esiste gia'. Scegli un altro nome con -RepoName."
}

# 8. Create + push
Step "gh repo create + push"
gh repo create $RepoName $visibility --source=. --remote=origin --push
if ($LASTEXITCODE -ne 0) { throw "gh repo create fallito" }

# 9. Done
Step "Fatto"
$url = "https://github.com/$ghUser/$RepoName"
Write-Host "Repo creato e push completato:" -ForegroundColor Green
Write-Host "  $url"
Write-Host ""
Write-Host "Apri nel browser: gh repo view --web"
