CREATE DATABASE nimiq;

CREATE TABLE nimiq.block (
  id                    INT UNSIGNED        PRIMARY KEY NOT NULL AUTO_INCREMENT,
  hash                  BINARY(32)          NOT NULL UNIQUE,
  height                INT UNSIGNED        NOT NULL UNIQUE,
  timestamp             INT UNSIGNED        NOT NULL,
  n_bits                INT UNSIGNED        NOT NULL,
  miner_address         BINARY(20)          NOT NULL,
  extra_data            BINARY(255)         NULL,
  tx_count              SMALLINT UNSIGNED   NOT NULL,
  tx_value              BIGINT UNSIGNED     NOT NULL DEFAULT 0,
  tx_fees               BIGINT UNSIGNED     NOT NULL DEFAULT 0,
  size                  INT UNSIGNED        NOT NULL,

  INDEX idx_block_hash (hash),
  INDEX idx_block_height (height)
);

CREATE TABLE nimiq.transaction (
  id                    INT UNSIGNED        PRIMARY KEY NOT NULL AUTO_INCREMENT,
  hash                  BINARY(32)          NOT NULL UNIQUE,
  block_id              INT UNSIGNED        NOT NULL,
  sender_type           TINYINT UNSIGNED    NOT NULL DEFAULT 0,
  sender_address        BINARY(20)          NOT NULL,
  recipient_type        TINYINT UNSIGNED    NOT NULL DEFAULT 0,
  recipient_address     BINARY(20)          NOT NULL,
  value                 BIGINT UNSIGNED     NOT NULL,
  fee                   BIGINT UNSIGNED     NOT NULL,
  validity_start_height INT UNSIGNED        NOT NULL,
  flags                 TINYINT UNSIGNED    NOT NULL DEFAULT 0,
  data                  VARBINARY(255)      NULL,

  INDEX idx_transaction_block_id (block_id),
  INDEX idx_transaction_hash (hash),
  FOREIGN KEY (block_id) REFERENCES nimiq.block(id) ON DELETE CASCADE
);

CREATE USER 'nimiq'@'localhost';
GRANT SELECT,INSERT,DELETE ON nimiq.block TO 'nimiq'@'localhost';
GRANT SELECT,INSERT,DELETE ON nimiq.transaction TO 'nimiq'@'localhost';
