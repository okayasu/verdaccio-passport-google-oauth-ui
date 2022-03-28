import {
  AllowAccess,
  AuthAccessCallback,
  AuthCallback,
  AuthError,
  IBasicAuth,
  IPluginAuth,
  IPluginMiddleware,
  RemoteUser,
} from "@verdaccio/types"
import { Application, static as expressServeStatic} from "express"

import { WebFlow } from "../flows"
import { Verdaccio } from "../verdaccio"
import { AuthCore } from "./AuthCore"
import { Config, PackageAccess, validateConfig } from "./Config"
import { PatchHtml } from "./PatchHtml"
import { registerGlobalProxyAgent } from "./ProxyAgent"
import { publicRoot, staticPath } from "../../constants"

/**
 * Implements the verdaccio plugin interfaces.
 */
export class Plugin implements IPluginMiddleware<any>, IPluginAuth<any> {
  private readonly verdaccio = new Verdaccio(this.config)
  private readonly core = new AuthCore(this.verdaccio, this.config)

  constructor(private readonly config: Config) {
    validateConfig(config)
    registerGlobalProxyAgent()
  }

  /**
   * IPluginMiddleware
   */
  register_middlewares(app: Application, auth: IBasicAuth<any>) {
    this.verdaccio.setAuth(auth)

    // use static files.
    app.use(staticPath, expressServeStatic(publicRoot))

    // overwrite default html response.
    app.use(new PatchHtml(this.verdaccio).patchResponse)

    // add route method.
    new WebFlow(this.config, this.core).initialize(app)
  }

  /**
   * IPluginAuth
   */
  async authenticate(
    username: string,
    token: string,
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

  /**
   * IPluginAuth
   */
  allow_publish(
    user: RemoteUser,
    config: AllowAccess & PackageAccess,
    callback: AuthAccessCallback,
  ): void {
    if (config.publish) {
      const grant = config.publish.some((group) => user.groups.includes(group))
      callback(null, grant)
    } else {
      this.allow_access(user, config, callback)
    }
  }

  /**
   * IPluginAuth
   */
  allow_unpublish(
    user: RemoteUser,
    config: AllowAccess & PackageAccess,
    callback: AuthAccessCallback,
  ): void {
    if (config.unpublish) {
      const grant = config.unpublish.some((group) =>
        user.groups.includes(group),
      )
      callback(null, grant)
    } else {
      this.allow_publish(user, config, callback)
    }
  }
}
