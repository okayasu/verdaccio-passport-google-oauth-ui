import { RemoteUser } from "@verdaccio/types"
import uniq from "lodash/uniq"
import { stringify } from "querystring"
import { authenticatedUserGroups } from "../../constants"
import { logger } from "../../logger"
import { Verdaccio } from "../verdaccio"
import { Config, getConfig } from "./Config"

export class AuthCore {
  private readonly configuredGroups = this.getConfiguredGroups()

  constructor(
    private readonly verdaccio: Verdaccio,
    private readonly config: Config,
  ) {}

  /**
   * Returns all permission groups used in the Verdacio config.
   */
  getConfiguredGroups() {
    const configuredGroups: Record<string, true> = {}
    Object.values(this.config.packages || {}).forEach((packageConfig) => {
      ;["access", "publish", "unpublish"]
        .flatMap((key) => packageConfig[key])
        .filter(Boolean)
        .forEach((group: string) => {
          configuredGroups[group] = true
        })
    })
    return configuredGroups
  }

  async createAuthenticatedUser(
    username: string,
    groups: string[],
  ): Promise<RemoteUser> {
    const relevantGroups = groups.filter(
      (group) => group in this.configuredGroups,
    )

    relevantGroups.push(username)

    const user: RemoteUser = {
      name: username,
      groups: [...authenticatedUserGroups],
      real_groups: uniq(relevantGroups.filter(Boolean).sort()),
    }
    logger.log("Created authenticated user", user)

    return user
  }

  async createUiCallbackUrl(
    username: string,
    token: string,
    groups: string[],
  ): Promise<string> {
    const user = await this.createAuthenticatedUser(username, groups)

    const uiToken = await this.verdaccio.issueUiToken(user)
    const npmToken = await this.verdaccio.issueNpmToken(token, user)

    const query = { username, uiToken, npmToken }
    const url = "/?" + stringify(query)

    return url
  }

  authenticate(username: string, groups: string[]): boolean {
    if (!groups.length) {
      logger.error(`Access denied: User "${username}" does not have any groups`)
      return false
    }

    return true
  }
}
