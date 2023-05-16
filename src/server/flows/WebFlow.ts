import { IPluginMiddleware } from "@verdaccio/types"
import { Application, Handler, Request, Response } from "express"
import { OAuth2Strategy, IOAuth2StrategyOptionWithRequest } from "passport-google-oauth";
import passport from "passport"
import { getPublicUrl } from "@verdaccio/url"

import { logger } from "../../logger"
import { getAuthorizePath, getCallbackPath } from "../../redirect"
import { buildErrorPage } from "../../statusPage"
import { AuthCore } from "../plugin/AuthCore"
import { ParsedPluginConfig } from "../plugin/Config"
import { mapValues } from "lodash"
import { Verdaccio } from "../plugin/Verdaccio"

const COOKIE_OPTIONS = {
  sameSite: true,
  httpOnly: false, // Has to be visible to JS
  maxAge: 1000 * 10, // Expire quickly as these get saved to localStorage anyway
}

export class WebFlow implements IPluginMiddleware<any> {
  constructor(
    private readonly verdaccio: Verdaccio,
    private readonly config: ParsedPluginConfig,
    private readonly core: AuthCore,
  ) {}

  initialize(app: Application) {
    //app.use(passport.initialize());
    const conf = {
      clientID: this.config.clientId,
      clientSecret: this.config.clientSecret,
      callbackURL: this.config.redirectUri,
      passReqToCallback: true
    } as IOAuth2StrategyOptionWithRequest
    passport.use(new OAuth2Strategy(conf, (req: any, accessToken: any, refreshToken: any, profile: any, done:any) => {
      //console.log(accessToken);
      //console.log(profile);
      // GCP側で権限処理は済んでいるので、ここでは全て許可
      return done(null, profile._json)
    }))
  }

  /**
   * IPluginMiddleware
   */
  register_middlewares(app: Application) {
    this.initialize(app)
    app.get(getAuthorizePath(), this.authorize)
    app.get(getCallbackPath(), this.callback)
  }

  /**
   * Initiates the auth flow by redirecting to the provider's login URL.
   */
  authorize: Handler = async (req: Request, res: Response, next: any) => {
    try {
      passport.authenticate("google", {
        session: false,
        scope: ["email"]
      })(req, res, next)
    } catch (error) {
      logger.error(error)
      next(error)
    }
  }

  /**
   * After successful authentication, the auth provider redirects back to us.
   * We use the code in the query params to get an access token and the username
   * associated with the account.
   *
   * We issue a JWT using these values and pass them back to the frontend as
   * cookies accessible to JS so they can be stored in the browser.
   *
   * The username and token are encrypted and base64 encoded to form a token for
   * the npm CLI.
   *
   * There is no need to later decode and decrypt the token. This process is
   * automatically reversed by verdaccio before passing it to the plugin.
   */
  callback: Handler = async (req: Request, res: Response, next: any) => {
    const withBackLink = true

    try {
      await passport.authenticate("google", {
        session: false,
        failureRedirect: "/error",
        failWithError: true
      }, async (err, user, info) => {
        if (err) {
          // res.status(401).send(buildAccessDeniedPage(withBackLink)):
          return next(err)
        }
        if (!user) { res.redirect("/") }
        const userObj = await this.core.createAuthenticatedUser(user.email, [""])
        const uiToken = await this.verdaccio.issueUiToken(userObj)
        const npmToken = await this.verdaccio.issueNpmToken(userObj, info)

        res.cookie("username", userObj.name, COOKIE_OPTIONS)
        res.cookie("uiToken", uiToken, COOKIE_OPTIONS)
        res.cookie("npmToken", npmToken, COOKIE_OPTIONS)

        return res.redirect("/")
      })(req, res, next)
    } catch (error) {
      logger.error(error)

      res.status(500).send(buildErrorPage(error, withBackLink))
    }
  }

  private getRedirectUrl(req: Request): string {
    const urlPrefix = this.config.url_prefix
    // Stringify headers — Verdaccio requires `string`, we have `string |
    // string[] | undefined`.
    const headers = mapValues(req.headers, String)
    const verdaccioReq = { ...req, headers }
    const baseUrl = getPublicUrl(urlPrefix, verdaccioReq)
    const baseUrlWithoutTrailingSlash = baseUrl.replace(/\/$/, "")
    const path = getCallbackPath(req.params.id)
    const redirectUrl = baseUrlWithoutTrailingSlash + path

    return redirectUrl
  }
}
