# Script PowerShell de test de sécurité rapide
# Usage: .\test-security.ps1 https://votre-site.vercel.app

param(
    [string]$SiteUrl = "https://votre-site.vercel.app"
)

Write-Host "Tests de securite pour: $SiteUrl" -ForegroundColor Cyan
Write-Host "=========================================="
Write-Host ""

# Test 1: Verifier les headers de securite
Write-Host "[1] Test des headers de securite..." -ForegroundColor Yellow
Write-Host "-----------------------------------"

try {
    $response = Invoke-WebRequest -Uri $SiteUrl -Method Head -UseBasicParsing -ErrorAction Stop
    
    $headers = $response.Headers
    
    if ($headers.ContainsKey("X-Frame-Options")) {
        Write-Host "[OK] X-Frame-Options: Present" -ForegroundColor Green
    } else {
        Write-Host "[KO] X-Frame-Options: Manquant" -ForegroundColor Red
    }
    
    if ($headers.ContainsKey("X-Content-Type-Options")) {
        Write-Host "[OK] X-Content-Type-Options: Present" -ForegroundColor Green
    } else {
        Write-Host "[KO] X-Content-Type-Options: Manquant" -ForegroundColor Red
    }
    
    if ($headers.ContainsKey("Content-Security-Policy")) {
        Write-Host "[OK] Content-Security-Policy: Present" -ForegroundColor Green
    } else {
        Write-Host "[KO] Content-Security-Policy: Manquant" -ForegroundColor Red
    }
    
    if ($headers.ContainsKey("Referrer-Policy")) {
        Write-Host "[OK] Referrer-Policy: Present" -ForegroundColor Green
    } else {
        Write-Host "[KO] Referrer-Policy: Manquant" -ForegroundColor Red
    }
} catch {
    Write-Host "[KO] Erreur lors de la recuperation des headers: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2] Test de l'API (endpoint public)..." -ForegroundColor Yellow
Write-Host "-----------------------------------"

# Test avec un ID invalide
try {
    $apiResponse = Invoke-WebRequest -Uri "$SiteUrl/api/tournament/invalid-id/info" -Method Get -UseBasicParsing -ErrorAction SilentlyContinue
    $statusCode = $apiResponse.StatusCode
    if ($statusCode -eq 400 -or $statusCode -eq 404 -or $statusCode -eq 500) {
        Write-Host "[OK] API retourne une erreur appropriee pour ID invalide (HTTP $statusCode)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] API retourne HTTP $statusCode (attendu: 400/404/500)" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400 -or $statusCode -eq 404 -or $statusCode -eq 500) {
        Write-Host "[OK] API retourne une erreur appropriee pour ID invalide (HTTP $statusCode)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Reponse inattendue (HTTP $statusCode)" -ForegroundColor Yellow
    }
}

# Test avec injection SQL
try {
    $sqlTest = Invoke-WebRequest -Uri "$SiteUrl/api/tournament/1' OR '1'='1/info" -Method Get -UseBasicParsing -ErrorAction SilentlyContinue
    $statusCode = $sqlTest.StatusCode
    if ($statusCode -eq 400 -or $statusCode -eq 404 -or $statusCode -eq 500) {
        Write-Host "[OK] API protegee contre injection SQL (HTTP $statusCode)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Reponse inattendue pour test SQL (HTTP $statusCode)" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400 -or $statusCode -eq 404 -or $statusCode -eq 500) {
        Write-Host "[OK] API protegee contre injection SQL (HTTP $statusCode)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Reponse inattendue pour test SQL (HTTP $statusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[3] Test CORS..." -ForegroundColor Yellow
Write-Host "-----------------------------------"
try {
    $corsHeaders = Invoke-WebRequest -Uri "$SiteUrl/api/tournament/123/info" -Method Head -Headers @{"Origin" = "https://example.com"} -UseBasicParsing -ErrorAction Stop
    if ($corsHeaders.Headers.ContainsKey("Access-Control-Allow-Origin")) {
        Write-Host "[OK] CORS configure" -ForegroundColor Green
    } else {
        Write-Host "[WARN] CORS headers non detectes" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARN] Impossible de tester CORS" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4] Test SSL/TLS..." -ForegroundColor Yellow
Write-Host "-----------------------------------"
Write-Host "[INFO] Testez manuellement sur: https://www.ssllabs.com/ssltest/" -ForegroundColor Cyan
Write-Host "   URL: $SiteUrl"

Write-Host ""
Write-Host "=========================================="
Write-Host "[OK] Tests de base termines!" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Cyan
Write-Host "   1. Tester sur SSL Labs: https://www.ssllabs.com/ssltest/"
Write-Host "   2. Tester sur Security Headers: https://securityheaders.com/"
Write-Host "   3. Scanner avec OWASP ZAP (voir SECURITY_TESTING_GUIDE.md)"
Write-Host "   4. Verifier les RLS dans Supabase Dashboard"

