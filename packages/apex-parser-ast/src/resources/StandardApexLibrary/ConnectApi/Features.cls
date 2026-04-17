/**
 * Features available to the context user in the org.
 */
global class Features {

  /**
   * Reserved for future use.
   */
  global Boolean activityReminderNotificationsEnabled;

  /**
   * Specifies whether Chatter is enabled.
   */
  global Boolean chatter;

  /**
   * Specifies whether user details include information about Chatter activity.
   */
  global Boolean chatterActivity;

  /**
   * Specifies whether Chatter Answers is enabled. Note With the Spring ’18 release, Salesforce no longer supports Chatter Answers. Users of Chatter Answers can post, answer, comment, or view existing Chatter Answers data, but support and updates are scheduled to end. We recommend transitioning to Chatter Questions. For more information, see End of Support for Chatter Answers in Spring ’18 .
   */
  global Boolean chatterAnswers;

  /**
   * Specifies whether user details include global Chatter activity.
   */
  global Boolean chatterGlobalInfluence;

  /**
   * Specifies whether Chatter groups can have records associated with them.
   */
  global Boolean chatterGroupRecords;

  /**
   * Specifies whether Chatter records are implicitly shared among group members when records are added to groups.
   */
  global Boolean chatterGroupRecordSharing;

  /**
   * Specifies whether Chatter messages are enabled.
   */
  global Boolean chatterMessages;

  /**
   * Specifies whether topics are enabled.
   */
  global Boolean chatterTopics;

  /**
   * Specifies whether digital experiences is enabled.
   */
  global Boolean communitiesEnabled;

  /**
   * Specifies whether moderation is enabled.
   */
  global Boolean communityModeration;

  /**
   * Specifies whether reputation is enabled.
   */
  global Boolean communityReputation;

  /**
   * Specifies whether custom fiscal calendar is enabled.
   */
  global Boolean customFiscalCalendarEnabled;

  /**
   * Specifies whether the user can post dashboard component snapshots.
   */
  global Boolean dashboardComponentSnapshots;

  /**
   * ISO code of the default currency. Applicable only when multiCurrency is false .
   */
  global String defaultCurrencyIsoCode;

  /**
   * Specifies the Default locale.
   */
  global String defaultLocale;

  /**
   * Reserved for future use.
   */
  global Boolean einsteinVoiceEnabled;

  /**
   * Reserved for future use.
   */
  global Boolean einsteinVoiceInPilotEnabled;

  /**
   * Reserved for future use.
   */
  global Boolean einsteinVoiceLoggingEnabled;

  /**
   * Reserved for future use.
   */
  global Integer einsteinVoiceProviderId;

  /**
   * Specifies whether favorites in Lightning are enabled.
   */
  global Boolean favoritesEnabled;

  /**
   * Reserved for future use.
   */
  global Boolean feedPolling;

  /**
   * Specifies whether Chatter feed streams are enabled.
   */
  global Boolean feedStreamEnabled;

  /**
   * Specifies whether files can act as resources for Connect REST API.
   */
  global Boolean files;

  /**
   * Specifies whether files can be attached to comments.
   */
  global Boolean filesOnComments;

  /**
   * Specifies the number that corresponds to the month that starts the fiscal year for the org. For example, if the org's fiscal year starts in February, the value is 2.
   */
  global Integer fiscalYearStartMonth;

  /**
   * Specifies whether aggregated forecasting is enabled for mobile clients.
   */
  global Boolean forecasting3AggregatedEnabled;

  /**
   * Specifies whether forecasting is enabled.
   */
  global Boolean forecastingEnabled;

  /**
   * Range of the forecasting period.
   */
  global Integer forecastingPeriodRange;

  /**
   * Start index for the forecasting period.
   */
  global Integer forecastingPeriodStart;

  /**
   * Time period used for forecasting. Values are: Month Quarter Week Year
   */
  global ConnectApi.PeriodType forecastingPeriodType;

  /**
   * Reserved for future use.
   */
  global Boolean groupsCanFollow;

  /**
   * Specifies whether Ideas is enabled.
   */
  global Boolean ideas;

  /**
   * Live Agent host name configured for the org.
   */
  global String liveAgentHostName;

  /**
   * Specifies whether managed topics are enabled.
   */
  global Boolean managedTopicsEnabled;

  /**
   * Specifies the maximum number of feed-enabled entities that can be subscribed to in a Chatter stream.
   */
  global Integer maxEntitySubscriptionsPerStream;

  /**
   * Specifies the maximum number of files that can be added to a feed item.
   */
  global Integer maxFilesPerFeedItem;

  /**
   * Specifies the maximum number of Chatter streams that a user can have.
   */
  global Integer maxStreamsPerPerson;

  /**
   * Reserved for future use.
   */
  global Boolean mobileNotificationsEnabled;

  /**
   * Specifies whether the org uses multiple currencies ( true ) or not ( false ). When false , the defaultCurrencyIsoCode indicates the ISO code of the default currency.
   */
  global Boolean multiCurrency;

  /**
   * Specifies whether the offline object permissions are enabled for Salesforce for Android and Salesforce for iOS mobile clients.
   */
  global Boolean offlineEditEnabled;

  /**
   * Specifies whether actions in the publisher are enabled.
   */
  global Boolean publisherActions;

  /**
   * Specifies whether the Salesforce for Android and Salesforce for iOS can use secure, persistent storage on mobile devices to cache data.
   */
  global Boolean storeDataOnDevicesEnabled;

  /**
   * Reserved for future use.
   */
  global Boolean thanksAllowed;

  /**
   * Specifies whether trending topics are enabled.
   */
  global Boolean trendingTopics;

  /**
   * Specifies whether users can customize the navigation bar in Lightning.
   */
  global Boolean userNavItemsEnabled;

  /**
   * Specifies whether the calendar year when the fiscal year begins is referred to as the year of the company's fiscal year. For example, if the fiscal year begins in November 2025, but is referred to as fiscal year 2026, the value is false .
   */
  global Boolean usesStartDateAsFiscalYearName;

  /**
   * Specifies whether existing Chatter users can invite people in their company to use Chatter.
   */
  global Boolean viralInvitesAllowed;

  /**
   * Specifies whether CRM Analytics is enabled.
   */
  global Boolean wave;

}