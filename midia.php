<?php
/*
 * Colinha · Alequizão · Desenvolvido por Alequizao <alequizao.dev@gmail.com>
 * https://github.com/alequizao · © 2026 Alequizao. Todos os direitos reservados.
 */
/* Colinha · Alequizão — foto de candidato / logo de partido com cache local.
   Primeira vez baixa da origem e grava em cache/; depois o Apache serve direto. */
$t = $_GET['t'] ?? ''; $id = $_GET['id'] ?? '';
if ($t === 'f' && preg_match('/^\d{6,15}$/', $id)) {
    $url = "https://assets.colinha.ai/candidatos/fotos/2026/$id.jpeg"; $arq = __DIR__ . "/cache/fotos/$id.jpg";
} elseif ($t === 'l' && preg_match('/^[a-z0-9-]{1,30}$/', $id)) {
    $url = "https://assets.colinha.ai/partidos/$id/logo/sm.jpg"; $arq = __DIR__ . "/cache/logos/$id.jpg";
} else { http_response_code(404); exit; }

if (!is_file($arq)) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 10, CURLOPT_USERAGENT => 'Mozilla/5.0 (colinha-alequizao)']);
    $img = curl_exec($ch); $cod = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($cod !== 200 || !$img || !@getimagesizefromstring($img)) {
        // Sem foto: não deixa a Cloudflare guardar o erro.
        http_response_code(404); header('Cache-Control: no-store'); exit;
    }
    file_put_contents($arq . '.tmp', $img); rename($arq . '.tmp', $arq);
}
header('Content-Type: image/jpeg');
header('Cache-Control: public, max-age=2592000, immutable');
readfile($arq);
