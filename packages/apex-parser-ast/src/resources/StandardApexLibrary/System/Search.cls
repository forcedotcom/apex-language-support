/**
 * Use the methods of the Search class to perform dynamic SOSL queries.
 */
global class Search {
    /**
     * Performs a dynamic SOSL query that can include the SOSL WITH SNIPPET clause. Snippets provide more context for users in Salesforce Knowledge article search results.
     * <p>Usage
     * Use this method wherever a static SOSL query can be used, such as in regular assignment statements and for loops.
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic_sosl.htm#snippet_title" target="_blank">Use Dynamic SOSL to Return Snippets</a>.
     */
    global static Search.SearchResults find(String searchQuery) { return null; }

    /**
     * Performs a dynamic SOSL query that can include the SOSL WITH SNIPPET clause. Snippets provide more context for users in Salesforce Knowledge article search results.
     * <p>Usage
     * Use this method wherever a static SOSL query can be used, such as in regular assignment statements and for loops.
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic_sosl.htm#snippet_title" target="_blank">Use Dynamic SOSL to Return Snippets</a>.
     */
    global static Search.SearchResults find(String searchQuery, System.AccessLevel accessLevel) { return null; }

    global static List query(String searchQuery) { return null; }

    global static List query(String searchQuery, System.AccessLevel accessLevel) { return null; }

    /**
     * Returns a list of records or Salesforce Knowledge articles whose names or titles match the user’s search query string. Use this method to provide users with shortcuts to navigate to relevant records or articles before they perform a search.
     * <p>Usage
     * Use this method to return:
     * Suggestions for Salesforce Knowledge articles (KnowledgeArticleVersion): Salesforce Knowledge must be enabled in your organization. The user must have the “View Articles” permission enabled. The articles suggested include only the articles the user can access, based on the data categories and article types the user has permissions to view.
     * Suggestions for other record types: The records suggested include only the records the user can access. This method returns a record if its name field starts with the text in the search string. This method automatically appends an asterisk wildcard (*) at the end of the search string. Records that contain the search string within a word aren’t considered a match. Records are suggested if the entire search string is found in the record name, in the same order as specified in the search string. For example, the text string national u is treated as national u* and returns “National Utility” and “National Urban Company” but not “National Company Utility” or “Urban National Company”.
     * Note
     * If the user’s search query contains quotation marks or wildcards, those symbols are automatically removed from the query string in the URI.
     */
    global static Search.SuggestionResults suggest(String searchQuery, String sObjectType, Search.SuggestionOption options) { return null; }

    /**
     * Returns a list of records or Salesforce Knowledge articles whose names or titles match the user’s search query string. Use this method to provide users with shortcuts to navigate to relevant records or articles before they perform a search.
     * <p>Usage
     * Use this method to return:
     * Suggestions for Salesforce Knowledge articles (KnowledgeArticleVersion): Salesforce Knowledge must be enabled in your organization. The user must have the “View Articles” permission enabled. The articles suggested include only the articles the user can access, based on the data categories and article types the user has permissions to view.
     * Suggestions for other record types: The records suggested include only the records the user can access. This method returns a record if its name field starts with the text in the search string. This method automatically appends an asterisk wildcard (*) at the end of the search string. Records that contain the search string within a word aren’t considered a match. Records are suggested if the entire search string is found in the record name, in the same order as specified in the search string. For example, the text string national u is treated as national u* and returns “National Utility” and “National Urban Company” but not “National Company Utility” or “Urban National Company”.
     * Note
     * If the user’s search query contains quotation marks or wildcards, those symbols are automatically removed from the query string in the URI.
     */
    global static Search.SuggestionResults suggest(String searchQuery, String sObjectType, Search.SuggestionOption options, System.AccessLevel accessLevel) { return null; }
}