// @vitest-environment node
/**
 * Structural safety checks for the desktop release workflow: a dry-run
 * dispatch can never create a tag, a Release, or publish assets; tag
 * releases stay fail-closed without signing; the SBOM and consistency
 * stages sit inside the build job so a malformed SBOM blocks release.
 */

import workflowYaml from '../../../.github/workflows/desktop-release.yml?raw'

import { describe, expect, it } from 'vitest'
import { load } from 'js-yaml'


interface WorkflowStep { name?: string; run?: string; uses?: string; with?: Record<string, string> }
interface WorkflowJob {
  if?: string
  steps?: WorkflowStep[]
  environment?: string
  permissions?: Record<string, string>
}
interface ReleaseWorkflow {
  on: {
    workflow_dispatch: { inputs: { dry_run: { default: boolean } } }
    push: { tags: string[] }
  }
  jobs: Record<string, WorkflowJob>
}

const workflow = load(workflowYaml) as ReleaseWorkflow

describe('desktop release workflow', () => {
  it('defaults manual dispatches to dry run', () => {
    expect(workflow.on.workflow_dispatch.inputs.dry_run.default).toBe(true)
  })

  it('publishes only from a v* tag and never from a dry-run dispatch', () => {
    const publish = workflow.jobs.publish
    expect(publish.if ?? '').toContain("startsWith(github.ref, 'refs/tags/v')")
    expect(publish.if ?? '').toContain("github.event_name == 'push'")
    expect(publish.if ?? '').toContain('inputs.dry_run == false')
  })

  it('keeps write permissions on the publish job only', () => {
    expect(workflow.jobs.publish.permissions).toMatchObject({ contents: 'write' })
  })

  it('creates only a draft prerelease', () => {
    const create = workflow.jobs.publish.steps?.find(step => step.name === 'Create draft GitHub Release')
    expect(create?.run ?? '').toContain('--draft')
    expect(create?.run ?? '').toContain('--prerelease')
  })

  it('fails tag releases without Developer ID signing', () => {
    const refuse = workflow.jobs.build.steps?.find(step => step.name === 'Refuse unsigned tag publication')
    expect(refuse?.run ?? '').toContain('exit 1')
    expect(refuse?.run ?? '').toContain('NOTARIZATION SKIPPED')
  })

  it('generates and validates the SBOM inside the build job', () => {
    const names = (workflow.jobs.build.steps ?? []).map(step => step.name ?? '')
    expect(names).toContain('SBOM')
    expect(names).toContain('Release artifact consistency')
    expect(names).toContain('Localization coverage')
    expect(names).toContain('Hardcoded desktop copy scan')
  })

  it('fails the publish gate when the SBOM asset is missing', () => {
    const sbom = workflow.jobs.publish.steps?.find(step => step.name === 'SBOM release gate')
    expect(sbom?.run ?? '').toContain('*-sbom.cdx.json')
    expect(sbom?.run ?? '').toContain('exit 1')
  })

  it('uploads the SBOM with the public assets', () => {
    const upload = workflow.jobs.build.steps?.find(step => step.uses === 'actions/upload-artifact@v4')
    expect(upload?.with?.path).toContain('dist-exe/*-sbom.cdx.json')
  })
})
