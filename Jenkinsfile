pipeline {
    environment {
        team = "motorcrm"                                                                // Nombre necesario para crear infra en ./infra/team/productName
        namespace = "web-services"                                                             // [Opcional] Nombre del namespace donde está desplegado 
        appalias = "gestion-comercial-login"                                                           // [Opcional] Alias con el que se desplegara
        productName = "cobranzaslogin"                                                         // Nombre que aloja el codigo fuente
        registryCredential = 'docker_hub'                                                      // credencial para acceso a hub
        dockerUser = "bancoganadero"                                                           // usuario con acceso
        dockerRepo = "${productName}"                                                          // Nombre del repositorio en el registro de contenedores
        dockerImageTAG = "${BUILD_ID}.${BUILD_TIMESTAMP_SHORT}.${BRANCH_NAME}"                 // Valor del TAG para la imagen
        sourceCodeURL = "git@gitlab.bg.com.bo:desarrollo/bga/${productName}.git"               // Git Codigo Fuente
        helmChartsURL = "https://BancoGanadero@dev.azure.com/BancoGanadero/BGA-Internal/_git/gitops"                // Git Helm Charts donde encontrar $chart y almacenar la infra
        dockerImage = ''                                                                       // Variable que representa las acciones de docker
        portName="http"                                                                        // Nombre del puerto que expone el contenedor
        portNumber=3000                                                                        // Numero del puerto a escuchar en el contenedor
        chart="simple-chart"                                                                   // Nombre del chart a utilizar para este proyecto
        language="javascript"                                                                  // Lenguaje de programación del proyecto
        stopCondition = "--exit-code 0 --severity HIGH,CRITICAL"
        excludeIMG = "base|build"
    }
    agent { node { label 'linux-builder' } }
    options { 
        buildDiscarder logRotator( daysToKeepStr: '16',numToKeepStr: '10') 
        office365ConnectorWebhooks([[
            name: 'Office 365',
            startNotification: false,
            notifySuccess: false,
            notifyAborted: false,
            notifyNotBuilt: false,
            notifyUnstable: true,
            notifyFailure: true,
            notifyBackToNormal: true,
            notifyRepeatedFailure: false,
            url: 'https://bg4.webhook.office.com/webhookb2/9a5d1a4b-df05-4df0-99be-cfc9d71dbaac@eea62d3f-2d0f-4469-94e8-a05ad3d37393/JenkinsCI/ccfc63f838fa43b8a147e7e74a7b0b72/1f47406c-c757-4c16-a938-1a00938259b4'
        ]])
    }
    stages {
        stage('Cleanup Workspace') {
            steps {
                cleanWs()
                sh '''#!/bin/bash
                echo "Cleaned Up Workspace For ${productName} $(pwd)"
                '''
            }
        }
        stage('Code Checkout') {
            steps {
                script {
                    checkout([
                        $class: "GitSCM", 
                        branches: [[ name: "${BRANCH_NAME}" ]],
                        userRemoteConfigs: [[ credentialsId: "gitlab", url: "${sourceCodeURL}" ]]
                    ])
                }
            }
        }
        stage('Testing source code') {
            steps{
                sh """#!/bin/bash
                echo " ..:: Version TRIVY ::.."
                docker run --rm aquasec/trivy:latest --version
                [ docker ps -a | grep \$appalias ] && { echo "eliminando imagen anterior..."; docker rm -f \$appalias; }
                mkdir -p \$team/\$namespace/\$appalias
                [ -f ./cicd/.trivyignore ] && { ignore="--ignorefile ./cicd/.trivyignore"; echo "Ignoring..."; cat ./cicd/.trivyignore; } || ignore=""
                echo " ..:: Scanning from images ::.."
                for image in \$(find . -type f -iname "Dockerfile"|xargs grep -i "from "|awk '{print \$2}'|sort -u| grep -Evi "\${excludeIMG}"); do 
                   echo "  - Scann \$image"
                   docker run --name \$appalias aquasec/trivy:latest image \$image \${stopCondition} \${ignore} --no-progress --scanners vuln --format template --template @contrib/html.tpl -o trivy_report.html --debug
                   docker cp \$appalias:trivy_report.html \$team/\$namespace/\$appalias/trivy_report_image.html
                   docker rm -f \$appalias
                done
                echo " ..:: Scanning for config ::.."
                docker run --name \$appalias -v \$PWD:/to-scan aquasec/trivy:latest fs \${stopCondition} \${ignore} --scanners vuln,secret,config /to-scan --no-progress --format template --template @contrib/html.tpl -o trivy_report.html --debug
                docker cp \$appalias:trivy_report.html \$team/\$namespace/\$appalias/trivy_report_code.html
                docker rm -f \$appalias
                """
            }
        }
        stage('Sonarqube') {
            when { branch 'develop' }
            environment { scannerHome = tool 'sonarqube' }
            steps {
                withSonarQubeEnv( installationName: 'SonarQube-Prod', credentialsId: 'POC-Sonar') {
                    sh '''
                    ${scannerHome}/bin/sonar-scanner \
                    -Dsonar.projectKey=${team}-${productName} \
                    -Dsonar.projectName=${team}-${productName} \
                    -Dsonar.projectVersion=${BUILD_NUMBER} \
                    -Dsonar.language=${language}
                    '''
                }
                sleep 35
                timeout(time: 10, unit: 'MINUTES') { waitForQualityGate abortPipeline: true }
            }
        }
        stage('Build and Push Image') {
            when { anyOf { branch 'master'; branch 'develop'; branch 'staging'; branch 'release-*' } }
            steps{
                script {
                    docker.withRegistry( '', registryCredential ) {
                        try {    
                            sh '''#!/bin/bash
                            [ -f .env ] && cat ./cicd/env-${BRANCH_NAME%-*} > .env || echo "No tenemos .env definido"
                            '''                        
                            dockerImage = docker.build("${dockerUser}/${dockerRepo}:${dockerImageTAG}")
                            dockerImage.push()
                            dockerImage.push('latest')
                        } catch (error) {
                            sh "echo 'Creating new docker repository'"
                            sh "docker create repository --name ${dockerUser}/${dockerRepo}"
                            dockerImage.push()
                            dockerImage.push('latest')
                        }
                    }
                }
            }
        }
        stage('Remove Related Images') {
            when { anyOf { branch 'master'; branch 'develop'; branch 'staging'; branch 'release-*' } }
            steps{
                sh "docker rmi ${dockerUser}/${dockerRepo}:${dockerImageTAG}"
                sh "docker rmi ${dockerUser}/${dockerRepo}:latest"
            }
        }
        stage('Deploy with ArgoCD') {
            when { anyOf { branch 'master'; branch 'develop'; branch 'staging'; branch 'release-*' } }
            steps {
                sh "[ -f ./cicd/env-data.yaml ] && cp ./cicd/env-data.yaml /tmp/env-data-${productName}.yaml || echo 'No existe ./cicd/env-data.yaml'"
                git branch: "main", credentialsId: "azure-repo", url: "${helmChartsURL}"
                sh '''#!/bin/bash
                projectBranch="${BRANCH_NAME%-*}" bash ./devsecops-bga-tpls/bash-scripts/new-project.sh
                [ -f /tmp/env-data-${productName}.yaml ] && rm -fv /tmp/env-data-${productName}.yaml || echo "No existe /tmp/env-data-${productName}.yaml"
                '''
            }
        }
    }
    post {
        always {
            script {
                if (BRANCH_NAME == 'develop') {
                    // Destroy what you want !
                    archiveArtifacts artifacts: "${team}/${namespace}/${appalias}/*.html", fingerprint: true, allowEmptyArchive: true
                       
                    publishHTML (target: [
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: "${team}/${namespace}/${appalias}",
                        reportFiles: '*.html',
                        reportName: 'Trivy Scan',
                    ])
                }
            }
        }
    }
}
