// @vitest-environment node
/**
 * CI reliability guards for the desktop check workflow: Rust tests must
 * never depend on incidental locally-generated files, the deterministic
 * staging script and the resource regression check must run before cargo
 * test, and the preview artifact job must declare its security status.
 */

import desktopWorkflowYaml from '../../../.github/workflows/desktop.yml?raw'

import { describe, expect, it } from 'vitest'
import { load } from 'js-yaml'

interface WorkflowStep { name?: string; run?: string; uses?: string; with?: Record<string, string> }
interface WorkflowJob { steps?: WorkflowStep[] }
interface DesktopWorkflow { jobs: Record<string, WorkflowJob> }

const workflow = load(desktopWorkflowYaml) as DesktopWorkflow

describe('desktop CI workflow', () => {
  it('stages and checks Rust-test resources before cargo test', () => {
    const rust = workflow.jobs.checks?.steps?.find(step => step.name === 'Rust tests')
    const run = rust?.run ?? ''
    expect(run).toContain('prepare-desktop-rust-tests.mjs')
    expect(run).toContain('check-desktop-rust-resources.mjs')
    const cargo = run.indexOf('cargo test --lib')
    const prepare = run.indexOf('prepare-desktop-rust-tests.mjs')
    const check = run.indexOf('check-desktop-rust-resources.mjs')
    expect(cargo).toBeGreaterThan(prepare)
    expect(cargo).toBeGreaterThan(check)
  })

  it('produces an explicit preview artifact without publishing', () => {
    const steps = workflow.jobs['release-unsigned']?.steps ?? []
    expect(steps.some(step => step.name === 'Sign preview app (ad-hoc)')).toBe(true)
    expect(steps.some(step => step.name === 'DMG contents verification (preview)')).toBe(true)
  })

  it('never publishes from the checks or preview jobs', () => {
    for (const job of Object.values(workflow.jobs)) {
      const runs = (job.steps ?? []).filter(step => step.run !== undefined).map(step => step.run ?? '')
      for (const run of runs) {
        expect(run).not.toContain('gh release create')
        expect(run).not.toContain('gh release upload')
      }
    }
  })
})
