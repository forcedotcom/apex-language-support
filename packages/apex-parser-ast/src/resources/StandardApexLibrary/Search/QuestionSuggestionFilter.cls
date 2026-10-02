/**
 * The Search.QuestionSuggestionFilter class filters results from a call to System.Search.suggest(searchQuery, sObjectType, options) when the SOSL searchQuery contains a FeedItem object.
 */
global class QuestionSuggestionFilter {
    Object QuestionSuggestionFilter() { return null; }

    /**
     * Adds a filter to display questions associated with the single specified group whose ID is passed in as an argument. This filter is optional.
     * <p>Usage
     * To add more than one group, call the method multiple times.
     */
    global void addGroupId(String groupId) { }

    /**
     * Adds a filter to display questions associated with the single specified network whose ID is passed in as an argument. This filter is optional.
     * <p>Usage
     * To add more than one network, call the method multiple times.
     */
    global void addNetworkId(String networkId) { }

    /**
     * Adds a filter to display questions belonging to the single specified user whose ID is passed in as an argument. This filter is optional.
     * <p>Usage
     * To add more than one user, call the method multiple times.
     */
    global void addUserId(String userId) { }

    global Boolean equals(Object obj) { return false; }

    global Integer hashCode() { return 0; }

    /**
     * Sets a new list of groups to replace the current list of groups where the group IDs are passed in as an argument. This filter is optional.
     */
    global void setGroupIds(List groupIds) { }

    /**
     * Sets a new list of networks to replace the current list of networks where the network IDs are passed in as an argument. This filter is optional.
     */
    global void setNetworkIds(List networkIds) { }

    /**
     * Sets a filter to display questions associated with the single specified topic whose ID is passed in as an argument. This filter is optional.
     */
    global void setTopicId(String topicId) { }

    /**
     * Sets a new list of users to replace the current list of users where the users IDs are passed in as an argument. This filter is optional.
     */
    global void setUserIds(List userIds) { }

    global String toString() { return null; }
}