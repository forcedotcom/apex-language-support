/**
 * The context in which the connected app is invoked, such as the protocol flow used and the token type issued, if any. Developers can use the context information to write code that is unique to the type of invocation.
 */
public enum InvocationContext {
  ASSET_TOKEN,
  OAUTH1,
  OAUTH2_JWT_BEARER_TOKEN,
  OAUTH2_SAML_ASSERTION,
  OAUTH2_SAML_BEARER_ASSERTION,
  OAUTH2_USERNAME_PASSWORD,
  OAUTH2_USER_AGENT_ID_TOKEN,
  OAUTH2_USER_AGENT_TOKEN,
  OAUTH2_WEB_SERVER,
  OPENIDCONNECT,
  REFRESH_TOKEN,
  SAML_ASSERTION,
  UNKNOWN,
  USERID_ENDPOINT
}