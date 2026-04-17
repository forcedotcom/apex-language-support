/**
 * Experience Cloud site.
 */
global class Community {

  /**
   * Specifies if guest users can access public groups without logging in.
   */
  global Boolean allowChatterAccessWithoutLogin;

  /**
   * Specifies if members can flag content.
   */
  global Boolean allowMembersToFlag;

  /**
   * Specifies whether the Service Not Available page is an auto-generated Experience Builder-based page ( true ) or a static resource page that’s set in Workspaces | Administration | Pages ( false ).
   */
  global Boolean builderBasedSnaEnabled;

  /**
   * Experience Builder URL for the site.
   */
  global String builderUrl;

  /**
   * ID of the managed content space associated with the enhanced site.
   */
  global String contentSpaceId;

  /**
   * Site description.
   */
  global String description;

  /**
   * Specifies whether guest members can see other members ( true ) or not ( false ).
   */
  global Boolean guestMemberVisibilityEnabled;

  /**
   * Site ID.
   */
  global String id;

  /**
   * Specifies whether images are optimized for guest users on all devices for sites using Salesforce's CDN for Digital Experiences ( true ) or not ( false ).
   */
  global Boolean imageOptimizationCDNEnabled;

  /**
   * Specifies whether users can invite other external users.
   */
  global Boolean invitationsEnabled;

  /**
   * Specifies whether knowledgeable people and endorsements are available for topics ( true ), or not ( false ).
   */
  global Boolean knowledgeableEnabled;

  /**
   * Login URL for the site.
   */
  global String loginUrl;

  /**
   * Specifies whether members can see other members ( true ) or not ( false ).
   */
  global Boolean memberVisibilityEnabled;

  /**
   * Site name.
   */
  global String name;

  /**
   * Specifies whether nicknames are displayed.
   */
  global Boolean nicknameDisplayEnabled;

  /**
   * Specifies whether members can send and receive private messages to and from other members ( true ) or not ( false ).
   */
  global Boolean privateMessagesEnabled;

  /**
   * Specifies whether reputation is calculated and displayed for members.
   */
  global Boolean reputationEnabled;

  /**
   * Specifies whether emails are sent to all new users when they join.
   */
  global Boolean sendWelcomeEmail;

  /**
   * Specifies whether the site is an Experience Builder site ( true ) or a Salesforce Tabs + Visualforce site ( false ).
   */
  global Boolean siteAsContainerEnabled;

  /**
   * URL for the site, which is your Experience Cloud sites domain plus a URL prefix. For example, MyDomainName .my.site.com/customers .
   */
  global String siteUrl;

  /**
   * Status of the Experience Cloud site. Live Inactive UnderConstruction
   */
  global ConnectApi.CommunityStatus Enum status;

  /**
   * Name of the Experience Builder template.
   */
  global String templateName;

  /**
   * Connect REST API URL to the site.
   */
  global String url;

  /**
   * Site-specific URL prefix. For example, in the site URL MyDomainName .my.site.com/customers , customers is the UrlPathPrefix .
   */
  global String urlPathPrefix;

}