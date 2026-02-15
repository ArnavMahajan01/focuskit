try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $r = Invoke-RestMethod -Uri "https://api.gumroad.com/v2/licenses/verify" -Method Post -Body @{product_id="test"; license_key="test"}
    Write-Host "Response: $($r | ConvertTo-Json)"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "TYPE: $($_.Exception.GetType().FullName)"
    if ($_.Exception.InnerException) {
        Write-Host "INNER: $($_.Exception.InnerException.Message)"
    }
}
