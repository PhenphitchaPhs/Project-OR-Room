$ErrorActionPreference = 'Stop'

$backendRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$workspaceRoot = Resolve-Path (Join-Path $backendRoot '..')
$frontendRoot = Join-Path $workspaceRoot 'frontend-v'
$wranglerConfig = Get-Content (Join-Path $backendRoot 'wrangler.toml') -Raw

if (-not $wranglerConfig.Contains('database_id = "1831e923-9611-4191-953c-2d8fc5bd5005"')) {
    throw 'The staging D1 binding is missing from wrangler.toml.'
}

if (-not $env:STAGING_E2E_PASSWORD) {
    $passwordBytes = [byte[]]::new(24)
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $random.GetBytes($passwordBytes)
    $random.Dispose()
    $env:STAGING_E2E_PASSWORD = [Convert]::ToBase64String($passwordBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}
if ($env:STAGING_E2E_PASSWORD.Length -lt 12) {
    throw 'STAGING_E2E_PASSWORD must be a test-only password of at least 12 characters.'
}

$env:STAGING_FIXTURE_RESET = 'RESET_STAGING_EXPORT_FIXTURES'
Push-Location $backendRoot
try {
    & wrangler.cmd d1 execute or_room_staging --remote --env staging --file (Join-Path $backendRoot 'schema.sql') --yes
    if ($LASTEXITCODE -ne 0) { throw 'Applying the staging schema failed.' }

    $deployOutput = & wrangler.cmd deploy --env staging 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Deploying the staging Worker failed.' }
    $deployText = $deployOutput -join "`n"
    Write-Output $deployText
    $urlMatch = [regex]::Match($deployText, 'https://[A-Za-z0-9.-]+\.workers\.dev')
    if (-not $urlMatch.Success) { throw 'Could not find the staging Worker URL in Wrangler output.' }
    $stagingApiUrl = $urlMatch.Value

    $jwtBytes = [byte[]]::new(48)
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $random.GetBytes($jwtBytes)
    $random.Dispose()
    $jwtSecret = [Convert]::ToBase64String($jwtBytes)
    $jwtSecret | & wrangler.cmd secret put JWT_SECRET --env staging
    if ($LASTEXITCODE -ne 0) { throw 'Setting the independent staging JWT_SECRET failed.' }
    Remove-Variable jwtSecret

    $fixtureTemplate = Get-Content (Join-Path $backendRoot 'e2e\export-fixtures.sql') -Raw
    # The synthetic staging accounts use a high-entropy test password. A low
    # bcrypt cost keeps login within the Cloudflare Workers CPU budget.
    $passwordHash = & node -e "process.stdout.write(require('bcryptjs').hashSync(process.env.STAGING_E2E_PASSWORD, 4))"
    if ($LASTEXITCODE -ne 0 -or -not $passwordHash) { throw 'Could not hash the test-only staging account password.' }
    $fixtureSql = $fixtureTemplate.Replace('{{PASSWORD_HASH}}', $passwordHash)
    $fixtureFile = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName() + '.sql')
    try {
        [System.IO.File]::WriteAllText($fixtureFile, $fixtureSql, [System.Text.UTF8Encoding]::new($false))
        & wrangler.cmd d1 execute or_room_staging --remote --env staging --file $fixtureFile --yes
        if ($LASTEXITCODE -ne 0) { throw 'Seeding synthetic export records into staging failed.' }
    } finally {
        if (Test-Path -LiteralPath $fixtureFile) { Remove-Item -LiteralPath $fixtureFile -Force }
    }

    $localEnvPath = Join-Path $frontendRoot '.env.staging.local'
    $localEnv = @(
        "STAGING_API_URL=$stagingApiUrl"
        "VITE_API_PROXY_TARGET=$stagingApiUrl"
        "STAGING_E2E_PASSWORD=$env:STAGING_E2E_PASSWORD"
    ) -join "`n"
    [System.IO.File]::WriteAllText($localEnvPath, "$localEnv`n", [System.Text.UTF8Encoding]::new($false))

    Write-Output "Staging Worker: $stagingApiUrl"
    Write-Output "Staging test settings saved to frontend-v/.env.staging.local (ignored by Git)."
} finally {
    Pop-Location
}
