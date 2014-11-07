# Dockerfile

# Requires Docker >= 1.3.0.

FROM ubuntu:14.04

MAINTAINER jfathman

RUN apt-get update >/install.log 2>&1
RUN apt-get -y upgrade >>/install.log 2>&1
RUN apt-get -y install jq wget fakeroot python build-essential >>/install.log 2>&1

ENV APP_DIR /opt/app/

COPY . ${APP_DIR}

RUN cd /opt \
  && NODE_VERSION=$(cat ${APP_DIR}/package.json | jq -r '.engines.node') \
  && wget -q http://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz \
  && tar -xzf node-${NODE_VERSION}-linux-x64.tar.gz \
  && rm -f node-${NODE_VERSION}-linux-x64.tar.gz \
  && mv node-${NODE_VERSION}-linux-x64 node \
  && cd /usr/local/bin \
  && ln -s /opt/node/bin/* .

# Revert to not using env var until Quay.io hosted build upgrades to Docker >= 1.3.0.
# WORKDIR ${APP_DIR}
WORKDIR /opt/app

RUN npm install >>/install.log

RUN ln -s ${APP_DIR}/node_modules/.bin/* /usr/local/bin/.

RUN mkdir -p ./artifacts

RUN ./make-deb.sh 0 && mv *.deb ./artifacts

CMD ["node", "app.js"]
