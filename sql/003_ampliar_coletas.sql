-- Execute uma única vez, depois de selecionar o banco de testes.
ALTER TABLE coletas
    ADD COLUMN fabricante VARCHAR(100) NULL,
    ADD COLUMN modelo VARCHAR(100) NULL,
    ADD COLUMN numero_serie VARCHAR(100) NULL,
    ADD COLUMN processador VARCHAR(255) NULL,
    ADD COLUMN versao_so VARCHAR(50) NULL,
    ADD COLUMN tipo_chave VARCHAR(50) NULL,
    ADD COLUMN status_licenca VARCHAR(60) NULL,
    ADD COLUMN interface_rede VARCHAR(100) NULL,
    ADD COLUMN status_rede VARCHAR(30) NULL,
    ADD COLUMN velocidade_rede VARCHAR(30) NULL,
    ADD COLUMN anydesk_id VARCHAR(50) NULL;

CREATE TABLE coleta_office_produtos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    coleta_id INT UNSIGNED NOT NULL,
    nome_produto VARCHAR(150) NOT NULL,
    id_produto VARCHAR(100) NULL,
    versao VARCHAR(50) NULL,
    arquitetura VARCHAR(20) NULL,
    tipo_instalacao VARCHAR(50) NULL,

    PRIMARY KEY (id),
    KEY idx_coleta_office_produtos_coleta_id (coleta_id),

    CONSTRAINT fk_coleta_office_produtos_coletas
        FOREIGN KEY (coleta_id)
        REFERENCES coletas (id)
        ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;