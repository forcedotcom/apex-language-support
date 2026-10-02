/**
 * Contains methods to set the appearance of apps in the App Launcher.
 */
global class AppMenu {
    global Object AppMenu() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Shows or hides specific apps in the App Launcher.
     */
    global static void setAppVisibility(Id appMenuItemId, Boolean isVisible) { }

    /**
     * Sets the organization-wide default sort order for the App Launcher based on a List of app menu item IDs in the desired order.
     */
    global static void setOrgSortOrder(List applicationIds) { }

    /**
     * Sets an individual user’s default sort order for the App Launcher based on a List of app menu item IDs in the desired order.
     */
    global static void setUserSortOrder(List applicationIds) { }

    global override virtual String toString() { return null; }
}