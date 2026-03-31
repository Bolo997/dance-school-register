# Backup notturno Supabase via GitHub Actions

Questa repo include una GitHub Action che, ogni notte, si collega al database Postgres di Supabase ed esegue:
- dump **di ogni tabella** nello schema (default: `public`) in file separati (`.dump`)
- dump **completo del DB** opzionale (`db_full.dump`)
- compressione in un archivio `.tar.gz` e upload come **Artifact** della run

## Prerequisiti

1) Avere accesso alla stringa di connessione Postgres del progetto Supabase.

2) Aggiungere un **GitHub Secret** nel repo (consigliato: repository-level):

- GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
- Nome: `SUPABASE_DB_URL`
- Valore: connection string Postgres (con SSL), ad esempio:
  - `postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require`

> Nota: non usare la `anon key` dell’app. Per i backup serve la connessione Postgres.

### Dove recuperare la connection string su Supabase

Nel progetto Supabase:
- Vai in **Project Settings** → **Database** (o sezione equivalente) → **Connection string**
- Seleziona formato **URI** (Postgres)
- Copia l’URI e assicurati che includa `sslmode=require`

Tipicamente:
- host: `db.<PROJECT_REF>.supabase.co`
- database: `postgres`
- user: `postgres`
- password: la password del DB del progetto

## Come funziona

Workflow: `.github/workflows/supabase-nightly-backup.yml`
- Trigger schedulato: ogni giorno alle **15:00 ora italiana (Europe/Rome)**
- Trigger manuale: `workflow_dispatch` (puoi scegliere schema e se fare il dump completo)

Script: `scripts/supabase-backup.sh`
- Elenca le tabelle con `pg_tables` per ogni schema
- Esegue `pg_dump` per tabella (`--format=custom`)
- (Opzionale) Esegue un dump completo del DB (`db_full.dump`)

Output:
- `backup_out/supabase-backup-<timestamp>.tar.gz` (caricato come artifact)

## Personalizzazione

- Schemi da backuppare (default `public`): avvio manuale del workflow e imposta `schemas` (comma-separated), es. `public,storage`.
- Dump completo: input `run_full_dump` = `true`/`false`.
- Retention artifact: modifica `retention-days` nel workflow.

## Ripristino (indicazione rapida)

I file `.dump` sono in formato `pg_dump --format=custom`.
- Ripristino dump completo (tipico):
  - `pg_restore --no-owner --no-privileges -d <TARGET_DB_URL> db_full.dump`
- Ripristino singola tabella: usa `pg_restore` sul relativo file in `tables/<schema>/<table>.dump`.

## Limiti importanti

- Gli artifact di GitHub non sono un “cold storage” infinito: hanno retention limitata. Se ti serve un backup a lungo termine, conviene inviare l’archivio su uno storage esterno (S3/Azure/GCS) usando secrets dedicati.
