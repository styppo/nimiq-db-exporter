FROM node:9-stretch

# Install dependencies
RUN apt-get update && apt-get -y upgrade
RUN apt-get install -y git-core wait-for-it

ENV USER=node
ENV HOME=/home/${USER}
USER ${USER}

WORKDIR ${HOME}

# Check out the code
RUN git clone https://github.com/styppo/nimiq-db-exporter.git db-exporter

WORKDIR ${HOME}/db-exporter

# Build it
RUN yarn

# the blockchain database should be persistent on a volume
ENV DB_PATH=${HOME}/db-exporter/main-full-consensus
RUN mkdir -p ${DB_PATH} && chown ${USER}: ${DB_PATH}
VOLUME ${DB_PATH}

# Run it
ENTRYPOINT wait-for-it db:3306 -- node index.js
