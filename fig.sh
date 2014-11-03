#! /bin/bash

# fig.sh

set -e
set -o pipefail

main()
{
  for arg
  do
    case ${arg} in
      build)
        sudo fig build
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
        sudo fig run --rm --no-deps app bash -c 'cp artifacts/* /mnt/.'
        ;;
      test)
        sudo fig run --rm app grunt test
        sudo fig stop
        sudo fig rm --force
        ;;
      up)
        sudo fig up
        ;;
      stop)
        sudo fig stop
        sudo fig rm --force
        ;;
      bash)
        sudo fig run --rm app bash
        ;;
      mongo)
        sudo fig run --rm mongodb mongo --host mongodb
        ;;
      redis)
        sudo fig run --rm redis redis-cli -h redis
        ;;
      help | --help | *)
        echo "$0 build     Build Fig services"
        echo "$0 purge     Remove untagged images after Docker reuses repo:tag for new build"
        echo "$0 retrieve  Retrieve build artifacts from app container"
        echo "$0 test      Run mock tests including load test in app container"
        echo "$0 up        Run Node app.js in production mode in app container"
        echo "$0 stop      Stop Fig services"
        echo "$0 bash      Run bash in app container"
        echo "$0 mongo     Run mongo client shell in mongodb container"
        echo "$0 redis     Run redis client shell in redis container"
#       echo "$0 push      Push Docker image to Artifactory repository"
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