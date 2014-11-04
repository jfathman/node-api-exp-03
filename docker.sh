#! /bin/bash

# docker.sh

set -e
set -o pipefail

PORT=8085

APP_NAME=$(cat package.json | jq -r '.name')

APP_VERSION=$(cat package.json | jq -r '.version')

main()
{
  if [ "$#" -eq 0 ]; then
    usage 1
  fi

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
      bash)
        sudo docker run --name app-$$ --rm -i -t -p ${PORT}:${PORT} ${APP_NAME}:${APP_VERSION} /bin/bash
        ;;
      push)
        getArtifactoryAccount
        sudo docker tag ${APP_NAME}:${APP_VERSION} ${ARTIFACTORY_ACCOUNT}.artifactoryonline.com/${APP_NAME}:${APP_VERSION}
        sudo docker push ${ARTIFACTORY_ACCOUNT}.artifactoryonline.com/${APP_NAME}:${APP_VERSION}
        sudo docker rmi ${ARTIFACTORY_ACCOUNT}.artifactoryonline.com/${APP_NAME}:${APP_VERSION}
        ;;
      help | -help | --help)
        usage 0
        ;;
      *)
        usage 1
        ;;
    esac
  done
  exit
}

usage()
{
  echo "$0 build     Build Docker image"
  echo "$0 purge     Remove untagged images after Docker reuses repo:tag for new build"
  echo "$0 retrieve  Retrieve build artifacts from Docker container"
  echo "$0 bash      Run bash in Docker container"
  echo "$0 push      Push Docker image to Artifactory repository"
  echo "$0 help      Display help information"
  exit "$1"
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
