# db-exporter

## Docker

### Basic usage

The db-exporter docker image consists out of two parts: the db-exporter itself and a MariaDB image as its database backend. These two parts are glued together with a docker-compose file. The docker-compose file as well as the respective Docker files can be found in *misc/docker/nimiq-db-exporter*.

The containers can be brought up by simply executing `docker-compose up -d` in the directory containing the docker-compose file. The command `docker-compose down` stops and removes the containers again. This includes **all** data in the container instances expect for the Nimiq blockchain and the MySQL database. These databases are saved persistently on seperate volumes managed by the docker daemon. These volumes can be configured in the top-level *volume* key in the docker-compose file. More information can be found in the docker-compose reference (see [1] and [2]). 
The commands `docker-compose stop` and `docker-compose start` respectively temporarily terminate the container and restart it, however, without deleting the containers (in contrast to `down` and `up`). 

On the first execution, the base images are pulled from the Docker registry and/or the images are built from the enclosed Dockerfiles. Additionally, the MySQL database is initialized.

By default, the MariaDB image exports the daemon on port 3306 to the host locally only. The database is *nimiq* with user *nimiq* and password *nimiq*. This port forwarding setting can be changed in the docker-compose file to make the port externally reachable. More information on the MariaDB docker image can be found here [3].

### Known limitations

#### Container Update

In theory, the containers (and images) could be updated by pulling any changes from this repository and executing `docker-compose down && docker-compose up -d`. However, as the images are not (most likely) yet available in the Docker registry, Docker is unable to pull newer images and its caching mechanism won't rebuild the images as well. Therefore, for the time being docker-compose should be called with `docker-compose up -d --build` which will then force a complete container/image rebuild. 

#### Update Detection

One needs to occasionally check for image/container updates oneself, since this feature is not provided by the Docker daemon. 

## References

[1] https://docs.docker.com/compose/reference/

[2] https://docs.docker.com/compose/compose-file/

[3] https://hub.docker.com/_/mariadb/
