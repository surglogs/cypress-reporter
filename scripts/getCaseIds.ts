import { TestRail } from '../src/lib/testrail'

const t = new TestRail({
  host: '',
  username: '',
  password: '',
  projectId: 1,
  suiteId: 1,
  // runName: 'cy',
  includeAllInTestRun: false,
})

const cases = t.getCases(1)
console.log(cases)
