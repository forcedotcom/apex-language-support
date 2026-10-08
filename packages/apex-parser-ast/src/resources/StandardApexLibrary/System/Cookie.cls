/**
 * The Cookie class lets you access cookies for your Salesforce site using Apex.
 * Usage
 * Use the setCookies method of the PageReference Class to attach cookies to a page.
 * Important
 * Cookie names and values set in Apex are URL encoded, that is, characters such as @ are replaced with a percent sign and their hexadecimal representation.
 * The setCookies method adds the prefix “apex__” to the cookie names.
 * Setting a cookie's value to null sends a cookie with an empty string value instead of setting an expired attribute.
 * After you create a cookie, the properties of the cookie can't be changed.
 * Be careful when storing sensitive information in cookies. Pages are cached regardless of a cookie value. If you use a cookie value to generate dynamic content, you should disable page caching. For more information, see <a class="xref" href="https://help.salesforce.com/articleView?id=sf.sites_caching.htm&amp;language=en_US" target="_blank">Configure Site Caching</a> in Salesforce Help.
 * Consider the following limitations when using the Cookie class:
 * The Cookie class can only be accessed using Apex that is saved using the Salesforce API version 19 and above.
 * The maximum number of cookies that can be set per Salesforce Sites domain depends on your browser. Newer browsers have higher limits than older ones.
 * Cookies must be less than 4K, including name and attributes.
 * The maximum header size of a Visualforce page, including cookies, is 8,192 bytes.
 * Example
 * The following example creates a class, CookieController, which is used with a Visualforce page (see markup below) to update a counter each time a user displays a page. The number of times a user goes to the page is stored in a cookie.
 * // A Visualforce controller class that creates a cookie
 * // used to keep track of how often a user displays a page
 * public class CookieController {
 *
 *     public CookieController() {
 *         Cookie counter = ApexPages.currentPage().getCookies().get('counter');
 *
 *         // If this is the first time the user is accessing the page,
 *         // create a new cookie with name 'counter', an initial value of '1',
 *         // path 'null', maxAge '-1', and isSecure 'true'.
 *         if (counter == null) {
 *             counter = new Cookie('counter','1',null,-1,true);
 *         } else {
 *         // If this isn't the first time the user is accessing the page
 *         // create a new cookie, incrementing the value of the original count by 1
 *             Integer count = Integer.valueOf(counter.getValue());
 *             counter = new Cookie('counter', String.valueOf(count+1),null,-1,true);
 *         }
 *
 *         // Set the new cookie for the page
 *         ApexPages.currentPage().setCookies(new Cookie[]{counter});
 *     }
 *
 *     // This method is used by the Visualforce action {!count} to display the current
 *     // value of the number of times a user had displayed a page.
 *     // This value is stored in the cookie.
 *     public String getCount() {
 *         Cookie counter = ApexPages.currentPage().getCookies().get('counter');
 *         if(counter == null) {
 *             return '0';
 *         }
 *         return counter.getValue();
 *     }
 * }
 * // Test class for the Visualforce controller
 * @isTest
 * private class CookieControllerTest {
 *   // Test method for verifying the positive test case
 *   static testMethod void testCounter() {
 *     //first page view
 *     CookieController controller = new CookieController();
 *     System.assert(controller.getCount() == '1');
 *
 *     //second page view
 *     controller = new CookieController();
 *     System.assert(controller.getCount() == '2');
 *   }
 * }
 * The following is the Visualforce page that uses the CookieController Apex controller above. The action {!count} calls the getCount method in the controller above.
 * <apex:page controller="CookieController">
 * You have seen this page {!count} times
 * </apex:page>
 */
global class Cookie {
    /**
     * Creates a new instance of the Cookie class using the specified name, value, path, age, and the secure setting.
     */
    global Cookie(String name, String value, String path, Integer maxAge, Boolean isSecure) { }

    /**
     * Creates a new instance of the Cookie class using the specified name, value, path, and age, and settings for security and cross-domain behavior.
     * Note
     * Google Chrome 80 introduces a new default cookie attribute setting of SameSite, which is set to Lax. Previously, the SameSite cookie attribute defaulted to the value of None. When SameSite is set to None, cookies must be tagged with the isSecure attribute indicating that they require an encrypted HTTPS connection.
     */
    global Cookie(String name, String value, String path, Integer maxAge, Boolean isSecure, String sameSite) { }

    /**
     * Creates a new instance of the Cookie class using the specified name, value, path, age, and settings for security, cross-domain behavior, and JavaScript access.
     */
    global Cookie(String name, String value, String path, Integer maxAge, Boolean isSecure, String sameSite, Boolean isHttpOnly) { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the name of the server making the request.
     */
    global String getDomain() { return null; }

    /**
     * Returns a number representing how long the cookie is valid for, in seconds. If set to < 0, a session cookie is issued. If set to 0, the cookie is deleted.
     */
    global Integer getMaxAge() { return 0; }

    /**
     * Returns the name of the cookie. Can't be null.
     */
    global String getName() { return null; }

    /**
     * Returns the path from which you can retrieve the cookie. If null or blank, the location is set to root, or “/”.
     */
    global String getPath() { return null; }

    /**
     * Returns the value for the SameSite attribute of the cookie.
     */
    global String getSameSite() { return null; }

    /**
     * Returns the data captured in the cookie, such as Session ID.
     */
    global String getValue() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if client-side JavaScript is forbidden from accessing the cookie; otherwise returns false.
     */
    global Boolean isHttpOnly() { return false; }

    /**
     * Returns true if the cookie can only be accessed through HTTPS, otherwise returns false.
     */
    global Boolean isSecure() { return false; }

    global String toString() { return null; }
}