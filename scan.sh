#!/bin/bash
echo " ..:: Version TRIVY ::.."
docker run --rm aquasec/trivy:latest --version
[ "$(docker ps -a | grep -E ${APPALIAS})" ] && { echo "eliminando imagen anterior..."; docker rm -f ${APPALIAS}; }
[ -f ./cicd/.trivyignore ] && { ignore="--ignorefile ./cicd/.trivyignore"; echo "Ignoring..."; cat ./cicd/.trivyignore; } || ignore=""
echo " ..:: Scanning from images ::.."
for image in $(find . -type f -iname "Dockerfile"|xargs grep -i "from "|awk '{print $2}'|sort -u| grep -Evi "${EXCLUDEIMG}"); do 
    echo "  - Scann $image"
    docker run --name ${APPALIAS} aquasec/trivy:latest image $image ${STOPCONDITION} ${ignore} --no-progress --scanners vuln --format template --timeout 10m --template @contrib/junit.tpl -o trivy_report.xml
    docker cp ${APPALIAS}:trivy_report.xml trivy_report_image.xml
    [ "$(docker ps -a | grep -E ${APPALIAS})" ] && { echo "eliminando imagen anterior..."; docker rm -f ${APPALIAS}; }
done

echo " + Scanning for config"
docker run --name ${APPALIAS} -v $PWD:/to-scan aquasec/trivy:latest fs ${STOPCONDITION} ${ignore} --scanners vuln,secret,config /to-scan --no-progress --format template --timeout 10m --template @contrib/junit.tpl -o trivy_report.xml
docker cp ${APPALIAS}:trivy_report.xml trivy_report_code.xml
[ "$(docker ps -a | grep -E ${APPALIAS})" ] && { echo "eliminando imagen anterior..."; docker rm -f ${APPALIAS}; }