/**
 * Specifies whether you’re integrating your app as a connected app or as an external client app in methods used in your customized Apex token exchange handler, which extends the Auth.Oauth2TokenExchangeHandler class.
 */
public enum IntegratingAppType {
  CA,
  ECA
}