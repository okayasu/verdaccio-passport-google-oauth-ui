import { getNpmConfigFile, getNpmSaveCommands, getRegistryUrl } from "src/npm"

export const testRegistryBaseUrl = "http://localhost:4873"
export const testNpmToken = "test-npm-token"

describe("npm", () => {
  const argv = process.argv

  it("successfully finds the npm configuration", () => {
    expect(getRegistryUrl()).toBeTruthy()
    expect(getNpmConfigFile()).toBeTruthy()
  })

  it("uses the correct registry", () => {
    process.argv = argv
    const first = getRegistryUrl()
    process.argv = [...argv, "--registry", testRegistryBaseUrl]
    const second = getRegistryUrl()

    expect(first).toBeTruthy()
    expect(second).toBe(testRegistryBaseUrl)
    expect(first).not.toBe(second)
  })

  it("removes trailing slashes", () => {
    process.argv = [...argv, "--registry", "https://my.registry.com/"]
    expect(getRegistryUrl()).toBe("https://my.registry.com")
  })

  it("save commands match the snapshot", () => {
    expect(getNpmSaveCommands(testRegistryBaseUrl, testNpmToken))
      .toMatchInlineSnapshot(`
      Array [
        "npm config set //localhost:4873/:always-auth true",
        "npm config set //localhost:4873/:_authToken \\"test-npm-token\\"",
      ]
    `)

    expect(getNpmSaveCommands(testRegistryBaseUrl + "/", testNpmToken))
      .toMatchInlineSnapshot(`
      Array [
        "npm config set //localhost:4873/:always-auth true",
        "npm config set //localhost:4873/:_authToken \\"test-npm-token\\"",
      ]
    `)
  })
})
