-- Registra os computadores autorizados a enviar coletas.
-- Armazena somente o hash do token de cada dispositivo.

CREATE TABLE dispositivos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    equipamento_id INT UNSIGNED NOT NULL,
    nome_dispositivo VARCHAR(100) NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_dispositivos_equipamento (equipamento_id),
    UNIQUE KEY uq_dispositivos_token_hash (token_hash),

    CONSTRAINT fk_dispositivos_equipamentos
        FOREIGN KEY (equipamento_id)
        REFERENCES equipamentos (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;