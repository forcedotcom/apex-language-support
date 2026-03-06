/**
 * A platform action instance with state information for the context user.
 */
global class PlatformAction {

  /**
   * For action links of subtype Ui or Download , direct the user to download or visit the UI from this link. Salesforce issues a Javascript redirect for the link in this format: /action-link-redirect/ communityId / actionLinkId ?_bearer= bearerToken . For Api action links and for all platform actions, this value is null and Salesforce handles the call.
   */
  global String actionUrl;

  /**
   * The API name. The value may be null .
   */
  global String apiName;

  /**
   * If this action requires a confirmation and has a status of NewStatus , this is a default localized message that should be shown to an end user prior to invoking the action. Otherwise, this is null .
   */
  global String confirmationMessage;

  /**
   * The user who initiated execution of this platform action.
   */
  global ConnectApi.UserSummary executingUser;

  /**
   * true if this platform action is the default or primary platform action in the platform action group; false otherwise. There can be only one default platform action per platform action group.
   */
  global Boolean groupDefault;

  /**
   * The URL of the icon for the platform action. This value may be null .
   */
  global String iconUrl;

  /**
   * The ID for the platform action. If the type is QuickAction and the subtype is Create , this value is null .
   */
  global String id;

  /**
   * The localized label for this platform action.
   */
  global String label;

  /**
   * ISO 8601 format date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime modifiedDate;

  /**
   * A reference to the platform action group containing this platform action.
   */
  global ConnectApi.Reference platformActionGroup;

  /**
   * The execution status of the platform action. Values are: FailedStatus —The action link execution failed. NewStatus —The action link is ready to be executed. Available for Download and Ui action links only. PendingStatus —The action link is executing. Choosing this value triggers the API call for Api and ApiAsync action links. SuccessfulStatus —The action link executed successfully.
   */
  global ConnectApi.PlatformActionStatus status;

  /**
   * The subtype of a platform action or null . If the type property is ActionLink , possible values are: Api —The action link calls a synchronous API at the action URL. Salesforce sets the status to SuccessfulStatus or FailedStatus based on the HTTP status code returned by your server. ApiAsync —The action link calls an asynchronous API at the action URL. The action remains in a PendingStatus state until a third party makes a request to /connect/action-links/ actionLinkId to set the status to SuccessfulStatus or FailedStatus when the asynchronous operation is complete. Download —The action link downloads a file from the action URL. Ui —The action link takes the user to a web page at the action URL. Note Invoking ApiAsync action links from an app requires a call to set the status. However, there isn’t currently a way to set the status of an action link using Apex. To set the status, use Connect REST API. See the Action Link resource in the Connect REST API Developer Guide for more information.
   */
  global String subtype;

  /**
   * The type of platform action. Values are: ActionLink —An indicator on a feed element that targets an API, a web page, or a file, represented by a button in the Salesforce UI. CustomButton —When clicked, opens a URL or a Visualforce page in a window or executes JavaScript. ProductivityAction —Productivity actions are predefined and attached to a limited set of objects. Productivity actions include Send Email, Call, Map, View Website, and Read News. Except for the Call action, you can’t edit productivity actions. QuickAction —A global or object-specific action. StandardButton —A predefined Salesforce button such as New, Edit, or Delete.
   */
  global ConnectApi.PlatformActionType type;

  /**
   * The URL for this platform action. If the type is QuickAction and the subtype is Create , this value is null .
   */
  global String url;

}