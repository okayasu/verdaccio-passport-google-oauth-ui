import { execSync } from "child_process"
import minimist from "minimist"
import { URL } from "url"

import { logger } from "./logger"

function parseCliArgs() {
  return minimist(process.argv.slice(2))
}

function runCommand(command: string) {
  logger.log(`Running command: ${command}`)
  return execSync(command)
}

function getNpmConfig() {
  return JSON.parse(runCommand("npm config list --json").toString())
}

function removeTrailingSlash(input: string) {
  return input.trim().replace(/\/?$/, "")
}

function ensureTrailingSlash(input: string) {
  return input.endsWith("/") ? input : `${input}/`
}

export function getRegistryUrl() {
  const cliArgs = parseCliArgs()
  const npmConfig = getNpmConfig()

  const registry = cliArgs.registry || npmConfig.registry

  return removeTrailingSlash(registry)
}

export function getNpmConfigFile() {
  const npmConfig = getNpmConfig()

  return npmConfig.userconfig
}

export function getNpmSaveCommands(registry: string, token: string) {
  const url = new URL(registry)
  const pathname = ensureTrailingSlash(url.pathname)
  const baseUrl = url.host + pathname

  return [
    `npm config set //${baseUrl}:_authToken "${token}"`,
  ]
}

export function saveNpmToken(token: string) {
  const registry = getRegistryUrl()
  const commands = getNpmSaveCommands(registry, token)

  commands.forEach((command) => runCommand(command))
}
