/**
 * The definition of an action link. Action link definition can be sensitive to a third party (for example, OAuth bearer token headers). For this reason, only calls made from the Apex namespace that created the action link definition can read, modify, or delete the definition. In addition, the user making the call must have created the definition or have View All Data permission.
 */
global class ActionLinkDefinition {

  /**
   * The action link URL. For example, a Ui action link URL is a Web page. A Download action link URL is a link to the file to download. Ui and Download action link URLs are provided to clients. An Api or ApiAsync action link URL is a REST resource. Api and ApiAsync action link URLs aren’t provided to clients. Links to Salesforce can be relative. All other links must be absolute and start with https:// .
   */
  global String actionUrl;

  /**
   * ISO 8601 format date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime createdDate;

  /**
   * ID of a single user to exclude from performing the action. If you specify an excludedUserId , you can’t specify a userId .
   */
  global String excludedUserId;

  /**
   * true if this action is the default action link in the action link group; false otherwise. There can be only one default action link per action link group. The default action link gets distinct styling in the Salesforce UI.
   */
  global Boolean groupDefault;

  /**
   * The request headers for the Api and ApiAsync action link types.
   */
  global List < ConnectApi.RequestHeader > headers;

  /**
   * The 18-character ID for the action link definition.
   */
  global String id;

  /**
   * A custom label to display on the action link button. A label value can be set only in an action link template. Action links have four statuses: NewStatus, PendingStatus, SuccessStatus, and FailedStatus. These strings are appended to the label for each status: label label Pending label Success label Failed For example, if the value of label is “See Example,” the values of the four action link states are: See Example, See Example Pending, See Example Success, and See Example Failed. An action link can use either label or labelKey to generate label names, it can’t use both. If label has a value, the value of labelKey is None . If labelKey has a value other than None , the value of label is null .
   */
  global String label;

  /**
   * Key for the set of labels to show in the user interface. A set includes labels for these states: NewStatus, PendingStatus, SuccessStatus, FailedStatus. For example, if you use the Approve key, you get these labels: Approve, Pending, Approved, Failed. For a complete list of label keys, see Action Links Labels in the Connect REST API Developer Guide .
   */
  global String labelKey;

  /**
   * The HTTP method. One of these values: HttpDelete —Returns HTTP 204 on success. Response body or output class is empty. HttpGet —Returns HTTP 200 on success. HttpHead —Returns HTTP 200 on success. Response body or output class is empty. HttpPatch —Returns HTTP 200 on success or HTTP 204 if the response body or output class is empty. HttpPost —Returns HTTP 201 on success or HTTP 204 if the response body or output class is empty. Exceptions are the batch posting resources and methods, which return HTTP 200 on success. HttpPut —Return HTTP 200 on success or HTTP 204 if the response body or output class is empty.
   */
  global ConnectApi.HttpRequestMethod method;

  /**
   * ISO 8601 format date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime modifiedDate;

  /**
   * The request body for Api and ApiAsync action link types. Note Escape quotation mark characters in the requestBody value.
   */
  global String requestBody;

  /**
   * true to require the user to confirm the action; false otherwise.
   */
  global Boolean requiresConfirmation;

  /**
   * The ID of the action link template from which to instantiate this action link. If the action link isn’t associated with a template, the value is null .
   */
  global String templateId;

  /**
   * Defines the type of action link. Values are: Api —The action link calls a synchronous API at the action URL. Salesforce sets the status to SuccessfulStatus or FailedStatus based on the HTTP status code returned by your server. ApiAsync —The action link calls an asynchronous API at the action URL. The action remains in a PendingStatus state until a third party makes a request to /connect/action-links/ actionLinkId to set the status to SuccessfulStatus or FailedStatus when the asynchronous operation is complete. Download —The action link downloads a file from the action URL. Ui —The action link takes the user to a web page at the action URL. Note Invoking ApiAsync action links from an app requires a call to set the status. However, there isn’t currently a way to set the status of an action link using Apex. To set the status, use Connect REST API. See the Action Link resource in the Connect REST API Developer Guide for more information.
   */
  global ConnectApi.ActionLinkType type;

  /**
   * The ID of the user who can execute the action. If not specified or null , any user can execute the action. If you specify a userId , you can’t specify an excludedUserId .
   */
  global String userId;

}