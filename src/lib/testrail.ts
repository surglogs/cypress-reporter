const axios = require('axios')
const deasync = require('deasync')
const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
const TestRailLogger = require('./testrail.logger')
const TestRailCache = require('./testrail.cache')

import { TestRailOptions, TestRailResult } from './testrail.interface'

if (process.env.DEBUG) {
  require('axios-debug-log/enable')
}

export class TestRail {
  private base: String
  private runId: Number
  private includeAll: Boolean = true
  private caseIds: Number[] = []
  private retries: number

  constructor(private options: TestRailOptions) {
    TestRailLogger.debug('Init testrail with options', options)
    this.base = `${options.host}/index.php?/api/v2`
    this.runId = options.runId
    if (this.runId) {
      TestRailCache.store('runId', this.runId)
    }
  }

  /**
   * To work around a Cypress issue where Mocha exits before async requests
   * finish, we use the deasync library to ensure our axios promises
   * actually complete. For more information, see:
   * https://github.com/cypress-io/cypress/issues/7139
   * @param promise A `finally` condition will be appended to this promise, enabling a deasync loop
   */
  private makeSync(promise) {
    let done = false
    let result = undefined
    ;(async () => (result = await promise.finally(() => (done = true))))()
    deasync.loopWhile(() => !done)
    return result
  }

  public getCases(suiteId: number) {
    TestRailLogger.debug(
      'Calling testrail to get caseIds for project',
      this.options.projectId,
      ', suite',
      suiteId,
      'and group',
      this.options.groupId,
    )

    const call = async (urlToCall: string) => {
      try {
        const response = await axios({
          method: 'get',
          url: urlToCall,
          headers: { 'Content-Type': 'application/json' },
          auth: {
            username: this.options.username,
            password: this.options.password,
          },
        })

        let cases = response.data?.cases?.map((item) => item.id) || []
        if (response.data?._links?.next) {
          cases = [...cases, ...(await call(`${this.options.host}/index.php?${response.data?._links?.next}`))]
        }

        return cases
      } catch (e) {
        console.error(e)
      }
    }

    let url = `${this.base}/get_cases/${this.options.projectId}&suite_id=${suiteId}`
    if (this.options.groupId) {
      url += `&section_id=${this.options.groupId}`
    }
    if (this.options.filter) {
      url += `&filter=${this.options.filter}`
    }

    const cases = this.makeSync(call(url))

    if (!cases || !cases.length) {
      TestRailLogger.log('No testrail cases found', this.options.projectId, suiteId, this.options.groupId)
    }

    return cases ?? []
  }

  public createRun(name: string, description: string, suiteId: number) {
    if (this.options.includeAllInTestRun === false) {
      this.includeAll = false
      this.caseIds = TestRailCache.retrieve('caseIds') || this.getCases(suiteId)
    }
    this.makeSync(
      axios({
        method: 'post',
        url: `${this.base}/add_run/${this.options.projectId}`,
        headers: { 'Content-Type': 'application/json' },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
        data: JSON.stringify({
          suite_id: suiteId,
          name,
          description,
          include_all: this.includeAll,
          case_ids: this.caseIds,
        }),
      })
        .then((response) => {
          this.runId = response.data.id
          // cache the TestRail Run ID
          TestRailCache.store('runId', this.runId)
        })
        .catch((error) => console.error(error)),
    )
  }

  public deleteRun() {
    this.runId = TestRailCache.retrieve('runId')
    this.makeSync(
      axios({
        method: 'post',
        url: `${this.base}/delete_run/${this.runId}`,
        headers: { 'Content-Type': 'application/json' },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
      }).catch((error) => console.error(error)),
    )
  }

  public publishResults(results: TestRailResult[]) {
    if (!this.runId) {
      this.runId = TestRailCache.retrieve('runId')
    }

    if (this.runId) {
      return this.makeSync(
        axios({
          method: 'post',
          url: `${this.base}/add_results_for_cases/${this.runId}`,
          headers: { 'Content-Type': 'application/json' },
          auth: {
            username: this.options.username,
            password: this.options.password,
          },
          data: JSON.stringify({ results }),
        })
          .then((response) => response.data)
          .catch((error) => {
            console.error(error)
          }),
      )
    } else {
      TestRailLogger.warn('RunId is not set for caseIds:', results.map(({ case_id }) => case_id).join(', '))
    }
  }

  public uploadAttachment(resultId, path) {
    const form = new FormData()
    form.append('attachment', fs.createReadStream(path))
    TestRailLogger.log('Uploading attachment for result', resultId)

    this.makeSync(
      axios({
        method: 'post',
        url: `${this.base}/add_attachment_to_result/${resultId}`,
        headers: { ...form.getHeaders() },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
        data: form,
      }),
    )
  }

  // This function will attach failed screenshot on each test result(comment) if founds it
  public uploadScreenshots(caseId, resultId) {
    const SCREENSHOTS_FOLDER_PATH = path.join(__dirname, 'cypress/screenshots')

    fs.readdir(SCREENSHOTS_FOLDER_PATH, (err, files) => {
      if (err) {
        return console.log('Unable to scan screenshots folder: ' + err)
      }

      files.forEach((file) => {
        if (file.includes(`C${caseId}`) && /(failed|attempt)/g.test(file)) {
          try {
            this.uploadAttachment(resultId, SCREENSHOTS_FOLDER_PATH + file)
          } catch (err) {
            console.log('Screenshot upload error: ', err)
          }
        }
      })
    })
  }

  public closeRun() {
    this.runId = TestRailCache.retrieve('runId')
    this.makeSync(
      axios({
        method: 'post',
        url: `${this.base}/close_run/${this.runId}`,
        headers: { 'Content-Type': 'application/json' },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
      })
        .then(() => {
          TestRailLogger.log('Test run closed successfully')
        })
        .catch((error) => console.error(error)),
    )
  }
}
