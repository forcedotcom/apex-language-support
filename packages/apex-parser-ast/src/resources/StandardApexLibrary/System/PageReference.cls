/**
 * A PageReference is a reference to an instantiation of a page. Among other attributes, PageReferences consist of a URL and a set of query parameter names and values.
 * <p>Use a PageReference object:
 * To view or set query string parameters and values for a page
 * To send the user to a different page as the result of an action method
 * <p>Instantiation
 * In a custom controller or controller extension, you can refer to or instantiate a PageReference in one of these ways.
 * Page.existingPageName
 * Refers to a PageReference for a Visualforce page that has already been saved in your organization. By referring to a page in this way, the platform recognizes that this controller or controller extension is dependent on the existence of the specified page and will prevent the page from being deleted while the controller or extension exists.
 * PageReference pageRef = new PageReference('partialURL');
 * Creates a PageReference to any page that is hosted on the Lightning platform. For example, setting 'partialURL' to '/apex/HelloWorld' refers to the Visualforce page located at http://mySalesforceInstance/apex/HelloWorld. Likewise, setting 'partialURL' to '/' + 'recordID' refers to the detail page for the specified record.
 * This syntax is less preferable for referencing other Visualforce pages than Page.existingPageName because the PageReference is constructed at runtime, rather than referenced at compile time. Runtime references are not available to the referential integrity system. Consequently, the platform doesn't recognize that this controller or controller extension is dependent on the existence of the specified page and won't issue an error message to prevent user deletion of the page.
 * PageReference pageRef = new PageReference('fullURL');
 * Creates a PageReference for an external URL. For example:
 * PageReference pageRef = new PageReference('http://www.google.com');
 * You can also instantiate a PageReference object for the current page with the currentPage ApexPages method. For example:
 * PageReference pageRef = ApexPages.currentPage();
 * <p>Request Headers
 * Here’s a non-exhaustive list of headers that are set on requests.
 * Header Description
 * Host The host name requested in the request URL. This header is always set on Lightning Platform Site requests and My Domain requests. This header is optional on other requests when HTTP/1.0 is used instead of HTTP/1.1.
 * Referer The URL that is either included or linked to the current request's URL. This header is optional.
 * User-Agent The name, version, and extension support of the program that initiated this request, such as a web browser. This header is optional and can be overridden in most browsers to be a different value. Therefore, this header can’t be relied upon.
 * CipherSuite If this header exists and has a non-blank value, this means that the request is using HTTPS. Otherwise, the request is using HTTP. The contents of a non-blank value are not defined by this API, and can be changed without notice.
 * X-Salesforce-SIP The source IP address of the request. This header is always set on HTTP and HTTPS requests that are initiated outside of Salesforce's data centers. If a request passes through a content delivery network (CDN) or proxy server, the source IP address might be altered, and no longer the original client IP address.
 * X-Salesforce-Forwarded-To The fully qualified domain name of the Salesforce instance that is handling this request. This header is always set on HTTP and HTTPS requests that are initiated outside of Salesforce's data centers.
 * <p>Example: Retrieving Query String Parameters
 * This example shows how to use a PageReference object to retrieve a query string parameter in the current page URL. In this example, the getAccount method references the id query string parameter.
 * public with sharing class MyController {
 *    public Account getAccount() {
 *         return [SELECT Id, Name FROM Account
 *                 WHERE Id = :ApexPages.currentPage().getParameters().get('Id')
 *                 WITH USER_MODE];
 *     }
 * }
 * This page markup calls the getAccount method from that controller.
 * <apex:page controller="MyController">
 *     <apex:pageBlock title="Retrieving Query String Parameters">
 *         You are viewing the {!account.name} account.
 *     </apex:pageBlock>
 * </apex:page>
 * Note
 * For this example to render properly, you must associate the Visualforce page with a valid account record in the URL. For example, if 001D000000IRt53 is the account ID, the resulting URL should be:
 * https://Visualforce_Url/apex/MyFirstPage?id=001D000000IRt53
 * Replace Visualforce_URL with the Visualforce URL for your org. For production, this URL is in the format MyDomainName--PackageName.vf.force.com, and if your installed package is unmanaged, the package name is c. For more information on the format of the URLs that Salesforce serves for your org, see <a class="xref" href="https://help.salesforce.com/s/articleView?id=products.domain_name_url_formats.htm&amp;type=5&amp;language=en_US" target="_blank">My Domain Login and Application URL Formats</a> and <a class="xref" href="https://help.salesforce.com/s/articleView?id=products.domain_name_partitioned_domains.htm&amp;type=5&amp;language=en_US" target="_blank">Partitioned Domains</a> in Salesforce Help.
 * The getAccount method uses an embedded SOQL query to return the account specified by the id parameter in the URL of the page. To access id, the getAccount method uses the ApexPages namespace.
 * First the currentPage method returns the PageReference instance for the current page. PageReference returns a reference to a Visualforce page, including its query string parameters.
 * Using the page reference, use the getParameters method to return a map of the specified query string parameter names and values.
 * Then a call to the get method specifying id returns the value of the id parameter itself.
 * <p>Example: Navigating to a New Page as the Result of an Action Method
 * Any action method in a custom controller or controller extension can return a PageReference object as the result of the method. If the redirect attribute on the PageReference is set to true, the user navigates to the URL specified by the PageReference.
 * This example shows how this can be implemented with a save method. In this example, the PageReference returned by the save method redirects the user to the detail page for the account record that was just saved.
 * public with sharing class MySecondController {
 *     Account account;
 *
 *     public Account getAccount() {
 *         if(account == null) account = new Account();
 *         return account;
 *     }
 *
 *     public PageReference save() {
 *         // Add the account to the database.
 *         insert as user account;
 *         // Send the user to the detail page for the new account.
 *         PageReference acctPage = new ApexPages.StandardController(account).view();
 *         acctPage.setRedirect(true);
 *         return acctPage;
 *     }
 * }
 * This page markup calls the save method from that controller. When a user clicks Save, he or she is redirected to the detail page for the account just created:
 * <apex:page controller="mySecondController" tabStyle="Account">
 *     <apex:sectionHeader title="New Account Edit Page" />
 *     <apex:form>
 *         <apex:pageBlock title="Create a New Account">
 *             <apex:pageBlockButtons location="bottom">
 *                 <apex:commandButton action="{!save}" value="Save"/>
 *             </apex:pageBlockButtons>
 *             <apex:pageBlockSection title="Account Information">
 *                 <apex:inputField id="accountName" value="{!account.name}"/>
 *                 <apex:inputField id="accountSite" value="{!account.site}"/>
 *             </apex:pageBlockSection>
 *        </apex:pageBlock>
 *     </apex:form>
 * </apex:page>
 * <p>Example: Redirect Users to a Replacement Experience Cloud Site
 * This example shows how to redirect a user attempting to access a retired feedback site to a self-service help site. If the redirect attribute is set to true on the PageReference for the feedback site, the user navigates to the URL specified by the PageReference. The redirectCode attribute defines the redirection type for search engine optimization in public Experience Cloud sites.
 * public with sharing class RedirectController {
 *     // Redirect users to the self-service help site
 *     public PageReference redirect() {
 *         final PageReference target = new
 *         PageReference(Site.getBaseSecureUrl() + '/SiteLogin');
 *         target.setRedirect(true);
 *         // This is a permanent redirection
 *         target.setRedirectCode(301);
 *         return target;
 *     }
 * }
 * This example shows how to call the RedirectController class from the retired site page.
 * <apex:page controller="RedirectController" action="{!redirect}"/>
 * Note
 * To redirect a page that’s served by a third-party CDN, configure that CDN to pass the origin IP address via the true-client-ip HTTP header on the page. For more information, see <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.domain_mgmt_enable_https.htm&amp;language=en_US" target="_blank"> Prerequisites for a Custom Domain That Uses a Third-Party Service or CDN</a> in Salesforce Help.
 */
global class PageReference {
    /**
     * Generate a new instance of the PageReference class for the specified sObject record.
     */
    Object PageReference(SObject sobject) { return null; }

    /**
     * Creates a new instance of the PageReference class using the specified URL.
     */
    Object PageReference(String url) { return null; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the name of the anchor referenced in the page’s URL. That is, the part of the URL after the hashtag (#).
     * @return Note
     * Instances of PageReference returned by ApexPages.currentPage() have a null anchor attribute, because URL fragments are not sent to the Salesforce server during a request.
     */
    global String getAnchor() { return null; }

    /**
     * Returns the output of the page, as displayed to a user in a web browser.
     * <p>Usage
     * The content of the returned Blob depends on how the page is rendered. If the page is rendered as a PDF file, it returns the PDF document. If the page isn’t rendered as PDF, it returns HTML. To access the content of the returned HTML as a string, use the toString Blob method. If the Visualforce page has an error, an ExecutionException is thrown.
     * You can’t use the getContent method in:
     * Triggers
     * Test methods. If you use getContent in a test method, the test method fails. getContent is treated as a callout in API version 34.0 and later.
     * Apex email services
     * You also can’t use the method to retrieve the output of a different Visualforce page with the same controller and controller extensions. Instead, pass the base URL of the destination page.
     * new PageReference(Site.getBaseUrl() + '/apex/VisualforcePageName').getContent();
     */
    global Blob getContent() { return null; }

    /**
     * Returns the page in PDF, regardless of the <apex:page> component’s renderAs attribute.
     * <p>Usage
     * This method can’t be used in:
     * Triggers
     * Test methods. If you use getContentAsPDF in a test method, the test method fails. getContentAsPDF is treated as a callout in API version 34.0 and later.
     * Apex email services
     * You also can’t use the method to retrieve the output of a different Visualforce page with the same controller and controller extensions. Instead, pass the base URL of the destination page.
     * new PageReference(Site.getBaseUrl() + '/apex/VisualforcePageName').getContentAsPDF();
     */
    global Blob getContentAsPDF() { return null; }

    /**
     * Returns a map of cookie names and cookie objects, where the key is a String of the cookie name and the the value contains the cookie object with that name.
     * <p>Usage
     * Used in conjunction with the Cookie class. Only returns cookies with the “apex__” prefix set by the setCookies method.
     */
    global Map getCookies() { return null; }

    /**
     * Returns a map of the request headers, where the key string contains the name of the header, and the value string contains the value of the header.
     * <p>Usage
     * This map can be modified and remains in scope for the PageReference object. For instance, you could do:
     * PageReference.getHeaders().put('Date', '9/9/99');
     * For a description of request headers, see Request Headers.
     */
    global Map getHeaders() { return null; }

    /**
     * Returns a map of the query string parameters for the PageReference; both POST and GET parameters are included. The key string contains the name of the parameter, while the value string contains the value of the parameter.
     * <p>Usage
     * This map can be modified and remains in scope for the PageReference object. For instance, you could do:
     * PageReference.getParameters().put('id', myID);
     * Parameter keys are case-insensitive. For example:
     * System.assert(
     *     ApexPages.currentPage().getParameters().get('myParamName') ==
     *     ApexPages.currentPage().getParameters().get('myparamname'));
     */
    global Map getParameters() { return null; }

    /**
     * Returns the current value of the PageReference object's redirect attribute.
     * <p>Usage
     * Note that if the URL of the PageReference object is set to a website outside of the salesforce.com domain, the redirect always occurs, regardless of whether the redirect attribute is set to true or false.
     */
    global Boolean getRedirect() { return false; }

    /**
     * Returns the HTTP redirect code used when getRedirect() is set to true for the PageReference object.
     * @return Possible Values:
     * 0 — Redirect using the default redirect action for this PageReference. Typically a JavaScript-based redirection or HTTP 302.
     * Note
     * <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_site_urlRewriter.htm" target="_blank" title="HTML (New Window)">Site URLRewriter Interface</a> implementations pointing to a PageReference with a redirectCode of 0 are not redirected.
     * 301 — Moved Permanently. Redirect users by sending an HTTP GET request to the target location. Includes instructions to update any references to the requested URL with the target location.
     * 302 — Moved Temporarily. Redirect users by sending an HTTP GET request to the target location. Because the redirection is temporary, it doesn’t include update instructions.
     * 303 — See Other. Redirect users by sending an HTTP GET request to the target location. Not commonly used. Useful when the client sends a POST request and you want the client to call the new web page using a GET request instead of a POST request.
     * 307 — Temporary Redirect. Send the same HTTP request, regardless of the HTTP method, to the target location. Because the redirection is temporary, it doesn’t include update instructions.
     * 308 — Permanent Redirect. Send the same HTTP request, regardless of the HTTP method, to the target location. Includes instructions to update any references to the requested URL with the target location.
     */
    global Integer getRedirectCode() { return 0; }

    /**
     * Returns the relative URL associated with the PageReference when it was originally defined, including any query string parameters and anchors.
     */
    global String getUrl() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Sets the URL’s anchor reference to the specified string.
     */
    global System.PageReference setAnchor(String anchor) { return null; }

    global void setCookies(List cookies) { }

    /**
     * Sets the value of the PageReference object's redirect attribute. If set to true, a redirect is performed through a client side redirect.
     * <p>Usage
     * This type of redirect performs an HTTP GET request, and flushes the view state, which uses POST. If set to false, the redirect is a server-side forward that preserves the view state if and only if the target page uses the same controller and contains the proper subset of extensions used by the source page.
     * Note that if the URL of the PageReference object is set to a website outside of the salesforce.com domain, or to a page with a different controller or controller extension, the redirect always occurs, regardless of whether the redirect attribute is set to true or false.
     */
    global System.PageReference setRedirect(Boolean redirect) { return null; }

    /**
     * Sets the HTTP redirect code to use for the PageReference object when setRedirect(redirect) is set to true.
     */
    global System.PageReference setRedirectCode(Integer redirectCode) { return null; }

    global String toString() { return null; }
}