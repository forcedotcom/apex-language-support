/**
 * Enables rewriting Sites URLs.
 * Usage
 * Sites provides built-in logic that helps you display user-friendly URLs and links to site visitors. Create rules to rewrite URL requests typed into the address bar, launched from bookmarks, or linked from external websites. You can also create rules to rewrite the URLs for links within site pages. URL rewriting not only makes URLs more descriptive and intuitive for users, it allows search engines to better index your site pages.
 * For example, let's say that you have a blog site. Without URL rewriting, a blog entry's URL might look like this: https://myblog.my.salesforce-sites.com/posts?id=003D000000Q0PcN
 * To rewrite URLs for a site, create an Apex class that maps the original URLs to user-friendly URLs, and then add the Apex class to your site.
 */
global interface UrlRewriter {
    virtual Boolean equals(Object arg0);

    /**
     * Maps a list of Salesforce URLs to a list of user-friendly URLs.
     * Usage
     * You can use List<PageReference> instead of PageReference[], if you prefer.
     * Important
     * The size and order of the input list of Salesforce URLs must exactly correspond to the size and order of the generated list of user-friendly URLs. The generateUrlFor method maps input URLs to output URLs based on the order in the lists.
     */
    abstract List generateUrlFor(List generatedUrls);

    virtual Integer hashCode();

    /**
     * Maps a user-friendly URL to a Salesforce URL.
     */
    abstract System.PageReference mapRequestUrl(System.PageReference requestUrl);

    virtual String toString();
}