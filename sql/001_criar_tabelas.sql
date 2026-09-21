-- Estrutura inicial do inventario.
-- Selecione o banco de destino antes de executar este arquivo.

-- Cadastro dos equipamentos
CREATE TABLE equipamentos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo_inventario VARCHAR(50) NOT NULL UNIQUE,
    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Historico das coletas de cada equipamento
CREATE TABLE coletas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipamento_id INT UNSIGNED NOT NULL,
    data_coleta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nome_computador VARCHAR(100) NOT NULL,
    ram_gb DECIMAL(10, 2) NOT NULL,
    sistema_operacional VARCHAR(150) NOT NULL,
    ipv4 VARCHAR(15),

    CONSTRAINT fk_coletas_equipamentos
        FOREIGN KEY (equipamento_id)
        REFERENCES equipamentos(id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;