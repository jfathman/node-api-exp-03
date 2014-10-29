#! /bin/bash

# jenkins-build.sh

set -e

# Assumes prior export ARTIFACTORY_ACCOUNT is available.

main()
{
  set +x
  annotate "Get application name and version from package.json."

  APP_NAME=$(cat package.json | jq -r '.name')

  APP_VERSION=$(cat package.json | jq -r '.version')

  set +x
  annotate "Build Docker image."

  docker build -t ${APP_NAME}:${APP_VERSION} .

  set +x
  annotate "Remove untagged images after Docker reuses repo:tag for new build."

  UNTAGGED=$(docker images --filter "dangling=true" -q)

  if [ ! -z "$UNTAGGED" ]; then
    docker rmi ${UNTAGGED};
  fi

  set +x
  annotate "Run mock tests including load test in Docker container."

  docker run --rm ${APP_NAME}:${APP_VERSION} grunt --no-color test

  set +x
  annotate "Retrieve build artifacts from Docker container."

  mkdir -p artifacts

  docker run --rm -v ${PWD}/artifacts:/mnt ${APP_NAME}:${APP_VERSION} /bin/bash -c 'cp artifacts/* /mnt/.'

  set +x
  annotate "Tag Docker image for Artifactory."

  docker tag ${APP_NAME}:${APP_VERSION} ${ARTIFACTORY_ACCOUNT}.artifactoryonline.com/${APP_NAME}:${APP_VERSION}

  set +x
  annotate "Push Docker image to Artifactory."

  docker push ${ARTIFACTORY_ACCOUNT}.artifactoryonline.com/${APP_NAME}:${APP_VERSION}

  set +x
  annotate "Remove tag added for Artifactory."

  docker rmi ${ARTIFACTORY_ACCOUNT}.artifactoryonline.com/${APP_NAME}:${APP_VERSION}

  set +x
  annotate "Build complete."
}

annotate()
{
  desc=$1
  date=$(date)
  desc_len=${#desc}
  date_len=${#date}
  max_len=$(($desc_len > $date_len ? $desc_len : $date_len))
  dashes=$(eval printf -- '-%.s' {1..$max_len}; echo)
  echo
  echo "$dashes"
  echo "$desc"
  echo "$date"
  echo "$dashes"
  echo
  set -x
}

main "$@"

