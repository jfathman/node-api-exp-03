#! /bin/bash

# make-deb.sh

set -e

# Build .deb installer using app name and version from package.json.

PACKAGE=$(cat package.json | jq -r '.name')

VERSION=$(cat package.json | jq -r '.version')

DESCRIPTION="REST API Microservice"

ORGANIZATION="Acme Labs"

PLATFORM=ubuntu

ARCH=all

if [ -z "$PACKAGE" ]; then
  echo "ERROR: package.json app name undefined"
  exit 1
fi

if [ -z "$VERSION" ]; then
  echo "ERROR: package.json app version undefined"
  exit 1
fi

# RELEASE identifies package spin version.

if [ $# -eq 1 ]; then
  RELEASE=$1;
  FILENAME=${PACKAGE}_${VERSION}-${RELEASE}_${PLATFORM}_${ARCH}.deb
else
  for ((i = 0; i < 1000; i++))
  do
    RELEASE=$i
    FILENAME=${PACKAGE}_${VERSION}-${RELEASE}_${PLATFORM}_${ARCH}.deb
    if [ ! -f $FILENAME ]; then
      break
    fi
  done
fi

rm -rf ./deb-build

mkdir -p ./deb-build/DEBIAN
mkdir -p ./deb-build/usr/local/exp/${PACKAGE}
mkdir -p ./deb-build/usr/local/exp/${PACKAGE}/node_modules

cp app.js              ./deb-build/usr/local/exp/${PACKAGE}/.
cp package.json        ./deb-build/usr/local/exp/${PACKAGE}/.
cp npm-shrinkwrap.json ./deb-build/usr/local/exp/${PACKAGE}/.

cat << EOF >./deb-build/DEBIAN/install
/usr/local/exp/${PACKAGE}
EOF

cat << EOF >./deb-build/DEBIAN/preinst
#! /bin/sh
EOF

chmod 755 ./deb-build/DEBIAN/preinst

cat << EOF >./deb-build/DEBIAN/postinst
#! /bin/sh
id ${PACKAGE} >/dev/null 2>&1
if [ \$? -ne 0 ]; then
  useradd --shell /bin/bash --password ${PACKAGE} -m ${PACKAGE}
fi
chown ${PACKAGE}:${PACKAGE} /usr/local/exp/${PACKAGE}
chown ${PACKAGE}:${PACKAGE} /usr/local/exp/${PACKAGE}/node_modules
chown ${PACKAGE}:${PACKAGE} /usr/local/exp/${PACKAGE}/app.js
chown ${PACKAGE}:${PACKAGE} /usr/local/exp/${PACKAGE}/package.json
chown ${PACKAGE}:${PACKAGE} /usr/local/exp/${PACKAGE}/npm-shrinkwrap.json
EOF

chmod 755 ./deb-build/DEBIAN/postinst

cat << EOF >./deb-build/DEBIAN/prerm
#! /bin/sh
EOF

chmod 755 ./deb-build/DEBIAN/prerm

cat << EOF >./deb-build/DEBIAN/postrm
#! /bin/sh
EOF

chmod 755 ./deb-build/DEBIAN/postrm

cat << EOF >./deb-build/DEBIAN/control
Package: ${PACKAGE}
Version: ${VERSION}-${RELEASE}
Section: non-free/misc
Priority: optional
Architecture: ${ARCH}
Maintainer: ${ORGANIZATION}
Description: ${DESCRIPTION}
EOF

cat << EOF >./deb-build/DEBIAN/copyright
This package was created on $(date)
Copyright:
  Copyright (C) $(date +"%Y") ${ORGANIZATION}
License:
  Commercial.  All rights reserved.
EOF

# intentional tab at beginning of dh line:

cat << EOF >./deb-build/DEBIAN/rules
#!/usr/bin/make -f
%:
	dh $@
EOF

cat << EOF >./deb-build/DEBIAN/compat
7
EOF

fakeroot dpkg-deb --build deb-build $FILENAME

file   $FILENAME
md5sum $FILENAME
ls -l  $FILENAME

rm -rf ./deb-build

exit 0

# end.
