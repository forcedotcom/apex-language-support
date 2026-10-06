/**
 * Filter settings that narrow the results from a call to System.Search.suggest(searchQuery, sObjectType, options) when the SOSL search query contains a KnowledgeArticleVersion object.
 */
global class KnowledgeSuggestionFilter {
    global KnowledgeSuggestionFilter() { }

    /**
     * Adds a filter that narrows suggestion results to display the specified article type. This filter is optional.
     * Usage
     * To add more than 1 article type, call the method multiple times.
     */
    global void addArticleType(String articleType) { }

    /**
     * Adds a filter that narrows suggestion results to display articles in the specified data category. This filter is optional.
     * Usage
     * To set multiple data categories, call the method multiple times. The name of the data category group and name of the data category for desired articles, expressed as a mapping, for example, Search.KnowledgeSuggestionFilter.addDataCategory('Regions', 'Asia').
     */
    global void addDataCategory(String dataCategoryGroupName, String dataCategoryName) { }

    /**
     * Specifies the article topic to return. This filter is optional.
     * Usage
     * To add more than 1 article topic, call the method multiple times.
     */
    global void addTopic(String topic) { }

    global Boolean equals(Object obj) { return false; }

    global Integer hashCode() { return 0; }

    /**
     * Sets a channel to narrow the suggestion results to articles in the specified channel. This filter is optional.
     */
    global void setChannel(String channelName) { }

    global void setDataCategories(Map dataCategoryFilters) { }

    /**
     * Sets a language to narrow the suggestion results to display articles in that language. This filter value is required in calls to System.Search.suggest(String, String, Search.SuggestionOption).
     */
    global void setLanguage(String localeCode) { }

    /**
     * Sets a publish status to narrow the suggestion results to display articles with that status. This filter value is required in calls to System.Search.suggest(String, String, Search.SuggestionOption).
     */
    global void setPublishStatus(String publishStatus) { }

    /**
     * Sets a validation status to narrow the suggestion results to display articles with that status. This filter is optional.
     */
    global void setValidationStatus(String validationStatus) { }

    global String toString() { return null; }
}