<?php
/*
 * Colinha · Alequizão · Desenvolvido por Alequizao <alequizao.dev@gmail.com>
 * https://github.com/alequizao · © 2026 Alequizao. Todos os direitos reservados.
 */
/*
 * Colinha · Alequizão — API (só leitura). Nada do eleitor chega aqui:
 * a colinha fica no aparelho; o servidor só entrega a lista pública de candidatos.
 */
require __DIR__ . '/lib.php';
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function sai($d, $cache = 300) {
    header('Cache-Control: public, max-age=' . $cache);
    echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function erro($msg, $cod = 400) { http_response_code($cod); header('Cache-Control: no-store'); echo json_encode(['erro' => $msg]); exit; }

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

/* Início da ordem "A-Z rotativa": muda todo dia, para ninguém ficar sempre no topo. */
function letraDoDia() {
    $pares = ['A','B','C','D','E','F','G','H','I','J','L','M','N','O','P','R','S','T','V'];
    $d = (int)date('z') + 7 * (int)date('Y');
    $l1 = $pares[$d % count($pares)];
    $l2 = $pares[intdiv($d, count($pares)) % count($pares)];
    return $l1 . $l2;
}

function linha($c) {
    $o = ['sq' => (string)$c['sq'], 'nome' => $c['nome'], 'num' => $c['num'], 'sigla' => $c['sigla'], 'uf' => $c['uf'],
          'cargo' => (int)$c['cargo'], 'slug' => $c['slug'], 'julg' => $c['julg']];
    if ($c['fora']) $o['fora'] = $c['fora'];
    if ($c['situacao']) $o['sit'] = $c['situacao'];
    if ($c['fem']) $o['fem'] = 1;
    return $o;
}

$a = $_GET['a'] ?? '';
$uf = strtoupper(substr($_GET['uf'] ?? '', 0, 2));
$cargo = (int)($_GET['cargo'] ?? 0);
$db = db();

switch ($a) {

case 'candidatos': {
    if (!in_array($uf, UFS) && $cargo !== 1) erro('uf inválida');
    if ($cargo < 1 || $cargo > 8) erro('cargo inválido');
    $w = ['cargo = ?']; $p = [$cargo];
    if ($cargo !== 1) { $w[] = 'uf = ?'; $p[] = $uf; }
    $q = trim($_GET['q'] ?? '');
    if ($q !== '') {
        if (ctype_digit($q)) { $w[] = 'num LIKE ?'; $p[] = $q . '%'; }
        else foreach (explode(' ', normaliza($q)) as $t) if ($t !== '') { $w[] = 'busca LIKE ?'; $p[] = '%' . $t . '%'; }
    }
    if (!empty($_GET['partido'])) { $w[] = 'sigla = ?'; $p[] = $_GET['partido']; }
    $st = $db->prepare('SELECT * FROM candidatos WHERE ' . implode(' AND ', $w));
    $st->execute($p);
    $l = $st->fetchAll();
    $ordem = $_GET['ordem'] ?? 'rotativa';
    $letra = letraDoDia();
    $chave = fn($c) => normaliza($c['nome']);
    usort($l, function ($x, $y) use ($ordem, $letra, $chave, $q) {
        // Quem sai da urna (renúncia, indeferido) vai para o fim.
        $fx = $x['fora'] ? 1 : 0; $fy = $y['fora'] ? 1 : 0;
        if ($fx !== $fy) return $fx - $fy;
        if ($q !== '' && ctype_digit($q)) { $ex = $x['num'] === $q ? 0 : 1; $ey = $y['num'] === $q ? 0 : 1; if ($ex !== $ey) return $ex - $ey; }
        if ($ordem === 'numero') return strcmp($x['num'], $y['num']);
        $a = $chave($x); $b = $chave($y);
        if ($ordem === 'za') return strcmp($b, $a);
        if ($ordem === 'rotativa') {
            $lt = strtolower($letra);
            $ra = strcmp($a, $lt) < 0 ? 1 : 0; $rb = strcmp($b, $lt) < 0 ? 1 : 0;
            if ($ra !== $rb) return $ra - $rb;
        }
        return strcmp($a, $b);
    });
    $siglas = array_values(array_unique(array_column($l, 'sigla'))); sort($siglas);
    sai(['candidatos' => array_map('linha', $l), 'total' => count($l), 'letra' => $letra, 'siglas' => $siglas]);
}

case 'numero': { // candidato exato pelo número (simulador e colinha recebida)
    $num = preg_replace('/\D/', '', $_GET['num'] ?? '');
    $sql = 'SELECT * FROM candidatos WHERE cargo = ? AND num = ?' . ($cargo === 1 ? '' : ' AND uf = ?') . ' ORDER BY fora IS NOT NULL LIMIT 1';
    $st = $db->prepare($sql); $st->execute($cargo === 1 ? [$cargo, $num] : [$cargo, $num, $uf]);
    $c = $st->fetch();
    $leg = null;
    if (!$c && strlen($num) >= 2 && $cargo >= 6) {
        $st = $db->prepare('SELECT num, sigla, nome FROM legendas WHERE cargo = ? AND uf = ? AND num = ?');
        $st->execute([$cargo, $uf, substr($num, 0, 2)]); $leg = $st->fetch() ?: null;
    }
    sai(['candidato' => $c ? linha($c) : null, 'legenda' => $leg], 600);
}

case 'legendas': {
    $st = $db->prepare('SELECT num, sigla, nome FROM legendas WHERE cargo = ? AND uf = ? ORDER BY sigla');
    $st->execute([$cargo, $uf]);
    sai(['legendas' => $st->fetchAll()], 3600);
}

case 'busca': { // busca geral: nome, número ou partido, no estado + presidente
    $q = trim($_GET['q'] ?? '');
    if (mb_strlen($q) < 2) sai(['candidatos' => []]);
    $w = ['(uf = ? OR cargo = 1)']; $p = [$uf];
    if (ctype_digit($q)) { $w[] = 'num LIKE ?'; $p[] = $q . '%'; }
    else foreach (explode(' ', normaliza($q)) as $t) if ($t !== '') { $w[] = 'busca LIKE ?'; $p[] = '%' . $t . '%'; }
    if ($cargo) { $w[] = 'cargo = ?'; $p[] = $cargo; }
    $st = $db->prepare('SELECT * FROM candidatos WHERE ' . implode(' AND ', $w) . ' ORDER BY fora IS NOT NULL, cargo, nome LIMIT 80');
    $st->execute($p);
    sai(['candidatos' => array_map('linha', $st->fetchAll())], 300);
}

case 'perfil': {
    $slug = preg_replace('/[^a-z0-9-]/', '', $_GET['slug'] ?? '');
    $st = $db->prepare('SELECT * FROM candidatos WHERE slug = ?'); $st->execute([$slug]);
    $c = $st->fetch();
    if (!$c) erro('candidato não encontrado', 404);
    $st = $db->prepare('SELECT json, pego FROM perfis WHERE slug = ?'); $st->execute([$slug]);
    $cache = $st->fetch();
    $j = $cache ? json_decode($cache['json'], true) : null;
    if (!$cache || strtotime($cache['pego']) < time() - 86400) {
        $ch = curl_init('https://colinha.ai/api/v1/perfil/2026/' . $slug);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 12, CURLOPT_USERAGENT => 'Mozilla/5.0 (colinha-alequizao)']);
        $r = curl_exec($ch); $cod = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        $novo = $cod === 200 ? json_decode($r, true) : null;
        if (is_array($novo) && isset($novo['cand'])) {
            $j = $novo;
            $db->prepare('REPLACE INTO perfis VALUES(?,?,NOW())')->execute([$slug, json_encode($j, JSON_UNESCAPED_UNICODE)]);
        }
    }
    $out = ['cand' => linha($c)];
    if ($j) {
        $out['dados'] = $j['dados'] ?? null;
        $out['trajetoria'] = $j['trajetoria'] ?? null;
        $out['bens'] = $j['bens'] ?? null;
        $out['links'] = $j['links'] ?? [];
        $out['planos'] = $j['planos'] ?? [];
        $out['vagas'] = $j['vagas'] ?? null;
        $out['chapa'] = array_map(fn($v) => ['sq' => (string)$v['sq'], 'nome' => $v['nome'], 'num' => $v['num'], 'sigla' => $v['sigla'],
            'cargo' => $v['cargoId'], 'slug' => $v['slug']], $j['chapa'] ?? []);
    }
    sai($out, 3600);
}

case 'stats': {
    $m = [];
    foreach ($db->query('SELECT k, v FROM meta') as $r) $m[$r['k']] = $r['v'];
    $tot = (int)$db->query('SELECT COUNT(*) FROM candidatos')->fetchColumn();
    $st = $db->prepare('SELECT COUNT(*) FROM candidatos WHERE uf = ?'); $st->execute([$uf]);
    sai(['brasil' => $tot, 'estado' => (int)$st->fetchColumn(), 'atualizado' => $m['atualizado'] ?? null], 600);
}

case 'partidos': {
    sai(['partidos' => $db->query('SELECT sigla, nome, num FROM partidos ORDER BY sigla')->fetchAll()], 3600);
}

default: erro('ação desconhecida', 404);
}
