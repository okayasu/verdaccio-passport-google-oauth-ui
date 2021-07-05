import { RemoteUser } from "@verdaccio/types"
import { stringify } from "querystring"

import { logger } from "../../logger"
import { Verdaccio } from "../verdaccio"

export class AuthCore {
  constructor(
    private readonly verdaccio: Verdaccio,
  ) {}

  createAuthenticatedUser(
    username: string,
    groups: string[],
  ): RemoteUser {
    // See https://verdaccio.org/docs/en/packages
    const user: RemoteUser = {
      name: username,
      groups: ["$all", "@all", "$authenticated", "@authenticated"],
      real_groups: [username, ...groups],
    }
    logger.log("Created authenticated user", user)
    return user
  }

  async createUiCallbackUrl(
    username: string,
    token: string,
    groups: string[],
  ): Promise<string> {
    const user = this.createAuthenticatedUser(username, groups)

    const uiToken = await this.verdaccio.issueUiToken(user)
    const npmToken = await this.verdaccio.issueNpmToken(token, user)

    const query = { username, uiToken, npmToken }
    const url = "/?" + stringify(query)

    return url
  }

}
