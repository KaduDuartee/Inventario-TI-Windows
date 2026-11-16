CREATE TABLE coleta_office_ids (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    coleta_id INT UNSIGNED NOT NULL,
    release_id VARCHAR(100)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_coleta_office_ids_coleta_release (coleta_id, release_id),
    CONSTRAINT fk_coleta_office_ids_coletas
        FOREIGN KEY (coleta_id)
        REFERENCES coletas (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
