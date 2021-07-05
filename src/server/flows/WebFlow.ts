import { IPluginMiddleware } from "@verdaccio/types"
import { Application, Handler, Request, Response } from "express"
import passport from "passport";
import { OAuth2Strategy, IOAuth2StrategyOptionWithRequest } from "passport-google-oauth";

import { logger } from "../../logger"
import { getAuthorizePath, getCallbackPath } from "../../redirect"
import { buildErrorPage } from "../../statusPage"
import { AuthCore } from "../plugin/AuthCore"
import { Config, getConfig } from "../plugin/Config"

export class WebFlow {
  constructor(
    private readonly config: Config,
    private readonly core: AuthCore,
  ) {}

  initialize(app: Application) {
    //app.use(passport.initialize());
    const conf = {
      clientID: getConfig(this.config, "client-id"),
      clientSecret: getConfig(this.config, "client-secret"),
      callbackURL: "http://localhost:4873/-/oauth/callback",
      passReqToCallback: true
    } as IOAuth2StrategyOptionWithRequest;
    passport.use(new OAuth2Strategy(conf, (req: any, accessToken: any, refreshToken: any, profile: any, done:any) => {
      //console.log(accessToken);
      //console.log(profile);
      // GCP側で権限処理は済んでいるので、ここでは全て許可
      return done(null, profile._json);
    }))
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
      })(req, res, next);
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
   * query parameters so they can be stored in the browser.
   *
   * The username and token are encrypted and base64 encoded to form a token for
   * the npm CLI.
   *
   * There is no need to later decode and decrypt the token. This process is
   * automatically reversed by verdaccio before passing it to the plugin.
   */
  callback: Handler = async (req: Request, res: Response, next: any) => {
    const withBackButton = true

    try {
      await passport.authenticate("google", {
        session: false,
        failureRedirect: "/error",
        failWithError: true
      }, async (err, user, info) => {
        if (err) {
          // res.status(401).send(buildAccessDeniedPage(withBackButton)):
          return next(err);
        }
        if (!user) { res.redirect("/"); }
        console.log(user);
        console.log(info);
        const ui = await this.core.createUiCallbackUrl(user.email, "abcdefg", []);
        return res.redirect(ui);
      })(req, res, next);
    } catch (error) {
      logger.error(error)
      res.status(500).send(buildErrorPage(error, withBackButton))
    }
  }
}
