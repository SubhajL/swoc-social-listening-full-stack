# Apache Jena Fuseki Setup

This directory contains the configuration and ontology files for the RID (Royal Irrigation Department) semantic data store.

## Prerequisites

- Java 17 or later
- Apache Jena Fuseki (installed via Homebrew)

## Directory Structure

- `config.ttl` - Fuseki server configuration
- `rid-ontology.ttl` - RID domain ontology
- `DB/rid/` - TDB2 database directory (created on first run)

## Starting the Server

Run the startup script:

```bash
./scripts/start-fuseki.sh
```

## Endpoints

The following endpoints will be available:

- `http://localhost:3030/rid/query` - SPARQL query endpoint
- `http://localhost:3030/rid/update` - SPARQL update endpoint
- `http://localhost:3030/rid/upload` - Data upload endpoint
- `http://localhost:3030/rid/data` - Graph store protocol endpoint
- `http://localhost:3030/rid/get` - Read-only graph store endpoint

## Ontology

The RID ontology (`rid-ontology.ttl`) defines:

- Water-related incidents (floods, droughts)
- Locations
- Responses
- Properties for tracking severity and timestamps

## Loading the Ontology

After starting Fuseki, load the ontology using:

```bash
curl -X POST -H "Content-Type: text/turtle" --data-binary @config/fuseki/rid-ontology.ttl http://localhost:3030/rid/upload
``` 