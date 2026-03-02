/**
 * Filter settings that narrow the results from a call to System.Search.suggest(searchQuery, sObjectType, options) when the SOSL search query contains a KnowledgeArticleVersion object.
 */
public class KnowledgeSuggestionFilter {

  /**
   * Adds a filter that narrows suggestion results to display the specified article type. This filter is optional.
   * @param articleType A three-character ID prefix indicating the desired article type.
   */
  public void addArticleType(String articleType) {}

  /**
   * Adds a filter that narrows suggestion results to display articles in the specified data category. This filter is optional.
   * @param dataCategoryGroupName The name of the data category group
   * @param dataCategoryName The name of the data category.
   */
  public void addDataCategory(String dataCategoryGroupName, String dataCategoryName) {}

  /**
   * Specifies the article topic to return. This filter is optional.
   * @param topic 
   */
  public void addTopic(String topic) {}

  /**
   * Sets a channel to narrow the suggestion results to articles in the specified channel. This filter is optional.
   * @param channelName The name of a channel. Valid values are: AllChannels –Visible in all channels the user has access to App –Visible in the internal Salesforce Knowledge application Pkb –Visible in the public knowledge base Csp –Visible in the Customer Portal Prm –Visible in the Partner Portal If channel isn’t specified, the default value is determined by the type of user. Pkb for a guest user Csp for a Customer Portal user Prm for a Partner Portal user App for any other type of user If channel is specified, the specified value may not be the actual value requested, because of certain requirements. For guest, Customer Portal, and Partner Portal users, the specified value must match the default value for each user type. If the values don’t match or AllChannels is specified, then App replaces the specified value. For all users other than guest, Customer Portal, and Partner Portal users: If Pkb , Csp , Prm , or App are specified, then the specified value is used. If AllChannels is specified, then App replaces the specified value.
   */
  public void setChannel(String channelName) {}

  /**
   * Adds filters that narrow suggestion results to display articles in the specified data categories. Use this method to set multiple data category group and name pairs in one call. This filter is optional.
   * @param dataCategoryFilters A map of data category group and data category name pairs.
   */
  public void setDataCategories(Map dataCategoryFilters) {}

  /**
   * Sets a language to narrow the suggestion results to display articles in that language. This filter value is required in calls to System.Search.suggest( String , String , Search.SuggestionOption) .
   * @param localeCode A locale code. For example, 'en_US' (English–United States), or 'es' (Spanish).
   */
  public void setLanguage(String localeCode) {}

  /**
   * Sets a publish status to narrow the suggestion results to display articles with that status. This filter value is required in calls to System.Search.suggest( String , String , Search.SuggestionOption) .
   * @param publishStatus A publish status. Valid values are:
   */
  public void setPublishStatus(String publishStatus) {}

  /**
   * Sets a validation status to narrow the suggestion results to display articles with that status. This filter is optional.
   * @param validationStatus An article validation status. These values are available in the ValidationStatus field on the KnowledgeArticleVersion object.
   */
  public void setValidationStatus(String validationStatus) {}

}