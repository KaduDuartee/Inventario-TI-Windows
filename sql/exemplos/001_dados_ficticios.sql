-- Dados ficticios para demonstracao.
-- Executar somente em um banco de testes com as tabelas vazias.
-- Usar dentro de uma transacao e confirmar apenas se nao houver erros.

INSERT INTO equipamentos (codigo_inventario)
VALUES ('EQ-TESTE-001');

SET @equipamento_1 = LAST_INSERT_ID();

INSERT INTO coletas (
    equipamento_id,
    data_coleta,
    nome_computador,
    ram_gb,
    sistema_operacional,
    ipv4
)
VALUES
    (@equipamento_1, '2026-01-10 09:00:00',
     'PC-TESTE-001', 8.00, 'Windows 10 Pro', '192.0.2.10'),
    (@equipamento_1, '2026-01-11 09:00:00',
     'PC-TESTE-001', 16.00, 'Windows 11 Pro', '192.0.2.10');

INSERT INTO equipamentos (codigo_inventario)
VALUES ('EQ-TESTE-002');

SET @equipamento_2 = LAST_INSERT_ID();

INSERT INTO coletas (
    equipamento_id,
    data_coleta,
    nome_computador,
    ram_gb,
    sistema_operacional,
    ipv4
)
VALUES (
    @equipamento_2,
    '2026-01-12 09:00:00',
    'PC-TESTE-002',
    16.00,
    'Windows 11 Pro',
    NULL
);