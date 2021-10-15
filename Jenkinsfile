def notifySlackError() {
    echo "notifySlackError"
    testsUrl = "${env.BUILD_URL}"
    def msg = "ERROR: `${env.JOB_NAME}` #${env.BUILD_NUMBER}:\n${testsUrl}\n"
    slackSend (
        color: '#FF9FA1',
        message: msg
    )
}


pipeline {
  agent {
    dockerfile {
      filename './docker/Dockerfile'
    }
  }
  environment {
    MYTHX_API_KEY = credentials('mythx-api-key')

  }
  stages {
    stage('npm install') {
      steps {
        gitStatusWrapper(
            gitHubContext: "npm install",
            credentialsId: 'github',
            description: 'npm install',
            successDescription: 'npm install passed',
            failureDescription: 'Solhint failed')
        {
          sh '''
          npm install
          cp template.env .env
          '''
        }
      }
    }
    stage('Solhint') {
      steps {
        gitStatusWrapper(
            gitHubContext: "Solhint",
            credentialsId: 'github',
            description: 'Solhint',
            successDescription: 'Solhint passed',
            failureDescription: 'Solhint failed')
        {
          sh '''
          npx solhint 'contracts/**/*.sol'
          '''
        }
      }
    }
    stage('Ethlint') {
      steps {
        gitStatusWrapper(
            gitHubContext: "Ethlint",
            credentialsId: 'github',
            description: 'Ethlint',
            successDescription: 'Ethlint passed',
            failureDescription: 'Ethlint failed')
        {
          sh '''
          npx solium -d contracts/
          '''
        }
      }
    }
    stage('Coverage') {
      steps {
         catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
            gitStatusWrapper(
                gitHubContext: "Code Coverage",
                credentialsId: 'github',
                description: 'Code Coverage',
                successDescription: 'Code Coverage passed',
                failureDescription: 'Code Coverage failed')
            {
              sh '''
              npx hardhat coverage --network hardhat
              '''
            }
         }
      }
    }
    /*stage('Record Coverage') {
      when { branch 'master' }
      steps {
        gitStatusWrapper(
            gitHubContext: "Record Coverage",
            credentialsId: 'github',
            description: 'Record Coverage',
            successDescription: 'Record Coverage passed',
            failureDescription: 'Record Coverage failed')
        {
          script {
            currentBuild.result = 'SUCCESS'
          }
          step([$class: 'MasterCoverageAction', scmVars: [GIT_URL: env.GIT_URL]])
        }
      }
    }
    stage('PR Coverage to Github') {
      when { allOf {not { branch 'master' }; expression { return env.CHANGE_ID != null }} }
      steps {
        gitStatusWrapper(
            gitHubContext: "PR Coverage to Github",
            credentialsId: 'github',
            description: 'PR Coverage to Github',
            successDescription: 'PR Coverage to Github passed',
            failureDescription: 'PR Coverage to Github failed')
        {
          script {
            currentBuild.result = 'SUCCESS'
          }
          step([$class: 'CompareCoverageAction', publishResultAs: 'statusCheck', scmVars: [GIT_URL: env.GIT_URL]])
        }
      }
    }*/
    stage('Mythx Analyze Quick') {
      when {
        expression {env.GIT_BRANCH != 'origin/master'}
      }
      steps {
        gitStatusWrapper(
            gitHubContext: "Mythx Analyze",
            credentialsId: 'github',
            description: 'Mythx Analyze',
            successDescription: 'Mythx Analyze passed',
            failureDescription: 'Mythx Analyze failed')
        {
          sh '''
          source activate $(head -1 environment.yml | cut -d' ' -f2)
          mythx --yes analyze --mode quick contracts --remap-import "@openzeppelin/=$(pwd)/node_modules/@openzeppelin/" --swc-blacklist SWC-123
          '''
        }
      }
    }
    stage('Mythx Analyze Standard') {
      when {
        expression {env.GIT_BRANCH == 'origin/master'}
      }
      steps {
        gitStatusWrapper(
            gitHubContext: "Mythx Analyze",
            credentialsId: 'github',
            description: 'Mythx Analyze',
            successDescription: 'Mythx Analyze passed',
            failureDescription: 'Mythx Analyze failed')
        {
          sh '''
          source activate $(head -1 environment.yml | cut -d' ' -f2)
          mythx --yes analyze --mode standard contracts --remap-import "@openzeppelin/=$(pwd)/node_modules/@openzeppelin/" --swc-blacklist SWC-123
          '''
        }
      }
    }
  }
  post {
    always {
      publishHTML (target: [
        allowMissing: false,
        alwaysLinkToLastBuild: false,
        keepAll: true,
        reportDir: 'coverage',
        reportFiles: 'index.html',
        reportName: "Junit Report"
      ])
    }
    failure {
      notifySlackError()
    }
  }
}
