#! /bin/bash

# docker.sh

set -e
set -o pipefail

PORT=8085

APP_NAME=$(cat package.json | jq -r '.name')

APP_VERSION=$(cat package.json | jq -r '.version')

main()
{
  for arg
  do
    case ${arg} in
      build)
        sudo docker build -t ${APP_NAME}:${APP_VERSION} .
        ;;
      purge)
        UNTAGGED=$(sudo docker images --filter "dangling=true" -q)
        if [ ! -z "$UNTAGGED" ]; then
          sudo docker rmi ${UNTAGGED};
        else
          echo "none"
        fi
        ;;
      retrieve)
        sudo docker run --rm -v ${PWD}:/mnt ${APP_NAME}:${APP_VERSION} /bin/bash -c 'cp artifacts/* /mnt/.'
        ;;
      test)
        sudo docker run --rm ${APP_NAME}:${APP_VERSION} grunt test
        ;;
      run)
        sudo docker run --name app-$$ --rm -p ${PORT}:${PORT} -e NODE_ENV=prod ${APP_NAME}:${APP_VERSION}
        ;;
      bash)
        sudo docker run --name app-$$ --rm -i -t -p ${PORT}:${PORT} ${APP_NAME}:${APP_VERSION} /bin/bash
        ;;
      push)
        getArtifactoryAccount
        sudo docker tag ${APP_NAME}:${APP_VERSION} ${ARTIFACTORY_ACCOUNT}.artifactoryonline.com/${APP_NAME}:${APP_VERSION}
        sudo docker push ${ARTIFACTORY_ACCOUNT}.artifactoryonline.com/${APP_NAME}:${APP_VERSION}
        sudo docker rmi ${ARTIFACTORY_ACCOUNT}.artifactoryonline.com/${APP_NAME}:${APP_VERSION}
        ;;
      help | --help | *)
        echo "$0 build     Build Docker image"
        echo "$0 purge     Remove untagged images after Docker reuses repo:tag for new build"
        echo "$0 retrieve  Retrieve build artifacts from Docker container"
        echo "$0 test      Run mock tests including load test in Docker container"
        echo "$0 run       Run Node app.js in production mode in Docker container"
        echo "$0 bash      Run bash in Docker container"
        echo "$0 push      Push Docker image to Artifactory repository"
        echo "$0 help      Display help information"
        exit
        ;;
    esac
  done
  exit
}

getArtifactoryAccount()
{
  # Precondition: ~/.dockercfg contains a single subdomain for artifactory.
  # Parse ~/.dockercfg, select subdomain from subdomain.artifactory.com, use it as artifactory account name.
  SUBDOMAIN=$(sudo cat ~/.dockercfg | jq -r 'keys | .[]' | grep artifactory | awk -F/ '{print $3}' | cut -f1 -d.)
  if [ -z "$SUBDOMAIN" ]; then
    echo "ERROR: could not parse artifactory subdomain from ~/.dockercfg"
    exit 1
  fi
  ARTIFACTORY_ACCOUNT=${SUBDOMAIN}
}

main "$@"
