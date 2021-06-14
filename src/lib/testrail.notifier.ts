const { IncomingWebhook } = require('@slack/webhook')

if (!process.env.CYPRESS_TESTRAIL_REPORTER_SLACK_URL) {
  TestRailLogger.warn(
    'SLACK_URL is not set, cannot send notification for failures.',
  )
}

const webhook = new IncomingWebhook(
  process.env.CYPRESS_TESTRAIL_REPORTER_SLACK_URL,
)

const notifySlack = (text: string, { channel }: { channel: string }) => {
  return webhook.send({ text, channel })
}

const TestRailNotifier = {
  notifySlack,
}

module.exports = TestRailNotifier
