/**
 * Contains methods for getting information about an Experience Cloud user.
 * Example
 * The following example directs a guest (unauthenticated) user to one page, and authenticated users of the Experience Cloud site’s parent organization to another page.
 * if (Auth.CommunitiesUtil.isGuestUser())
 *     // Redirect to the login page if user is an unauthenticated user
 *     return new PageReference(LOGIN_URL);
 *
 * if (Auth.CommunitiesUtil.isInternalUser())
 *     // Redirect to the home page if user is an internal user
 *     return new PageReference(HOME_URL);
 */
global class CommunitiesUtil {
    global CommunitiesUtil() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the page to display after the current Experience Cloud user logs out.
     */
    global static String getLogoutUrl() { return null; }

    /**
     * Returns the current user’s Experience Cloud display name.
     */
    global static String getUserDisplayName() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Indicates whether the current user isn’t logged in to the Experience Cloud site. Redirect the user to log in, if necessary.
     */
    global static Boolean isGuestUser() { return false; }

    /**
     * Indicates whether the current user is logged in as a member of the parent Salesforce organization, such as an employee.
     */
    global static Boolean isInternalUser() { return false; }

    global override virtual String toString() { return null; }
}