FROM mariadb:latest

# Install dependencies
# RUN apt-get update && apt-get -y upgrade
# RUN apt-get install -y git-core

WORKDIR /tmp

COPY sql/create.sql /docker-entrypoint-initdb.d

# Check out the code. We need the SQL schema.
# RUN git clone https://github.com/styppo/nimiq-db-exporter.git db-exporter
# The database should be created on container initialisation.
# RUN cp sql/create.sql              /docker-entrypoint-initdb.d

# Mysql user and database settings

