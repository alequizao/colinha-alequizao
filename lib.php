<?php
/*
 * Colinha · Alequizão · Desenvolvido por Alequizao <alequizao.dev@gmail.com>
 * https://github.com/alequizao · © 2026 Alequizao. Todos os direitos reservados.
 */
/* Colinha · Alequizão — funções comuns (banco, texto, cargos). */
date_default_timezone_set('America/Maceio');

function db() {
    static $pdo;
    if (!$pdo) {
        $c = require __DIR__ . '/config.php';
        $pdo = new PDO("mysql:host={$c['host']};dbname={$c['banco']};charset=utf8mb4", $c['usuario'], $c['senha'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    }
    return $pdo;
}

/* Minúsculas sem acento, para busca por nome. */
function normaliza($s) {
    $s = mb_strtolower($s, 'UTF-8');
    $s = strtr($s, ['á'=>'a','à'=>'a','â'=>'a','ã'=>'a','ä'=>'a','é'=>'e','ê'=>'e','è'=>'e','ë'=>'e','í'=>'i','ì'=>'i','î'=>'i','ï'=>'i',
        'ó'=>'o','ò'=>'o','ô'=>'o','õ'=>'o','ö'=>'o','ú'=>'u','ù'=>'u','û'=>'u','ü'=>'u','ç'=>'c','ñ'=>'n']);
    return trim(preg_replace('/\s+/', ' ', $s));
}

const CARGOS = [1 => 'Presidente', 2 => 'Vice-presidente', 3 => 'Governador', 4 => 'Vice-governador', 5 => 'Senador',
    6 => 'Deputado Federal', 7 => 'Deputado Estadual', 8 => 'Deputado Distrital', 9 => '1º suplente', 10 => '2º suplente'];
