## node-api-exp-03 ##

  Experimental source used for Docker CI exploration.

  * REST API application
  * Microservices architecture
  * API mock tests using Mocha, Chai, Supertest, Loadtest
  * Node.js
  * Express 4
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

Run mock tests including load test in Docker container:

    $ sudo docker run --rm node-api-exp-03:1.0.0 grunt test

Run Node app.js in production mode in Docker container:

    $ sudo docker run --name api-02 --rm -p 8085:8085 -e NODE_ENV=prod node-api-exp-03:1.0.0

Run bash in Docker container:

    $ sudo docker run --name api-02 --rm -i -t -p 8085:8085 node-api-exp-03:1.0.0 /bin/bash

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

