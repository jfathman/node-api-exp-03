## node-api-exp-03 ##

  Experimental source used for Docker CI exploration.

  * REST API application
  * Microservices architecture
  * API mock tests using Mocha, Chai, Supertest, Loadtest
  * Node.js
  * Express 4
  * Redis
  * MongoDB
  * Docker
  * Fig
  * Jenkins CI server
  * Artifactory repository manager
  * Ubuntu Server 14.04 LTS 64-bit

### Docker ###

Build Docker image:

    $ sudo docker build -t node-api-exp-03:1.0.0 .

Remove untagged images after Docker reuses repo:tag for new build:

    $ sudo docker rmi $(sudo docker images --filter "dangling=true" -q)

Retrieve build artifacts from Docker container:

    $ sudo docker run --rm -v ${PWD}:/mnt node-api-exp-03:1.0.0 /bin/bash -c 'cp artifacts/* /mnt/.'

Run bash in Docker container:

    $ sudo docker run --name api-03 --rm -i -t -p 8085:8085 node-api-exp-03:1.0.0 /bin/bash

### Fig ###

Build services:

    $ sudo fig build

Retrieve build artifacts from app service container:

    $ sudo fig run --rm --no-deps app bash -c 'cp artifacts/* /mnt/.'

Run mock tests including load test in Fig orchestrated containers:

    $ sudo fig run --rm app grunt test
    $ sudo fig stop
    $ sudo fig rm --force

Run Node app.js in production mode in Fig orchestrated containers:

    $ sudo fig up

Stop services:

    $ sudo fig stop
    $ sudo fig rm --force

Run bash in Fig service container:

    $ sudo fig run --rm app bash
    $ sudo fig run --rm mongodb bash
    $ sudo fig run --rm redis bash

Run mongo client shell in mongodb container:

    $ sudo fig run --rm mongodb mongo --host mongodb
    > use api_users
    > db.users.find()

Run redis client shell in redis container:

    $ sudo fig run --rm redis redis-cli -h redis
    redis:6379> KEYS "*"
    redis:6379> GET 123

### Permit Jenkins to run Docker ###

    $ sudo usermod -a -G docker jenkins
    $ sudo service jenkins restart

### Permit Jenkins to access Artifactory ###

    $ cat /var/lib/jenkins/.dockercfg 
    {
      "https://${account_name}.artifactoryonline.com": {
        "auth":"base64encodedUser:Password",
        "email":"user@example.com"
      }
    }

### Jenkins Execute Shell Command ###

    export ARTIFACTORY_ACCOUNT=${account_name}
    bash ${WORKSPACE}/jenkins-build.sh
    set +x # do not log auth credentials
    curl --progress-bar -o artifacts/build.log -u ${userId}:${apiToken} ${BUILD_URL}/consoleText

### Jenkins Published Artifacts ###

    ${WORKSPACE}/artifacts/*

### Manual Curl Test ###

    $ curl --user jmf:1234 http://{ip}:8085/api/v1/abc/123 -i -X GET

### License ###

  MIT

