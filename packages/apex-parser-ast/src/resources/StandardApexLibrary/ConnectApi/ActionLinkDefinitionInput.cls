/**
 * The definition of an action link. An action link is a button on a feed element. Clicking an action link can take a user to a Web page, initiate a file download, or invoke an API call to Salesforce or to an external server. An action link includes a URL and an HTTP method, and can include a request body and header information, such as an OAuth token for authentication. Use action links to integrate Salesforce and third-party services into the feed so that users can drive productivity and accelerate innovation.
 */
global class ActionLinkDefinitionInput {

  /**
   * Defines the type of action link. Values are: Api —The action link calls a synchronous API at the action URL. Salesforce sets the status to SuccessfulStatus or FailedStatus based on the HTTP status code returned by your server. ApiAsync —The action link calls an asynchronous API at the action URL. The action remains in a PendingStatus state until a third party makes a request to /connect/action-links/ actionLinkId to set the status to SuccessfulStatus or FailedStatus when the asynchronous operation is complete. Download —The action link downloads a file from the action URL. Ui —The action link takes the user to a web page at the action URL. Use Ui if you need to load a page before the user performs an action, for example, to have the user provide input or view something before the action happens. Note Invoking ApiAsync action links from an app requires a call to set the status. However, there isn’t currently a way to set the status of an action link using Apex. To set the status, use Connect REST API. See the Action Link resource in the Connect REST API Developer Guide for more information.
   */
  global ConnectApi.ActionLinkType actionType;

  /**
   * The action link URL. For example, a Ui action link URL is a Web page. A Download action link URL is a link to the file to download. Ui and Download action link URLs are provided to clients. An Api or ApiAsync action link URL is a REST resource. Api and ApiAsync action link URLs aren’t provided to clients. Links to Salesforce can be relative. All other links must be absolute and start with https:// . Tip To avoid issues due to upgrades or changing functionality in your API, we recommend using a versioned API for actionUrl , for example, https://www.example.com/api/v1/exampleResource . If your API isn’t versioned, you can use the expirationDate property of the ConnectApi.ActionLinkGroupDefinitionInput class to avoid issues due to upgrades or changing functionality in your API.
   */
  global String actionUrl;

  /**
   * ID of a single user to exclude from performing the action. If you specify an excludedUserId , you can’t specify a userId .
   */
  global String excludedUserId;

  /**
   * true if this action is the default action link in the action link group; false otherwise. There can be only one default action link per action link group. The default action link gets distinct styling in the Salesforce UI.
   */
  global Boolean groupDefault;

  /**
   * The request headers for the Api and ApiAsync action link types. See Action Links Overview, Authentication, and Security .
   */
  global List < ConnectApi.RequestHeaderInput > headers;

  /**
   * Key for the set of labels to show in the user interface. A set includes labels for these states: NewStatus, PendingStatus, SuccessStatus, FailedStatus. For example, if you use the Approve key, you get these labels: Approve, Pending, Approved, Failed. For a complete list of keys and labels, see Action Links Labels . If none of the predefined labels work for your action link, use a custom label. To use a custom label, create an action link template. See Create Action Link Templates .
   */
  global String labelKey;

  /**
   * One of these HTTP methods: HttpDelete —Returns HTTP 204 on success. Response body or output class is empty. HttpGet —Returns HTTP 200 on success. HttpHead —Returns HTTP 200 on success. Response body or output class is empty. HttpPatch —Returns HTTP 200 on success or HTTP 204 if the response body or output class is empty. HttpPost —Returns HTTP 201 on success or HTTP 204 if the response body or output class is empty. Exceptions are the batch posting resources and methods, which return HTTP 200 on success. HttpPut —Return HTTP 200 on success or HTTP 204 if the response body or output class is empty.
   */
  global ConnectApi.HttpRequestMethod method;

  /**
   * The request body for Api action links. Note Escape quotation mark characters in the requestBody value.
   */
  global String requestBody;

  /**
   * true to require the user to confirm the action; false otherwise.
   */
  global Boolean requiresConfirmation;

  /**
   * The ID of the user who can execute the action. If not specified or null , any user can execute the action. If you specify a userId , you can’t specify an excludedUserId .
   */
  global String userId;

}