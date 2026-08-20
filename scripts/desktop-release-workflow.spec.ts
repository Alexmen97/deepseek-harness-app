import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

describe('desktop release workflow version automation', () => {
  const workflow = loadWorkflow('.github/workflows/desktop-release.yml')

  it('does not carry a hardcoded preview version constant', () => {
    const text = readFileSync(resolve(root, '.github/workflows/desktop-release.yml'), 'utf8')
    expect(text).not.toContain('DESKTOP_PREVIEW_VERSION')
    expect(text).not.toMatch(/0\.1\.0-preview\.2/)
  })

  it('requires an explicit release_version for manual dispatch', () => {
    const inputs = dispatchInputs(workflow)
    expect(inputs.release_version).toMatchObject({ type: 'string', required: true })
  })

  it('derives the release class from the canonical resolver for tags and dispatch', () => {
    const decide = buildStep(workflow, step => step.id === 'decide')
    expect(decide.run).toContain('node scripts/resolve-release-version.mjs --input')
    expect(decide.run).toContain('node scripts/resolve-release-version.mjs --tag')
    expect(decide.run).not.toContain('-preview\.')
  })

  it('propagates the resolved version to the build-time Tauri override', () => {
    const bundle = buildStep(workflow, step => step.name === 'Build app bundle')
    expect(bundle.run).toContain('steps.meta.outputs.version')
    expect(bundle.run).toContain('KIND')
  })

  it('refuses to republish an existing tag in both publish jobs', () => {
    for (const jobName of ['publish', 'publish-preview']) {
      const guard = publishStep(workflow, jobName, step => step.name === 'Refuse duplicate tag')
      expect(guard.run).toContain('gh release view')
      expect(guard.run).toContain('refusing to publish')
    }
  })
})

function loadWorkflow(path: string): Record<string, unknown> {
  const workflow: unknown = yaml.load(readFileSync(resolve(root, path), 'utf8'))
  if (!isRecord(workflow)) throw new TypeError(path + ' must define a workflow')
  return workflow
}

function dispatchInputs(workflow: Record<string, unknown>): Record<string, unknown> {
  const on = workflow.on
  if (!isRecord(on)) throw new TypeError('workflow must define on')
  const dispatch = on.workflow_dispatch
  if (!isRecord(dispatch)) throw new TypeError('workflow must define workflow_dispatch')
  const inputs = dispatch.inputs
  if (!isRecord(inputs)) throw new TypeError('workflow_dispatch must define inputs')
  return inputs
}

function buildStep(workflow: Record<string, unknown>, pick: (step: Record<string, unknown>) => boolean): Record<string, unknown> {
  return findStep(jobSteps(workflow, 'build'), pick, 'build')
}

function publishStep(
  workflow: Record<string, unknown>,
  jobName: string,
  predicate: (step: Record<string, unknown>) => boolean,
): Record<string, unknown> {
  return findStep(jobSteps(workflow, jobName), predicate, jobName)
}

function jobSteps(workflow: Record<string, unknown>, jobName: string): unknown[] {
  const jobs = workflow.jobs
  if (!isRecord(jobs)) throw new TypeError('workflow must define jobs')
  const job = jobs[jobName]
  if (!isRecord(job)) throw new TypeError('workflow must define the ' + jobName + ' job')
  const steps = job.steps
  if (!Array.isArray(steps)) throw new TypeError(jobName + ' job must define steps')
  return steps
}

function findStep(steps: unknown[], predicate: (step: Record<string, unknown>) => boolean, label: string): Record<string, unknown> {
  const found = steps.find(step => isRecord(step) && predicate(step))
  if (!isRecord(found)) throw new TypeError(label + ' step not found')
  return found
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
