import {
  AllowAccess,
  AuthAccessCallback,
  AuthCallback,
  AuthError,
  IPluginAuth,
  IPluginMiddleware,
  RemoteUser,
} from "@verdaccio/types"
import { Application, static as expressServeStatic} from "express"
import { WebFlow } from "../flows"
import { AuthCore } from "./AuthCore"
import { Config, PackageAccess, ParsedPluginConfig } from "./Config"
import { PatchHtml } from "./PatchHtml"
import { registerGlobalProxyAgent } from "./ProxyAgent"
import { publicRoot, staticPath } from "../constants"
import { Verdaccio } from "./Verdaccio"

/**
 * Implements the verdaccio plugin interfaces.
 */
export class Plugin implements IPluginMiddleware<any>, IPluginAuth<any> {
  private readonly parsedConfig = new ParsedPluginConfig(this.config)
  private readonly verdaccio = new Verdaccio(this.config)
  private readonly core = new AuthCore(this.verdaccio, this.parsedConfig)

  constructor(private readonly config: Config) {
    registerGlobalProxyAgent()
  }

  /**
   * IPluginMiddleware
   */
  register_middlewares(app: Application, auth: any) {
    this.verdaccio.setAuth(auth)

    // use static files.
    app.use(staticPath, expressServeStatic(publicRoot))

    const children = [
      new PatchHtml(),
      new WebFlow(this.verdaccio, this.parsedConfig, this.core),
    ]

    for (const child of children) {
      child.register_middlewares(app)
    }
  }

  private async userNameAndTokenMatch(
    userName: string,
    userToken: string,
  ): Promise<boolean> {
    return true
  }

  /**
   * IPluginAuth
   */
  async authenticate(
    userName: string,
    userToken: string,
    callback: AuthCallback,
  ): Promise<void> {
    callback(new Error("Signup/Login Not Implemented") as AuthError, false)
  }

  /**
   * IPluginAuth
   */
  allow_access(
    user: RemoteUser,
    config: AllowAccess & PackageAccess,
    callback: AuthAccessCallback,
  ): void {
    if (config.access) {
      const grant = config.access.some((group) => user.groups.includes(group))
      callback(null, grant)
    } else {
      callback(null, true)
    }
  }
}
