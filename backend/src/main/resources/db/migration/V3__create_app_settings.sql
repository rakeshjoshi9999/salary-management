-- App-wide settings: exactly one typed row (ADR-028). Constraint names follow ADR-036.
-- A new setting is a new migration adding a column.

CREATE TABLE app_settings (
    id                   SMALLINT NOT NULL,
    default_country_code CHAR(2)  NOT NULL,
    version              BIGINT   NOT NULL DEFAULT 0,
    CONSTRAINT app_settings_pk            PRIMARY KEY (id),
    CONSTRAINT app_settings_single_row_ck CHECK (id = 1),
    CONSTRAINT app_settings_country_fk    FOREIGN KEY (default_country_code) REFERENCES country (code)
);

INSERT INTO app_settings (id, default_country_code) VALUES (1, 'IN');
