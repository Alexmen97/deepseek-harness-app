/**
 * The desktop module table: every client plugin the desktop composition
 * mounts, statically bundled by Vite. The boot entry hands each module to the
 * shell kernel through the loadBundle seam, so nothing is fetched at runtime.
 */

import * as Runtime from '@deepseek-ai/dsh-client-runtime/client'
import * as TypertRegistry from '@deepseek-ai/dsh-typert-registry/client'
import * as ApiGateway from '@deepseek-ai/dsh-api-gateway/client'
import * as ApiRemotes from '@deepseek-ai/dsh-api-remotes/client'
import * as ClientRunner from '@deepseek-ai/dsh-cordis-client-runner/client'
import * as Locale from '@deepseek-ai/dsh-client-locale/client'
import * as UiTheme from '@deepseek-ai/dsh-client-ui-theme/client'
import * as UiLayout from '@deepseek-ai/dsh-client-ui-layout/client'
import * as UiSidebar from '@deepseek-ai/dsh-client-ui-sidebar/client'
import * as UiSettings from '@deepseek-ai/dsh-client-ui-settings/client'
import * as UiSettingsGeneral from '@deepseek-ai/dsh-client-ui-settings-general/client'
import * as UiSettingsModels from '@deepseek-ai/dsh-client-ui-settings-models/client'
import * as UiConversation from '@deepseek-ai/dsh-client-ui-conversation/client'
import * as UiTool from '@deepseek-ai/dsh-client-ui-tool/client'
import * as UiTrajectory from '@deepseek-ai/dsh-client-ui-trajectory/client'
import * as UiWorkspace from '@deepseek-ai/dsh-client-ui-workspace/client'
import * as UiInputTrigger from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import * as UiCommands from '@deepseek-ai/dsh-client-ui-commands/client'
import * as UiSkill from '@deepseek-ai/dsh-client-ui-skill/client'
import * as UiSubagent from '@deepseek-ai/dsh-client-ui-subagent/client'
import * as UiModelSelection from '@deepseek-ai/dsh-client-ui-model-selection/client'
import * as UiPermissionPresets from '@deepseek-ai/dsh-client-ui-permission-presets/client'
import * as UiUserQuestions from '@deepseek-ai/dsh-client-ui-user-questions/client'
import * as DesktopConnection from '@deepseek-ai/dsh-desktop-client/src/client/connection'
import * as DesktopHost from '@deepseek-ai/dsh-desktop-client/src/client/host'
import * as DesktopPicker from '@deepseek-ai/dsh-desktop-client/src/client/picker'
import * as DesktopSettings from '@deepseek-ai/dsh-desktop-client/src/client/settings'

/** id → static module namespace, keyed by the boot-manifest row id. */
export const DESKTOP_STATICS: Record<string, unknown> = {
  '@deepseek-ai/dsh-desktop-connection': DesktopConnection,
  '@deepseek-ai/dsh-typert-registry': TypertRegistry,
  '@deepseek-ai/dsh-api-gateway': ApiGateway,
  '@deepseek-ai/dsh-client-runtime': Runtime,
  '@deepseek-ai/dsh-api-remotes': ApiRemotes,
  '@deepseek-ai/dsh-cordis-client-runner': ClientRunner,
  '@deepseek-ai/dsh-client-locale': Locale,
  '@deepseek-ai/dsh-client-ui-theme': UiTheme,
  '@deepseek-ai/dsh-client-ui-layout': UiLayout,
  '@deepseek-ai/dsh-client-ui-sidebar': UiSidebar,
  '@deepseek-ai/dsh-client-ui-settings': UiSettings,
  '@deepseek-ai/dsh-client-ui-settings-general': UiSettingsGeneral,
  '@deepseek-ai/dsh-client-ui-settings-models': UiSettingsModels,
  '@deepseek-ai/dsh-client-ui-conversation': UiConversation,
  '@deepseek-ai/dsh-client-ui-tool': UiTool,
  '@deepseek-ai/dsh-client-ui-trajectory': UiTrajectory,
  '@deepseek-ai/dsh-client-ui-workspace': UiWorkspace,
  '@deepseek-ai/dsh-client-ui-input-trigger': UiInputTrigger,
  '@deepseek-ai/dsh-client-ui-commands': UiCommands,
  '@deepseek-ai/dsh-client-ui-skill': UiSkill,
  '@deepseek-ai/dsh-client-ui-subagent': UiSubagent,
  '@deepseek-ai/dsh-client-ui-model-selection': UiModelSelection,
  '@deepseek-ai/dsh-client-ui-permission-presets': UiPermissionPresets,
  '@deepseek-ai/dsh-client-ui-user-questions': UiUserQuestions,
  '@deepseek-ai/dsh-desktop-host': DesktopHost,
  '@deepseek-ai/dsh-desktop-directory-picker': DesktopPicker,
  '@deepseek-ai/dsh-desktop-settings': DesktopSettings,
}

/** The desktop composition rows (order = materialization order). */
export const DESKTOP_ENTRY_IDS: readonly string[] = [
  '@deepseek-ai/dsh-desktop-connection',
  '@deepseek-ai/dsh-typert-registry',
  '@deepseek-ai/dsh-api-gateway',
  '@deepseek-ai/dsh-api-remotes',
  '@deepseek-ai/dsh-client-runtime',
  '@deepseek-ai/dsh-cordis-client-runner',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-ui-theme',
  '@deepseek-ai/dsh-client-ui-layout',
  '@deepseek-ai/dsh-client-ui-sidebar',
  '@deepseek-ai/dsh-client-ui-settings',
  '@deepseek-ai/dsh-client-ui-settings-general',
  '@deepseek-ai/dsh-client-ui-settings-models',
  '@deepseek-ai/dsh-client-ui-conversation',
  '@deepseek-ai/dsh-client-ui-tool',
  '@deepseek-ai/dsh-client-ui-trajectory',
  '@deepseek-ai/dsh-client-ui-workspace',
  '@deepseek-ai/dsh-client-ui-input-trigger',
  '@deepseek-ai/dsh-client-ui-commands',
  '@deepseek-ai/dsh-client-ui-skill',
  '@deepseek-ai/dsh-client-ui-subagent',
  '@deepseek-ai/dsh-client-ui-model-selection',
  '@deepseek-ai/dsh-client-ui-permission-presets',
  '@deepseek-ai/dsh-client-ui-user-questions',
  '@deepseek-ai/dsh-desktop-host',
  '@deepseek-ai/dsh-desktop-directory-picker',
  '@deepseek-ai/dsh-desktop-settings',
]
