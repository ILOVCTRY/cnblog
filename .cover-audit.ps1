$ErrorActionPreference = 'Stop'
$r = Invoke-WebRequest -Uri "https://www.cnblogs.com/MillionMind?_t=$(Get-Random)" -UseBasicParsing -TimeoutSec 30
$html = $r.Content

"== CNB_COVER_POOL in page =="
"  defined on page: " + ($html -match 'CNB_COVER_POOL')
"  CNB_COVER_MAP:   " + ($html -match 'CNB_COVER_MAP')
"  CNB_QUOTES:      " + ($html -match 'CNB_QUOTES')

"`n== sidebar announcements / scripts region =="
$m = [regex]::Match($html, '(?s)sideBarAnnounce.*?</div>')
if ($m.Success) { $m.Value.Substring(0, [Math]::Min(1200, $m.Value.Length)) -replace '\s+', ' ' }