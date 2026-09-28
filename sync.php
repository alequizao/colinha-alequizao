<?php
/*
 * Colinha · Alequizão · Desenvolvido por Alequizao <alequizao.dev@gmail.com>
 * https://github.com/alequizao · © 2026 Alequizao. Todos os direitos reservados.
 */
/*
 * Colinha · Alequizão — sincroniza candidatos 2026 (dados abertos do TSE).
 * O TSE bloqueia a VPS (403), então a base vem da API pública do colinha.ai,
 * que republica os mesmos dados. Uso: php sync.php  (cron diário)
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/lib.php';

const FONTE = 'https://colinha.ai/api/v1';
$UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function pega($url, $tent = 3) {
    for ($i = 0; $i < $tent; $i++) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 40,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (colinha-alequizao sync)', CURLOPT_ENCODING => '']);
        $r = curl_exec($ch); $c = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($c === 200 && $r) { $j = json_decode($r, true); if (is_array($j)) return $j; }
        sleep(2 + $i * 3);
    }
    throw new Exception("falhou: $url");
}

$db = db();
$ins = $db->prepare('INSERT INTO candidatos(sq,ano,nome,num,sigla,uf,cargo,slug,julg,fora,situacao,fem,busca,visto)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE nome=VALUES(nome),num=VALUES(num),sigla=VALUES(sigla),
  uf=VALUES(uf),cargo=VALUES(cargo),slug=VALUES(slug),julg=VALUES(julg),fora=VALUES(fora),situacao=VALUES(situacao),
  fem=VALUES(fem),busca=VALUES(busca),visto=NOW()');
$inicio = date('Y-m-d H:i:s');
$total = 0;

function puxa($cargo, $uf) {
    global $ins, $total;
    $off = 0; $vistos = 0;
    do {
        $j = pega(FONTE . "/candidatos?" . http_build_query(['cargo' => $cargo, 'uf' => $uf, 'q' => '', 'offset' => $off]));
        $lista = $j['candidatos'] ?? [];
        foreach ($lista as $c) {
            $ins->execute([$c['sq'], $c['ano'] ?? 2026, $c['nome'], $c['num'], $c['sigla'], $c['uf'], $c['cargoId'],
                $c['slug'], $c['julg'] ?? null, $c['fora'] ?? null, $c['situacaoTse'] ?? null, !empty($c['fem']) ? 1 : 0,
                normaliza($c['nome'] . ' ' . $c['num'] . ' ' . $c['sigla'])]);
        }
        $vistos += count($lista); $off += count($lista);
        usleep(250000);
    } while ($lista && $vistos < ($j['total'] ?? 0));
    $total += $vistos;
    return $vistos;
}

$n = puxa(1, 'SP'); echo "presidente: $n\n";
foreach ($UFS as $uf) {
    $cargos = [3, 5, 6, $uf === 'DF' ? 8 : 7];
    $r = [];
    foreach ($cargos as $cg) $r[] = "$cg=" . puxa($cg, $uf);
    foreach ([6, $uf === 'DF' ? 8 : 7] as $cg) {
        $j = pega(FONTE . "/legendas?cargo=$cg&uf=$uf");
        foreach ($j['legendas'] ?? [] as $l) {
            $db->prepare('REPLACE INTO legendas VALUES(?,?,?,?,?)')->execute([$cg, $uf, $l['num'], $l['sigla'], $l['nome']]);
            $db->prepare('INSERT INTO partidos(sigla,nome,num) VALUES(?,?,?) ON DUPLICATE KEY UPDATE nome=VALUES(nome),num=VALUES(num)')
               ->execute([$l['sigla'], $l['nome'], $l['num']]);
        }
        usleep(250000);
    }
    echo "$uf: " . implode(' ', $r) . "\n";
}

// Quem sumiu da fonte nesta rodada sai da base (candidatura retirada do TSE).
if ($total > 15000) $db->prepare('DELETE FROM candidatos WHERE visto < ?')->execute([$inicio]);

$d = pega(FONTE . '/dados');
$db->prepare("REPLACE INTO meta VALUES('atualizado',?),('situacoes',?),('total',?)")
   ->execute([$d['atualizadoEm'] ?? gmdate('c'), json_encode($d['situacoes'] ?? []), $total]);
echo "total: $total\n";
