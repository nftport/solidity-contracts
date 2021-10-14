def notifySolhintSlackError() {
    echo "notifySlackError"
    testsUrl = "${env.BUILD_URL}"
    def msg = "solhint ERRORR: `${env.JOB_NAME}` #${env.BUILD_NUMBER}:\n${testsUrl}\n"
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
  stages {
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
  }
  post {
    failure {
      notifySolhintSlackError()
    }
  }
}
