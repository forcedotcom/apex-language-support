/**
 * Specifies whether you’re integrating your app as a connected app or as an external client app in methods used in your customized Apex token exchange handler, which extends the Auth.Oauth2TokenExchangeHandler class.
 * <p>Usage
 * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/token_exchange_handler.htm" target="_blank">Token Exchange Handler Validation and Subject Mapping</a>.
 * <p>Enum Values
 * The following are the values of the Auth.IntegratingAppType enum.
 */
global enum IntegratingAppType {
    CA,
    ECA

}