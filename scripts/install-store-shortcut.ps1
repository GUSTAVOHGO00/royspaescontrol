param([Parameter(Mandatory=$true)][string]$AppUrl)
$uri = [Uri]$AppUrl
if ($uri.Scheme -ne 'https') { throw 'Use a URL HTTPS oficial do aplicativo.' }
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcut = Join-Path $desktop "Roy's - Fechamento de Paes.url"
$target = $uri.GetLeftPart([UriPartial]::Authority).TrimEnd('/') + '/loja'
$content = "[InternetShortcut]`r`nURL=$target`r`nIconFile=$env:SystemRoot\System32\SHELL32.dll`r`nIconIndex=14`r`n"
[IO.File]::WriteAllText($shortcut, $content, [Text.Encoding]::ASCII)
Write-Output "Atalho criado: $shortcut"
Write-Output "Destino: $target"
