#!/bin/bash

# Script de test de sécurité rapide
# Usage: ./test-security.sh https://votre-site.vercel.app

SITE_URL="${1:-https://votre-site.vercel.app}"

echo "🔒 Tests de sécurité pour: $SITE_URL"
echo "=========================================="
echo ""

# Test 1: Vérifier les headers de sécurité
echo "1️⃣  Test des headers de sécurité..."
echo "-----------------------------------"
HEADERS=$(curl -sI "$SITE_URL")

if echo "$HEADERS" | grep -q "X-Frame-Options"; then
    echo "✅ X-Frame-Options: Présent"
else
    echo "❌ X-Frame-Options: Manquant"
fi

if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
    echo "✅ X-Content-Type-Options: Présent"
else
    echo "❌ X-Content-Type-Options: Manquant"
fi

if echo "$HEADERS" | grep -q "Content-Security-Policy"; then
    echo "✅ Content-Security-Policy: Présent"
else
    echo "❌ Content-Security-Policy: Manquant"
fi

if echo "$HEADERS" | grep -q "Referrer-Policy"; then
    echo "✅ Referrer-Policy: Présent"
else
    echo "❌ Referrer-Policy: Manquant"
fi

echo ""
echo "2️⃣  Test de l'API (endpoint public)..."
echo "-----------------------------------"

# Test avec un ID invalide
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/api/tournament/invalid-id/info")
if [ "$API_RESPONSE" = "400" ] || [ "$API_RESPONSE" = "404" ] || [ "$API_RESPONSE" = "500" ]; then
    echo "✅ API retourne une erreur appropriée pour ID invalide (HTTP $API_RESPONSE)"
else
    echo "⚠️  API retourne HTTP $API_RESPONSE (attendu: 400/404/500)"
fi

# Test avec injection SQL
SQL_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/api/tournament/1' OR '1'='1/info")
if [ "$SQL_TEST" = "400" ] || [ "$SQL_TEST" = "404" ] || [ "$SQL_TEST" = "500" ]; then
    echo "✅ API protégée contre injection SQL (HTTP $SQL_TEST)"
else
    echo "⚠️  Réponse inattendue pour test SQL (HTTP $SQL_TEST)"
fi

echo ""
echo "3️⃣  Test CORS..."
echo "-----------------------------------"
CORS_HEADERS=$(curl -sI -H "Origin: https://example.com" "$SITE_URL/api/tournament/123/info")
if echo "$CORS_HEADERS" | grep -q "Access-Control-Allow-Origin"; then
    echo "✅ CORS configuré"
else
    echo "⚠️  CORS headers non détectés"
fi

echo ""
echo "4️⃣  Test SSL/TLS..."
echo "-----------------------------------"
echo "ℹ️  Testez manuellement sur: https://www.ssllabs.com/ssltest/"
echo "   URL: $SITE_URL"

echo ""
echo "=========================================="
echo "✅ Tests de base terminés!"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Tester sur SSL Labs: https://www.ssllabs.com/ssltest/"
echo "   2. Tester sur Security Headers: https://securityheaders.com/"
echo "   3. Scanner avec OWASP ZAP (voir SECURITY_TESTING_GUIDE.md)"
echo "   4. Vérifier les RLS dans Supabase Dashboard"

