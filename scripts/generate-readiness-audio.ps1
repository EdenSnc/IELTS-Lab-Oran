param([string]$PackPath = 'src/lib/diagnostic/readiness-original-pack.json', [string]$OutputRoot = 'public')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw 'ffmpeg is required for static MP3 generation' }
$readinessPack = Get-Content -LiteralPath $PackPath -Raw | ConvertFrom-Json
$readinessSpeaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $readinessVoice = $readinessSpeaker.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'en-*' } | Select-Object -First 1
  if (-not $readinessVoice) { throw 'No installed English system voice. Audio generation did not run.' }
  $readinessSpeaker.SelectVoice($readinessVoice.VoiceInfo.Name)
  $readinessSpeaker.Rate = -1
  foreach ($readinessPart in $readinessPack.parts | Where-Object { $_.audio }) {
    $readinessOutput = Join-Path (Resolve-Path -LiteralPath $OutputRoot) $readinessPart.audio
    New-Item -ItemType Directory -Path (Split-Path -Parent $readinessOutput) -Force | Out-Null
    if (Test-Path -LiteralPath $readinessOutput) { throw 'Refusing to overwrite versioned audio; generate a new pack version instead.' }
    $readinessRaw = Join-Path ([System.IO.Path]::GetTempPath()) ('ieltslab-audio-' + [guid]::NewGuid().ToString('N') + '.wav')
    $readinessSpeaker.SetOutputToWaveFile($readinessRaw, (New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)))
    $readinessXml = [System.Security.SecurityElement]::Escape($readinessPart.script)
    $readinessXml = $readinessXml.Replace("`n", '<break time="600ms"/>')
    $readinessSpeaker.SpeakSsml('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><p>IELTS Lab readiness diagnostic. ' + [System.Security.SecurityElement]::Escape($readinessPart.title) + '. Read the questions now.</p><break time="30000ms"/><p>' + $readinessXml + '</p><break time="15000ms"/><p>That is the end of this recording. Check your answers.</p></speak>')
    $readinessSpeaker.SetOutputToNull()
    & ffmpeg -n -hide_banner -loglevel error -i $readinessRaw -ar 16000 -ac 1 -b:a 64k -codec:a libmp3lame $readinessOutput
    if ($LASTEXITCODE -ne 0) { throw 'MP3 conversion failed; original temporary WAV preserved' }
    Remove-Item -LiteralPath $readinessRaw
    Get-Item -LiteralPath $readinessOutput | Select-Object Name,Length
  }
} finally { $readinessSpeaker.Dispose() }
